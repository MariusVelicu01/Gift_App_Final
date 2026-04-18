import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import {
  createPartnerStore,
  getPartnerStoreProductUsage,
  importPartnerStoreProducts,
} from '../../../services/partnerStoresApi';
import {
  getAdminPartnerStoresCache,
  setAdminPartnerStoresCacheSnapshot,
  subscribeAdminPartnerStoresCache,
} from '../../../services/adminPartnerStoresCache';
import {
  PartnerProductsImportPayload,
  PartnerStore,
  ProductImportItem,
  ProductPriceHistorySummary,
  PartnerProductUsageStats,
} from '../../../types/partnerStores';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';

const PRICE_CHART_WIDTH = 720;
const PRICE_CHART_HEIGHT = 310;
const PRICE_CHART_LEFT = 58;
const PRICE_CHART_TOP = 74;
const PRICE_CHART_PLOT_WIDTH = 600;
const PRICE_CHART_PLOT_HEIGHT = 168;

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: i + 1,
}));

const MONTHS = [
  { label: 'Ianuarie', value: 1 },
  { label: 'Februarie', value: 2 },
  { label: 'Martie', value: 3 },
  { label: 'Aprilie', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Iunie', value: 6 },
  { label: 'Iulie', value: 7 },
  { label: 'August', value: 8 },
  { label: 'Septembrie', value: 9 },
  { label: 'Octombrie', value: 10 },
  { label: 'Noiembrie', value: 11 },
  { label: 'Decembrie', value: 12 },
];

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
  const year = new Date().getFullYear() + i;
  return { label: String(year), value: year };
});

function openProductLink(affiliateUrl?: string, productUrl?: string) {
  const targetUrl = affiliateUrl || productUrl;

  if (!targetUrl) return;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('OPEN PRODUCT LINK ERROR:', error);
  });
}

function formatMoney(value?: number, currency = 'RON') {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${Number(value.toFixed(2))} ${currency}`;
}

function formatImportDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getDate()).padStart(2, '0')}.${String(
    date.getMonth() + 1
  ).padStart(2, '0')}.${date.getFullYear()}`;
}

function formatDateKey(value: string) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);

  if (!match) return value;

  return `${match[3]}.${match[2]}.${match[1]}`;
}

function getChartLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { day: value.slice(0, 5), year: '' };
  }

  return {
    day: `${String(date.getDate()).padStart(2, '0')}.${String(
      date.getMonth() + 1
    ).padStart(2, '0')}`,
    year: String(date.getFullYear()),
  };
}

function findPriceHistory(
  store: PartnerStore,
  product: ProductImportItem
): ProductPriceHistorySummary | null {
  const histories = store.productPriceHistory || [];

  return (
    histories.find((item) => item.productKey === product.priceHistoryKey) ||
    histories.find((item) => item.name === product.name && item.brand === product.brand) ||
    null
  );
}

function validateCui(input: string) {
  const normalized = input.toUpperCase().replace(/^RO/, '').replace(/\s/g, '');
  return /^\d{2,10}$/.test(normalized);
}

function validateTradeRegisterNumber(input: string) {
  const normalized = input.trim();
  return /^[JFC]\d{2}\/\d{1,8}\/\d{4}$/i.test(normalized) || /^\d{3,20}$/.test(normalized);
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function buildIsoDate(
  year: number | null,
  month: number | null,
  day: number | null
) {
  if (!year || !month || !day) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isDateKeyInPast(value: string) {
  if (!isValidDateKey(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
}

function normalizeProduct(item: any, index: number) {
  const rawPrice = item.price ?? item.pret;
  const price =
    typeof rawPrice === 'object'
      ? {
          ...(rawPrice.current !== undefined ? { current: Number(rawPrice.current) } : {}),
          ...(rawPrice.original !== undefined ? { original: Number(rawPrice.original) } : {}),
          ...(rawPrice.discount !== undefined ? { discount: Number(rawPrice.discount) } : {}),
          ...(rawPrice.discountPercent !== undefined
            ? { discountPercent: Number(rawPrice.discountPercent) }
            : {}),
          ...(rawPrice.hasDiscount !== undefined
            ? { hasDiscount: Boolean(rawPrice.hasDiscount) }
            : {}),
        }
      : rawPrice !== undefined
      ? { current: Number(rawPrice) }
      : undefined;
  const availability = item.availability;
  const promo = item.promo;

  return {
    ...(item.id ? { id: String(item.id) } : {}),
    ...(item.externalId ? { externalId: String(item.externalId) } : {}),
    name: String(item.name || item.title || item.denumire || `Produs ${index + 1}`),
    ...(item.brand ? { brand: String(item.brand) } : {}),
    ...(item.category || item.categorie
      ? { category: String(item.category || item.categorie) }
      : {}),
    ...(item.subcategory || item.subcategorie
      ? { subcategory: String(item.subcategory || item.subcategorie) }
      : {}),
    ...(item.sku || item.cod ? { sku: String(item.sku || item.cod) } : {}),
    ...(item.productUrl ? { productUrl: String(item.productUrl) } : {}),
    ...(item.affiliateUrl ? { affiliateUrl: String(item.affiliateUrl) } : {}),
    ...(item.imageUrl ? { imageUrl: String(item.imageUrl) } : {}),
    ...(price?.current !== undefined && Number.isFinite(price.current) ? { price } : {}),
    ...(promo
      ? {
          promo: {
            ...(promo.hasPromoCode !== undefined
              ? { hasPromoCode: Boolean(promo.hasPromoCode) }
              : {}),
            ...(promo.code ? { code: String(promo.code) } : {}),
            ...(promo.discount !== undefined
              ? { discount: Number(promo.discount) }
              : {}),
            ...(promo.discountAmount !== undefined
              ? { discountAmount: Number(promo.discountAmount) }
              : {}),
            ...(promo.discountPercent !== undefined
              ? { discountPercent: Number(promo.discountPercent) }
              : {}),
            ...(promo.note ? { note: String(promo.note) } : {}),
          },
        }
      : {}),
    ...(availability
      ? {
          availability: {
            ...(availability.inStock !== undefined
              ? { inStock: Boolean(availability.inStock) }
              : {}),
            ...(availability.stockStatus
              ? { stockStatus: String(availability.stockStatus) }
              : {}),
          },
        }
      : {}),
  };
}

function parseJsonProducts(content: string): PartnerProductsImportPayload {
  const parsed = JSON.parse(content);
  const source = Array.isArray(parsed) ? parsed : parsed.products;

  if (!Array.isArray(source)) {
    throw new Error('JSON-ul trebuie sa contina un array de produse sau cheia products.');
  }

  return {
    products: source.map(normalizeProduct),
    ...(parsed.source ? { source: String(parsed.source) } : {}),
    ...(parsed.currency ? { currency: String(parsed.currency) } : {}),
    ...(parsed.lastUpdated ? { lastUpdated: String(parsed.lastUpdated) } : {}),
    ...(parsed.merchant ? { merchant: parsed.merchant } : {}),
  };
}

function readXmlTag(source: string, tag: string) {
  const match = source.match(new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'is'));
  return match?.[1]?.replace(/<[^>]+>/g, '').trim();
}

function parseXmlProducts(content: string): PartnerProductsImportPayload {
  const productMatches = content.match(
    /<product[\s\S]*?<\/product>|<produs[\s\S]*?<\/produs>/gi
  );

  if (!productMatches?.length) {
    throw new Error('XML-ul trebuie sa contina noduri product sau produs.');
  }

  return {
    products: productMatches.map((item, index) => {
    const name =
      readXmlTag(item, 'name') ||
      readXmlTag(item, 'title') ||
      readXmlTag(item, 'denumire') ||
      `Produs ${index + 1}`;
    const priceValue = readXmlTag(item, 'price') || readXmlTag(item, 'pret');

    return {
      name,
      ...(priceValue ? { price: { current: Number(priceValue) } } : {}),
      category: readXmlTag(item, 'category') || readXmlTag(item, 'categorie'),
      sku: readXmlTag(item, 'sku') || readXmlTag(item, 'cod'),
    };
  }),
  };
}

function parseProductsFile(fileName: string, content: string) {
  const isXml =
    fileName.toLowerCase().endsWith('.xml') || content.trim().startsWith('<');
  const payload = isXml ? parseXmlProducts(content) : parseJsonProducts(content);

  return {
    ...payload,
    products: payload.products.filter((product) => product.name.trim().length > 0),
  };
}

type Props = {
  initialSelectedStoreId?: string | null;
};

export default function PartnerStoresScreen({ initialSelectedStoreId }: Props) {
  const { token } = useAuth();
  const [stores, setStores] = useState<PartnerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (initialSelectedStoreId) {
      setSelectedStoreId(initialSelectedStoreId);
    }
  }, [initialSelectedStoreId]);
  const [cui, setCui] = useState('');
  const [tradeRegisterNumber, setTradeRegisterNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [contractStartDay, setContractStartDay] = useState<number | null>(null);
  const [contractStartMonth, setContractStartMonth] = useState<number | null>(null);
  const [contractStartYear, setContractStartYear] = useState<number | null>(null);
  const [contractEndDay, setContractEndDay] = useState<number | null>(null);
  const [contractEndMonth, setContractEndMonth] = useState<number | null>(null);
  const [contractEndYear, setContractEndYear] = useState<number | null>(null);
  const [brandImageUri, setBrandImageUri] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceProduct, setSelectedPriceProduct] =
    useState<ProductImportItem | null>(null);
  const [productUsageStats, setProductUsageStats] =
    useState<PartnerProductUsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');
  const [usagePurposeFilter, setUsagePurposeFilter] = useState('all');
  const [usageYearFilter, setUsageYearFilter] = useState('all');

  const selectedStore = useMemo(() => {
    return stores.find((store) => store.id === selectedStoreId) || null;
  }, [selectedStoreId, stores]);

  const selectedPriceHistory = useMemo(() => {
    if (!selectedStore || !selectedPriceProduct) return null;
    return findPriceHistory(selectedStore, selectedPriceProduct);
  }, [selectedPriceProduct, selectedStore]);

  const priceChartData = useMemo(() => {
    const history = selectedPriceHistory?.history || [];
    const values = history.map((entry) => entry.currentPrice);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const range = Math.max(1, max - min);
    const points = history.map((entry, index) => {
      const x =
        history.length <= 1
          ? PRICE_CHART_LEFT + PRICE_CHART_PLOT_WIDTH / 2
          : PRICE_CHART_LEFT +
            (index / (history.length - 1)) * PRICE_CHART_PLOT_WIDTH;
      const normalized = (entry.currentPrice - min) / range;
      const y =
        PRICE_CHART_TOP + PRICE_CHART_PLOT_HEIGHT - normalized * PRICE_CHART_PLOT_HEIGHT;

      return {
        ...entry,
        x,
        y,
        label: getChartLabel(entry.importedAt),
      };
    });

    const segments = points.slice(1).map((point, index) => {
      const previous = points[index];
      const deltaX = point.x - previous.x;
      const deltaY = point.y - previous.y;
      const width = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

      return {
        key: `${point.importedAt}-${index}`,
        left: previous.x,
        top: previous.y,
        width,
        angle,
      };
    });

    return { min, max, points, segments };
  }, [selectedPriceHistory]);

  useEffect(() => {
    if (!token || !selectedStore || !selectedPriceProduct) {
      setProductUsageStats(null);
      return;
    }

    let cancelled = false;

    const loadProductUsage = async () => {
      try {
        setUsageLoading(true);
        setUsageError('');
        setUsagePurposeFilter('all');
        setUsageYearFilter('all');
        const data = await getPartnerStoreProductUsage(
          token,
          selectedStore.id,
          selectedPriceProduct
        );

        if (!cancelled) {
          setProductUsageStats(data);
        }
      } catch (error: any) {
        if (!cancelled) {
          setProductUsageStats(null);
          setUsageError(error?.message || 'Nu am putut incarca statisticile produsului.');
        }
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
        }
      }
    };

    loadProductUsage();

    return () => {
      cancelled = true;
    };
  }, [selectedPriceProduct, selectedStore, token]);

  const usagePurposeOptions = useMemo(() => {
    return [
      { label: 'Toate scopurile', value: 'all' },
      ...(productUsageStats?.purposes || []).map((purpose) => ({
        label: purpose,
        value: purpose,
      })),
    ];
  }, [productUsageStats]);

  const usageYearOptions = useMemo(() => {
    return [
      { label: 'Toti anii', value: 'all' },
      ...(productUsageStats?.years || []).map((year) => ({
        label: String(year),
        value: String(year),
      })),
    ];
  }, [productUsageStats]);

  const filteredUsageOccurrences = useMemo(() => {
    const occurrences = productUsageStats?.occurrences || [];

    return occurrences.filter((occurrence) => {
      const matchesPurpose =
        usagePurposeFilter === 'all' || occurrence.purpose === usagePurposeFilter;
      const matchesYear =
        usageYearFilter === 'all' || String(occurrence.year) === usageYearFilter;

      return matchesPurpose && matchesYear;
    });
  }, [productUsageStats, usagePurposeFilter, usageYearFilter]);

  const filteredPurchasedFromThisStoreCount = filteredUsageOccurrences.filter(
    (occurrence) => occurrence.purchasedFromThisStore
  ).length;

  const filteredAddedWithoutPurchaseFromThisStoreCount =
    filteredUsageOccurrences.filter(
      (occurrence) => !occurrence.purchasedFromThisStore
    ).length;

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();

    stores.forEach((store) => {
      store.products.forEach((product) => {
        const category = String(product.category || '').trim();

        if (category) {
          categories.add(category);
        }
      });
    });

    return [
      { label: 'Toate categoriile', value: 'all' },
      ...Array.from(categories)
        .sort((a, b) => a.localeCompare(b))
        .map((category) => ({
          label: category,
          value: category,
        })),
    ];
  }, [stores]);

  const filteredStores = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return stores.filter((store) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        store.products.some(
          (product) =>
            String(product.category || '').trim().toLowerCase() ===
            selectedCategory.toLowerCase()
        );

      if (!matchesCategory) return false;

      if (!normalizedSearch) return true;

      const searchableText = [store.displayName, store.cui]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [searchText, selectedCategory, stores]);

  const loadStores = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const data = await getAdminPartnerStoresCache(token);
      setStores(data);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut prelua magazinele.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
    if (!token) return;
    return subscribeAdminPartnerStoresCache(loadStores);
  }, [token]);

  const resetForm = () => {
    setCompanyName('');
    setCui('');
    setTradeRegisterNumber('');
    setDisplayName('');
    setContractStartDay(null);
    setContractStartMonth(null);
    setContractStartYear(null);
    setContractEndDay(null);
    setContractEndMonth(null);
    setContractEndYear(null);
    setBrandImageUri(undefined);
    setError('');
  };

  const pickBrandImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setBrandImageUri(result.assets[0].uri);
    }
  };

  const saveStore = async () => {
    if (!companyName.trim()) {
      setError('Numele firmei este obligatoriu.');
      return;
    }

    if (!validateCui(cui)) {
      setError('CUI invalid. Foloseste RO optional si 2-10 cifre.');
      return;
    }

    if (!validateTradeRegisterNumber(tradeRegisterNumber)) {
      setError('Numarul de registru trebuie sa fie J40/1234/2024 sau doar cifre.');
      return;
    }

    if (!displayName.trim()) {
      setError('Numele de afisat este obligatoriu.');
      return;
    }

    const contractStartDate = buildIsoDate(
      contractStartYear,
      contractStartMonth,
      contractStartDay
    );
    const contractEndDate = buildIsoDate(
      contractEndYear,
      contractEndMonth,
      contractEndDay
    );

    if (!contractStartDate || !contractEndDate) {
      setError('Perioada contractuala trebuie completata complet.');
      return;
    }

    if (!isValidDateKey(contractStartDate) || !isValidDateKey(contractEndDate)) {
      setError('Perioada contractuala trebuie completata in format valid.');
      return;
    }

    if (contractEndDate < contractStartDate) {
      setError('Data de final nu poate fi inaintea datei de inceput.');
      return;
    }

    if (isDateKeyInPast(contractEndDate)) {
      setError('Data de final nu poate fi in trecut.');
      return;
    }

    if (!token) return;

    try {
      const savedStore = await createPartnerStore(token, {
        companyName: companyName.trim(),
        cui: cui.trim().toUpperCase(),
        tradeRegisterNumber: tradeRegisterNumber.trim().toUpperCase(),
        displayName: displayName.trim(),
        contractStartDate,
        contractEndDate,
        brandImageUri,
      });

      setStores((current) => {
        const nextStores = [savedStore, ...current];
        setAdminPartnerStoresCacheSnapshot(token, nextStores);
        return nextStores;
      });
      resetForm();
      setModalVisible(false);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut salva magazinul.');
    }
  };

  const importProductsFromWebFile = () => {
    if (!selectedStore || Platform.OS !== 'web') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.xml,application/json,text/xml,application/xml';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = async () => {
        try {
          setImporting(true);
          const importPayload = parseProductsFile(file.name, String(reader.result || ''));
          if (!token) return;
          const updatedStore = await importPartnerStoreProducts(
            token,
            selectedStore.id,
            importPayload,
            file.name
          );

          setStores((current) => {
            const nextStores = current.map((store) =>
              store.id === selectedStore.id ? updatedStore : store
            );
            setAdminPartnerStoresCacheSnapshot(token, nextStores);
            return nextStores;
          });
          setImportError('');
        } catch (err: any) {
          setImportError(err?.message || 'Fisierul nu a putut fi interpretat.');
        } finally {
          setImporting(false);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  if (selectedStore) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            setSelectedPriceProduct(null);
            setSelectedStoreId(null);
          }}
        >
          <Text style={styles.secondaryButtonText}>Inapoi la magazine</Text>
        </Pressable>

        <View style={styles.card}>
          {selectedStore.brandImageUri ? (
            <Image source={{ uri: selectedStore.brandImageUri }} style={styles.brandImageLarge} />
          ) : (
            <View style={styles.brandPlaceholderLarge}>
              <Text style={styles.brandPlaceholderText}>
                {selectedStore.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.title}>{selectedStore.displayName}</Text>
          <Text style={styles.meta}>Firma: {selectedStore.companyName}</Text>
          <Text style={styles.meta}>CUI: {selectedStore.cui}</Text>
          <Text style={styles.meta}>
            Registrul comertului: {selectedStore.tradeRegisterNumber}
          </Text>
          <Text style={styles.meta}>
            Contract: {formatDateKey(selectedStore.contractStartDate)} - {formatDateKey(selectedStore.contractEndDate)}
          </Text>
          {!!selectedStore.merchant?.domain && (
            <Text style={styles.meta}>Domeniu: {selectedStore.merchant.domain}</Text>
          )}
          {!!selectedStore.merchant?.affiliateNetwork && (
            <Text style={styles.meta}>
              Retea afiliere: {selectedStore.merchant.affiliateNetwork}
            </Text>
          )}
          {!!selectedStore.currency && (
            <Text style={styles.meta}>Moneda catalog: {selectedStore.currency}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Catalog produse</Text>
          <Text style={styles.cardText}>
            Incarca un fisier JSON sau XML cu produse pentru acest magazin.
          </Text>

          <Pressable
            style={[styles.primaryButton, importing && styles.disabledButton]}
            onPress={importProductsFromWebFile}
            disabled={importing || Platform.OS !== 'web'}
          >
            <Text style={styles.primaryButtonText}>
              {importing ? 'Se importa...' : 'Incarca JSON sau XML'}
            </Text>
          </Pressable>

          {Platform.OS !== 'web' && (
            <Text style={styles.helperText}>
              Importul de fisier este disponibil momentan pe web.
            </Text>
          )}

          {!!importError && <Text style={styles.errorText}>{importError}</Text>}

          {!!selectedStore.lastImportName && (
            <Text style={styles.helperText}>
              Ultimul import: {selectedStore.lastImportName}
            </Text>
          )}

          <Text style={styles.productsSummary}>
            Produse interpretate: {selectedStore.products.length}
          </Text>

          {selectedStore.products.slice(0, 8).map((product, index) => (
            <Pressable
              key={`${product.id || product.sku || product.name}-${index}`}
              style={styles.productRow}
              onPress={() => setSelectedPriceProduct(product)}
            >
              {!!product.imageUrl && (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                {!!product.brand && (
                  <Text style={styles.productMeta}>Brand: {product.brand}</Text>
                )}
                {!!product.category && (
                  <Text style={styles.productMeta}>
                    {product.category}
                    {product.subcategory ? ` / ${product.subcategory}` : ''}
                  </Text>
                )}
                {!!product.sku && <Text style={styles.productMeta}>SKU: {product.sku}</Text>}
                {!!product.externalId && (
                  <Text style={styles.productMeta}>External ID: {product.externalId}</Text>
                )}
                {!!product.availability?.stockStatus && (
                  <Text style={styles.productMeta}>
                    Stoc: {product.availability.stockStatus}
                  </Text>
                )}
                {!!product.productUrl && (
                  <Text style={styles.productMeta}>Product URL: {product.productUrl}</Text>
                )}
                {!!product.affiliateUrl && (
                  <Text style={styles.productLinkText}>Link afiliat activ</Text>
                )}
                <Text style={styles.productHistoryText}>Vezi evolutia pretului</Text>
              </View>
              <View style={styles.priceBlock}>
                {product.price?.current !== undefined && Number.isFinite(product.price.current) && (
                  <Text style={styles.productPrice}>
                    {product.price.current} {selectedStore.currency || 'RON'}
                  </Text>
                )}
                {product.price?.hasDiscount && product.price.original !== undefined && (
                  <Text style={styles.originalPrice}>
                    {product.price.original} {selectedStore.currency || 'RON'}
                  </Text>
                )}
                {product.price?.discountPercent !== undefined && product.price.discountPercent > 0 && (
                  <Text style={styles.discountText}>
                    -{product.price.discountPercent}%
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <Modal
          visible={!!selectedPriceProduct}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedPriceProduct(null)}
        >
          <View
            style={styles.overlay}
            {...getModalBackdropResponder(() => setSelectedPriceProduct(null))}
          >
            <View style={styles.modalCard}>
              <View style={styles.handle} />

              <ScrollView contentContainerStyle={styles.modalBody}>
                <Text style={styles.modalTitle}>
                  {selectedPriceProduct?.name || 'Istoric pret'}
                </Text>
                {!!selectedPriceProduct?.brand && (
                  <Text style={styles.meta}>Brand: {selectedPriceProduct.brand}</Text>
                )}

                {selectedPriceHistory ? (
                  <>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Pret actual</Text>
                        <Text style={styles.statValue}>
                          {formatMoney(
                            selectedPriceHistory.latestPrice,
                            selectedStore.currency || 'RON'
                          )}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Pret original</Text>
                        <Text style={styles.statValue}>
                          {formatMoney(
                            selectedPriceHistory.latestOriginalPrice,
                            selectedStore.currency || 'RON'
                          )}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Cel mai mic pret</Text>
                        <Text style={styles.statValueSuccess}>
                          {formatMoney(
                            selectedPriceHistory.lowestPriceEver,
                            selectedStore.currency || 'RON'
                          )}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Cel mai mare pret</Text>
                        <Text style={styles.statValue}>
                          {formatMoney(
                            selectedPriceHistory.highestPriceEver,
                            selectedStore.currency || 'RON'
                          )}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Reduceri aplicate</Text>
                        <Text style={styles.statValue}>
                          {selectedPriceHistory.discountApplications}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Cea mai mare reducere</Text>
                        <Text style={styles.statValueDanger}>
                          {formatMoney(
                            selectedPriceHistory.biggestDiscountAmount,
                            selectedStore.currency || 'RON'
                          )}
                          {' / '}
                          {Number(selectedPriceHistory.biggestDiscountPercent.toFixed(2))}%
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Pret mediu</Text>
                        <Text style={styles.statValue}>
                          {formatMoney(
                            selectedPriceHistory.averagePrice,
                            selectedStore.currency || 'RON'
                          )}
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Ultima schimbare</Text>
                        <Text style={styles.statValue}>
                          {selectedPriceHistory.lastPriceChangeDirection === 'new'
                            ? 'Produs nou'
                            : selectedPriceHistory.lastPriceChangeDirection === 'same'
                            ? 'Fara schimbare'
                            : `${selectedPriceHistory.lastPriceChangeDirection === 'down' ? '-' : '+'}${formatMoney(
                                Math.abs(selectedPriceHistory.lastPriceChangeAmount),
                                selectedStore.currency || 'RON'
                              )}`}
                        </Text>
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.priceChartScroll}
                    >
                      <View
                        style={[
                          styles.priceLineChart,
                          { width: PRICE_CHART_WIDTH, height: PRICE_CHART_HEIGHT },
                        ]}
                      >
                        <View style={styles.priceChartTitleBlock}>
                          <Text style={styles.priceLineChartTitle}>
                            Evolutie pret
                          </Text>
                          <Text style={styles.priceLineChartSubtitle}>
                            IN {selectedStore.currency || 'RON'}
                          </Text>
                        </View>

                        <View style={styles.priceLineChartYAxis}>
                          {[
                            priceChartData.max,
                            Math.round((priceChartData.max + priceChartData.min) / 2),
                            priceChartData.min,
                          ].map((value, index) => (
                            <Text
                              key={`${value}-${index}`}
                              style={styles.priceLineChartAxisText}
                            >
                              {value}
                            </Text>
                          ))}
                        </View>

                        <View style={styles.priceLineChartPlot}>
                          <View style={styles.priceLineChartYAxisLine} />
                          <View style={styles.priceLineChartXAxisLine} />

                          {priceChartData.segments.map((segment) => (
                            <View
                              key={segment.key}
                              style={[
                                styles.priceLineChartSegment,
                                {
                                  left: segment.left,
                                  top: segment.top,
                                  width: segment.width,
                                  transform: [{ rotateZ: `${segment.angle}deg` }],
                                },
                              ]}
                            />
                          ))}

                          {priceChartData.points.map((point, index) => (
                            <View
                              key={`${point.importedAt}-point-${index}`}
                              style={[
                                styles.priceLineChartPointWrap,
                                {
                                  left: point.x - 24,
                                  top: point.y - 10,
                                },
                              ]}
                            >
                              <View style={styles.priceLineChartPoint} />
                              <Text style={styles.priceLineChartPointValue}>
                                {point.currentPrice}
                              </Text>
                            </View>
                          ))}

                          {priceChartData.points.map((point, index) => (
                            <View
                              key={`${point.importedAt}-label-${index}`}
                              style={[
                                styles.priceLineChartXLabel,
                                { left: point.x - 30 },
                              ]}
                            >
                              <Text style={styles.priceLineChartMonth}>
                                {point.label.day}
                              </Text>
                              <Text style={styles.priceLineChartYear}>
                                {point.label.year}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </ScrollView>

                    <View style={styles.usageBox}>
                      <Text style={styles.productsSummary}>Folosire in liste cadouri</Text>

                      <View style={styles.usageFiltersRow}>
                        <Dropdown
                          style={[styles.dropdown, styles.usageDropdown]}
                          containerStyle={styles.dropdownContainer}
                          placeholderStyle={styles.dropdownPlaceholder}
                          selectedTextStyle={styles.dropdownSelectedText}
                          data={usagePurposeOptions}
                          maxHeight={240}
                          labelField="label"
                          valueField="value"
                          placeholder="Scop cadou"
                          value={usagePurposeFilter}
                          onChange={(item) => setUsagePurposeFilter(item.value)}
                        />

                        <Dropdown
                          style={[styles.dropdown, styles.usageDropdown]}
                          containerStyle={styles.dropdownContainer}
                          placeholderStyle={styles.dropdownPlaceholder}
                          selectedTextStyle={styles.dropdownSelectedText}
                          data={usageYearOptions}
                          maxHeight={240}
                          labelField="label"
                          valueField="value"
                          placeholder="An"
                          value={usageYearFilter}
                          onChange={(item) => setUsageYearFilter(item.value)}
                        />
                      </View>

                      {usageLoading ? (
                        <View style={styles.usageLoadingRow}>
                          <ActivityIndicator />
                          <Text style={styles.productMeta}>
                            Se calculeaza statisticile din liste...
                          </Text>
                        </View>
                      ) : usageError ? (
                        <Text style={styles.errorText}>{usageError}</Text>
                      ) : (
                        <>
                          <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                              <Text style={styles.statLabel}>Adaugat in liste</Text>
                              <Text style={styles.statValue}>
                                {filteredUsageOccurrences.length}
                              </Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statLabel}>
                                Cumparat de pe acest magazin
                              </Text>
                              <Text style={styles.statValueSuccess}>
                                {filteredPurchasedFromThisStoreCount}
                              </Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statLabel}>
                                Adaugat, dar necumparat de aici
                              </Text>
                              <Text style={styles.statValueDanger}>
                                {filteredAddedWithoutPurchaseFromThisStoreCount}
                              </Text>
                            </View>
                          </View>

                          {filteredUsageOccurrences.length === 0 ? (
                            <Text style={styles.cardText}>
                              Produsul nu apare in liste pentru filtrele selectate.
                            </Text>
                          ) : (
                            filteredUsageOccurrences.slice(0, 12).map((occurrence, index) => (
                              <View
                                key={`${occurrence.giftPlanId}-${occurrence.addedAt}-${index}`}
                                style={styles.usageRow}
                              >
                                <View style={styles.productInfo}>
                                  <Text style={styles.priceHistoryDate}>
                                    {occurrence.purpose || 'Cadou'}
                                    {occurrence.year ? ` - ${occurrence.year}` : ''}
                                  </Text>
                                  <Text style={styles.productMeta}>
                                    Status: {occurrence.status} | Pret lista:{' '}
                                    {formatMoney(
                                      occurrence.price,
                                      selectedStore.currency || 'RON'
                                    )}
                                  </Text>
                                  {!!occurrence.purchasedAt && (
                                    <Text style={styles.productMeta}>
                                      Cumparat pe {formatImportDate(occurrence.purchasedAt)}
                                      {occurrence.purchasedStoreName
                                        ? ` de la ${occurrence.purchasedStoreName}`
                                        : ''}
                                    </Text>
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.usageBadge,
                                    occurrence.purchasedFromThisStore
                                      ? styles.usageBadgeSuccess
                                      : styles.usageBadgeMuted,
                                  ]}
                                >
                                  {occurrence.purchasedFromThisStore
                                    ? 'Cumparat aici'
                                    : 'Necumparat aici'}
                                </Text>
                              </View>
                            ))
                          )}
                        </>
                      )}
                    </View>

                    <Text style={styles.productsSummary}>Importuri observate</Text>
                    {selectedPriceHistory.history
                      .slice()
                      .reverse()
                      .map((entry, index) => (
                        <View
                          key={`${entry.importedAt}-${index}`}
                          style={styles.priceHistoryRow}
                        >
                          <View>
                            <Text style={styles.priceHistoryDate}>
                              {formatImportDate(entry.importedAt)}
                            </Text>
                            {!!entry.importName && (
                              <Text style={styles.productMeta}>{entry.importName}</Text>
                            )}
                          </View>
                          <View style={styles.priceHistoryValues}>
                            <Text style={styles.productPrice}>
                              {formatMoney(entry.currentPrice, selectedStore.currency || 'RON')}
                            </Text>
                            {entry.hasDiscount && (
                              <Text style={styles.discountText}>
                                Reducere{' '}
                                {entry.discountPercent !== undefined
                                  ? `${entry.discountPercent}%`
                                  : formatMoney(
                                      entry.discountAmount,
                                      selectedStore.currency || 'RON'
                                    )}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                  </>
                ) : (
                  <Text style={styles.cardText}>
                    Istoricul va aparea dupa urmatorul import al acestui produs.
                  </Text>
                )}

                {(selectedPriceProduct?.affiliateUrl || selectedPriceProduct?.productUrl) && (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() =>
                      openProductLink(
                        selectedPriceProduct?.affiliateUrl,
                        selectedPriceProduct?.productUrl
                      )
                    }
                  >
                    <Text style={styles.primaryButtonText}>Deschide link produs</Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.closeButton}
                  onPress={() => setSelectedPriceProduct(null)}
                >
                  <Text style={styles.closeButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Se incarca magazinele...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Magazine Partenere</Text>

      <Pressable style={styles.primaryButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.primaryButtonText}>+ Adauga magazin partener</Text>
      </Pressable>

      <View style={styles.filtersCard}>
        <TextInput
          placeholder="Cauta dupa magazin sau CUI"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />

        <Dropdown
          style={styles.dropdown}
          containerStyle={styles.dropdownContainer}
          placeholderStyle={styles.dropdownPlaceholder}
          selectedTextStyle={styles.dropdownSelectedText}
          data={categoryOptions}
          maxHeight={260}
          labelField="label"
          valueField="value"
          placeholder="Filtreaza dupa categorie"
          value={selectedCategory}
          onChange={(item) => setSelectedCategory(item.value)}
        />

        {(searchText.trim() || selectedCategory !== 'all') && (
          <Pressable
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchText('');
              setSelectedCategory('all');
            }}
          >
            <Text style={styles.clearFiltersText}>Curata filtrele</Text>
          </Pressable>
        )}
      </View>

      {stores.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nu exista magazine partenere</Text>
          <Text style={styles.cardText}>
            Adauga primul magazin pentru a putea importa catalogul de produse.
          </Text>
        </View>
      ) : filteredStores.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Niciun magazin gasit</Text>
          <Text style={styles.cardText}>
            Nu exista magazine care sa se potriveasca filtrelor selectate.
          </Text>
        </View>
      ) : (
        filteredStores.map((store) => (
          <Pressable
            key={store.id}
            style={styles.storeCard}
            onPress={() => setSelectedStoreId(store.id)}
          >
            {store.brandImageUri ? (
              <Image source={{ uri: store.brandImageUri }} style={styles.brandImage} />
            ) : (
              <View style={styles.brandPlaceholder}>
                <Text style={styles.brandPlaceholderText}>
                  {store.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{store.displayName}</Text>
              <Text style={styles.meta}>{store.companyName}</Text>
              {store.cui ? <Text style={styles.meta}>CUI: {store.cui}</Text> : null}
              <Text style={styles.meta}>
                Contract: {formatDateKey(store.contractStartDate)} – {formatDateKey(store.contractEndDate)}
              </Text>
              {!!store.merchant?.domain && (
                <Text style={styles.meta}>Website: {store.merchant.domain}</Text>
              )}
            </View>
          </Pressable>
        ))
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={styles.overlay}
          {...getModalBackdropResponder(() => {
            resetForm();
            setModalVisible(false);
          })}
        >
          <View style={styles.modalCard}>
            <View style={styles.handle} />

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalTitle}>Adauga magazin partener</Text>
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Text style={styles.label}>Numele magazinului ca firma</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Gift Partner SRL"
                value={companyName}
                onChangeText={(value) => {
                  setCompanyName(value);
                  if (error) setError('');
                }}
              />

              <Text style={styles.label}>CUI</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: RO123456"
                value={cui}
                autoCapitalize="characters"
                onChangeText={(value) => {
                  setCui(value);
                  if (error) setError('');
                }}
              />

              <Text style={styles.label}>Numar registrul comertului</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: J40/1234/2024"
                value={tradeRegisterNumber}
                autoCapitalize="characters"
                onChangeText={(value) => {
                  setTradeRegisterNumber(value);
                  if (error) setError('');
                }}
              />

              <Text style={styles.label}>Nume de afisat</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Gift Partner"
                value={displayName}
                onChangeText={(value) => {
                  setDisplayName(value);
                  if (error) setError('');
                }}
              />

              <Text style={styles.label}>Perioada contractuala</Text>
              <Text style={styles.smallLabel}>Start</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateDropdownWrapper}>
                  <Dropdown
                    style={styles.compactDropdown}
                    containerStyle={styles.dropdownContainer}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={DAYS}
                    maxHeight={240}
                    labelField="label"
                    valueField="value"
                    placeholder="Zi"
                    value={contractStartDay}
                    onChange={(item) => {
                      setContractStartDay(item.value);
                      if (error) setError('');
                    }}
                  />
                </View>
                <View style={styles.dateDropdownWrapper}>
                  <Dropdown
                    style={styles.compactDropdown}
                    containerStyle={styles.dropdownContainer}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={MONTHS}
                    maxHeight={240}
                    labelField="label"
                    valueField="value"
                    placeholder="Luna"
                    value={contractStartMonth}
                    onChange={(item) => {
                      setContractStartMonth(item.value);
                      if (error) setError('');
                    }}
                  />
                </View>
                <View style={styles.dateDropdownWrapper}>
                  <Dropdown
                    style={styles.compactDropdown}
                    containerStyle={styles.dropdownContainer}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={YEAR_OPTIONS}
                    maxHeight={240}
                    labelField="label"
                    valueField="value"
                    placeholder="An"
                    value={contractStartYear}
                    onChange={(item) => {
                      setContractStartYear(item.value);
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>
              <Text style={styles.smallLabel}>Final</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateDropdownWrapper}>
                  <Dropdown
                    style={styles.compactDropdown}
                    containerStyle={styles.dropdownContainer}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={DAYS}
                    maxHeight={240}
                    labelField="label"
                    valueField="value"
                    placeholder="Zi"
                    value={contractEndDay}
                    onChange={(item) => {
                      setContractEndDay(item.value);
                      if (error) setError('');
                    }}
                  />
                </View>
                <View style={styles.dateDropdownWrapper}>
                  <Dropdown
                    style={styles.compactDropdown}
                    containerStyle={styles.dropdownContainer}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={MONTHS}
                    maxHeight={240}
                    labelField="label"
                    valueField="value"
                    placeholder="Luna"
                    value={contractEndMonth}
                    onChange={(item) => {
                      setContractEndMonth(item.value);
                      if (error) setError('');
                    }}
                  />
                </View>
                <View style={styles.dateDropdownWrapper}>
                  <Dropdown
                    style={styles.compactDropdown}
                    containerStyle={styles.dropdownContainer}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    data={YEAR_OPTIONS}
                    maxHeight={240}
                    labelField="label"
                    valueField="value"
                    placeholder="An"
                    value={contractEndYear}
                    onChange={(item) => {
                      setContractEndYear(item.value);
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>

              <Text style={styles.label}>Imagine brand</Text>
              <Pressable style={styles.secondaryButton} onPress={pickBrandImage}>
                <Text style={styles.secondaryButtonText}>
                  {brandImageUri ? 'Schimba imaginea' : 'Alege imaginea'}
                </Text>
              </Pressable>

              {!!brandImageUri && (
                <Image source={{ uri: brandImageUri }} style={styles.brandPreview} />
              )}

              <Pressable style={styles.primaryButton} onPress={saveStore}>
                <Text style={styles.primaryButtonText}>Salveaza magazinul</Text>
              </Pressable>

              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.closeButtonText}>Inchide</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    backgroundColor: '#fff7ed',
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#be123c',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    shadowColor: '#be123c',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 14,
  },
  filtersCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    backgroundColor: '#fff',
    gap: 10,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
    fontSize: 14,
  },
  dropdown: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  dropdownContainer: {
    borderRadius: 10,
    borderColor: '#e5e7eb',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateDropdownWrapper: {
    flex: 1,
  },
  compactDropdown: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fafafa',
  },
  clearFiltersButton: {
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fce7e0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#be123c',
    fontWeight: '700',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#0d9488',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  brandImage: {
    width: 68,
    height: 68,
    borderRadius: 10,
  },
  brandPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  brandImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 14,
  },
  brandPlaceholderLarge: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandPlaceholderText: {
    color: '#166534',
    fontSize: 30,
    fontWeight: '800',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  meta: {
    color: '#4b5563',
    fontSize: 14,
    marginBottom: 5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: '90%',
    paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 8,
    backgroundColor: '#d1d5db',
    marginTop: 10,
    marginBottom: 6,
  },
  modalBody: {
    padding: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dateInput: {
    flex: 1,
  },
  brandPreview: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 10,
  },
  productsSummary: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 4,
  },
  productRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  productMeta: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 2,
  },
  productLinkText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  productHistoryText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  priceBlock: {
    alignItems: 'flex-end',
    maxWidth: 96,
  },
  productPrice: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '800',
  },
  originalPrice: {
    color: '#9ca3af',
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#6b7280',
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  statBox: {
    flexGrow: 1,
    flexBasis: 180,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  statValue: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  statValueSuccess: {
    color: '#16a34a',
    fontSize: 17,
    fontWeight: '900',
  },
  statValueDanger: {
    color: '#dc2626',
    fontSize: 17,
    fontWeight: '900',
  },
  priceChartScroll: {
    marginVertical: 12,
  },
  priceLineChart: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceChartTitleBlock: {
    position: 'absolute',
    left: 22,
    top: 18,
  },
  priceLineChartTitle: {
    color: '#374151',
    fontSize: 24,
    fontWeight: '300',
  },
  priceLineChartSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  priceLineChartYAxis: {
    position: 'absolute',
    left: 14,
    top: PRICE_CHART_TOP - 7,
    height: PRICE_CHART_PLOT_HEIGHT + 14,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 40,
  },
  priceLineChartAxisText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
  },
  priceLineChartPlot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PRICE_CHART_WIDTH,
    height: PRICE_CHART_HEIGHT,
  },
  priceLineChartYAxisLine: {
    position: 'absolute',
    left: PRICE_CHART_LEFT,
    top: PRICE_CHART_TOP,
    width: 1,
    height: PRICE_CHART_PLOT_HEIGHT,
    backgroundColor: '#d1d5db',
  },
  priceLineChartXAxisLine: {
    position: 'absolute',
    left: PRICE_CHART_LEFT,
    top: PRICE_CHART_TOP + PRICE_CHART_PLOT_HEIGHT,
    width: PRICE_CHART_PLOT_WIDTH,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  priceLineChartSegment: {
    position: 'absolute',
    height: 5,
    borderRadius: 8,
    backgroundColor: '#111827',
    transformOrigin: 'left center',
  },
  priceLineChartPointWrap: {
    position: 'absolute',
    alignItems: 'center',
    width: 48,
  },
  priceLineChartPoint: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  priceLineChartPointValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  priceLineChartXLabel: {
    position: 'absolute',
    top: PRICE_CHART_TOP + PRICE_CHART_PLOT_HEIGHT + 18,
    width: 60,
    alignItems: 'center',
  },
  priceLineChartMonth: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '900',
  },
  priceLineChartYear: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  priceHistoryRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceHistoryDate: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  priceHistoryValues: {
    alignItems: 'flex-end',
  },
  usageBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  usageFiltersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  usageDropdown: {
    flex: 1,
  },
  usageLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  usageRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  usageBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
  },
  usageBadgeSuccess: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  usageBadgeMuted: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
});
