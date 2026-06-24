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
  getAffiliateSummary,
  AffiliateSummary,
  getPartnerStoreProductUsage,
  getStoreAffiliateStats,
  importPartnerStoreProducts,
  StoreAffiliateStats,
  updatePartnerStore,
} from '../../../services/partnerStoresApi';
import {
  getAdminPartnerStoresCache,
  setAdminPartnerStoresCacheSnapshot,
  subscribeAdminPartnerStoresCache,
} from '../../../services/adminPartnerStoresCache';
import { invalidatePartnerStoresCache } from '../../../services/partnerStoresCache';
import {
  PartnerProductsImportPayload,
  PartnerStore,
  ProductImportItem,
  ProductPriceHistorySummary,
  PartnerProductUsageStats,
} from '../../../types/partnerStores';
import { C, R, S } from '../../../constants/theme';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';

const PRODUCTS_PER_PAGE = 10;
const PRICE_CHART_WIDTH = 760;
const PRICE_CHART_HEIGHT = 360;
const PRICE_CHART_LEFT = 80;
const PRICE_CHART_TOP = 70;
const PRICE_CHART_PLOT_WIDTH = 616;
const PRICE_CHART_PLOT_HEIGHT = 210;

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

const YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const year = new Date().getFullYear() - 10 + i;
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
  ).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

function getDateParts(value?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));

  if (!match) {
    return { year: null, month: null, day: null };
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
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
            ...(promo.hasPromoCode !== undefined ? { hasPromoCode: Boolean(promo.hasPromoCode) } : {}),
            ...(promo.code ? { code: String(promo.code) } : {}),
            ...(promo.discount !== undefined ? { discount: Number(promo.discount) } : {}),
            ...(promo.discountAmount !== undefined ? { discountAmount: Number(promo.discountAmount) } : {}),
            ...(promo.discountPercent !== undefined ? { discountPercent: Number(promo.discountPercent) } : {}),
            ...(promo.note ? { note: String(promo.note) } : {}),
            ...(promo.startDate ? { startDate: String(promo.startDate) } : {}),
            ...(promo.endDate ? { endDate: String(promo.endDate) } : {}),
            ...(promo.hasMinimumOrderValue !== undefined ? { hasMinimumOrderValue: Boolean(promo.hasMinimumOrderValue) } : {}),
            ...(promo.minimumOrderValue !== undefined ? { minimumOrderValue: Number(promo.minimumOrderValue) } : {}),
            ...(promo.minimumOrderCurrency ? { minimumOrderCurrency: String(promo.minimumOrderCurrency) } : {}),
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
    ...(() => {
      const aff = item.affiliate || {};
      const pct = Number(aff.commissionPercent);
      if (!Number.isFinite(pct) || pct <= 0) return {};
      return { affiliate: { commissionPercent: pct } };
    })(),
    ...(['barbati', 'femei', 'unisex'].includes(item.gender) ? { gender: item.gender } : {}),
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
    ...(parsed.affiliateProgram ? { affiliateProgram: parsed.affiliateProgram } : {}),
    ...(parsed.promotionIndicator ? { promotionIndicator: parsed.promotionIndicator } : {}),
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
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
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
  const [chartYearFilter, setChartYearFilter] = useState<number | 'all'>('all');
  const [affiliateStats, setAffiliateStats] = useState<StoreAffiliateStats | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateError, setAffiliateError] = useState<string | null>(null);
  const [affiliateExpanded, setAffiliateExpanded] = useState(false);
  const [affiliateSummary, setAffiliateSummary] = useState<AffiliateSummary | null>(null);
  const [affiliateSummaryLoading, setAffiliateSummaryLoading] = useState(false);
  const [affiliateSummaryModalVisible, setAffiliateSummaryModalVisible] = useState(false);
  const [chartContainerWidth, setChartContainerWidth] = useState(PRICE_CHART_WIDTH);
  const [productSearchText, setProductSearchText] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productUsageFilter, setProductUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [productPage, setProductPage] = useState(0);

  useEffect(() => {
    if (!selectedStoreId || !token) {
      setAffiliateStats(null);
      setAffiliateError(null);
      return;
    }
    let cancelled = false;
    setAffiliateLoading(true);
    setAffiliateError(null);
    getStoreAffiliateStats(token, selectedStoreId)
      .then((data) => { if (!cancelled) setAffiliateStats(data); })
      .catch((err) => {
        if (!cancelled) {
          setAffiliateStats(null);
          setAffiliateError(String(err?.message || err || 'Eroare necunoscuta'));
          console.error('[affiliate-stats] fetch error:', err);
        }
      })
      .finally(() => { if (!cancelled) setAffiliateLoading(false); });
    return () => { cancelled = true; };
  }, [selectedStoreId, token]);

  const selectedStore = useMemo(() => {
    return stores.find((store) => store.id === selectedStoreId) || null;
  }, [selectedStoreId, stores]);

  const groupedAffiliateProducts = useMemo(() => {
    if (!affiliateStats?.products?.length) return [];
    const map = new Map<string, {
      name: string;
      commissionPercent: number;
      conversions: number;
      totalExpected: number;
      totalReceived: number;
      entries: typeof affiliateStats.products;
    }>();
    affiliateStats.products.forEach((p) => {
      const key = p.name.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.conversions += 1;
        existing.totalExpected = Math.round((existing.totalExpected + p.expectedAmount) * 100) / 100;
        if (p.status === 'received') existing.totalReceived = Math.round((existing.totalReceived + p.receivedAmount) * 100) / 100;
        existing.entries.push(p);
      } else {
        map.set(key, {
          name: p.name,
          commissionPercent: p.commissionPercent,
          conversions: 1,
          totalExpected: p.expectedAmount,
          totalReceived: p.status === 'received' ? p.receivedAmount : 0,
          entries: [p],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalExpected - a.totalExpected);
  }, [affiliateStats]);

  const selectedPriceHistory = useMemo(() => {
    if (!selectedStore || !selectedPriceProduct) return null;
    return findPriceHistory(selectedStore, selectedPriceProduct);
  }, [selectedPriceProduct, selectedStore]);

  const chartAvailableYears = useMemo(() => {
    const years = new Set<number>();
    (selectedPriceHistory?.history || []).forEach((entry) => {
      const y = new Date(entry.importedAt).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [selectedPriceHistory]);

  const priceChartData = useMemo(() => {
    const allHistory = selectedPriceHistory?.history || [];
    const history = chartYearFilter === 'all'
      ? allHistory
      : allHistory.filter((e) => new Date(e.importedAt).getFullYear() === chartYearFilter);
    const values = history.map((entry) => entry.currentPrice);
    const rawMin = values.length ? Math.min(...values) : 0;
    const rawMax = values.length ? Math.max(...values) : 0;

    const flat = rawMin === rawMax;
    const pad = flat ? Math.max(rawMax * 0.08, 1) : 0;
    const displayMin = Number((rawMin - pad).toFixed(2));
    const displayMax = Number((rawMax + pad).toFixed(2));
    const range = Math.max(0.01, displayMax - displayMin);

    const plotWidth = chartContainerWidth - PRICE_CHART_LEFT - 40;

    const points = history.map((entry, index) => {
      const x =
        history.length <= 1
          ? PRICE_CHART_LEFT + plotWidth / 2
          : PRICE_CHART_LEFT +
            (index / (history.length - 1)) * plotWidth;
      const normalized = (entry.currentPrice - displayMin) / range;
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

    const mid = Number(((displayMin + displayMax) / 2).toFixed(2));
    return { min: displayMin, max: displayMax, mid, points, segments, plotWidth };
  }, [selectedPriceHistory, chartYearFilter, chartContainerWidth]);

  useEffect(() => {
    setChartYearFilter('all');
  }, [selectedPriceProduct]);

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

  const productCategoryOptions = useMemo(() => {
    if (!selectedStore) return [{ label: 'Toate categoriile', value: 'all' }];
    const categories = new Set<string>();
    selectedStore.products.forEach((p) => {
      const cat = String(p.category || '').trim();
      if (cat) categories.add(cat);
    });
    return [
      { label: 'Toate categoriile', value: 'all' },
      ...Array.from(categories)
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ label: c, value: c })),
    ];
  }, [selectedStore]);

  const filteredProducts = useMemo(() => {
    if (!selectedStore) return [];
    const normalizedSearch = productSearchText.trim().toLowerCase();
    return selectedStore.products.filter((p) => {
      const matchesCategory =
        productCategoryFilter === 'all' ||
        String(p.category || '').trim().toLowerCase() ===
          productCategoryFilter.toLowerCase();
      if (!matchesCategory) return false;
      if (productUsageFilter !== 'all') {
        const key = String(p.name || '').toLowerCase().trim();
        const isUsed = groupedAffiliateProducts.some(
          (g) => g.name.toLowerCase().trim() === key
        );
        if (productUsageFilter === 'used' && !isUsed) return false;
        if (productUsageFilter === 'unused' && isUsed) return false;
      }
      if (!normalizedSearch) return true;
      return String(p.name || '').toLowerCase().includes(normalizedSearch);
    });
  }, [selectedStore, productSearchText, productCategoryFilter, productUsageFilter, groupedAffiliateProducts]);

  const totalProductPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const pagedProducts = filteredProducts.slice(
    productPage * PRODUCTS_PER_PAGE,
    (productPage + 1) * PRODUCTS_PER_PAGE
  );

  useEffect(() => {
    setProductPage(0);
  }, [productSearchText, productCategoryFilter, selectedStoreId]);

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

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setAffiliateSummaryLoading(true);
    getAffiliateSummary(token)
      .then((data) => { if (!cancelled) setAffiliateSummary(data); })
      .catch(() => { if (!cancelled) setAffiliateSummary(null); })
      .finally(() => { if (!cancelled) setAffiliateSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const resetForm = () => {
    setEditingStoreId(null);
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

  const openCreateStoreModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditStoreModal = (store: PartnerStore) => {
    const start = getDateParts(store.contractStartDate);
    const end = getDateParts(store.contractEndDate);

    setEditingStoreId(store.id);
    setCompanyName(store.companyName || '');
    setCui(store.cui || '');
    setTradeRegisterNumber(store.tradeRegisterNumber || '');
    setDisplayName(store.displayName || '');
    setContractStartDay(start.day);
    setContractStartMonth(start.month);
    setContractStartYear(start.year);
    setContractEndDay(end.day);
    setContractEndMonth(end.month);
    setContractEndYear(end.year);
    setBrandImageUri(store.brandImageUri);
    setError('');
    setModalVisible(true);
  };

  const pickBrandImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      setBrandImageUri(`data:${mimeType};base64,${asset.base64}`);
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
      const payload = {
        companyName: companyName.trim(),
        cui: cui.trim().toUpperCase(),
        tradeRegisterNumber: tradeRegisterNumber.trim().toUpperCase(),
        displayName: displayName.trim(),
        contractStartDate,
        contractEndDate,
        brandImageUri,
      };

      const savedStore = editingStoreId
        ? await updatePartnerStore(token, editingStoreId, payload)
        : await createPartnerStore(token, payload);

      setStores((current) => {
        const nextStores = editingStoreId
          ? current.map((store) => (store.id === savedStore.id ? savedStore : store))
          : [savedStore, ...current];
        setAdminPartnerStoresCacheSnapshot(token, nextStores);
        invalidatePartnerStoresCache();
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
            invalidatePartnerStoresCache();
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
          <View style={{ gap: 8 }}>
            {!!selectedStore.merchant?.domain && (
              <Pressable
                style={[styles.secondaryButton, { borderColor: C.accent, backgroundColor: C.accentSoft }]}
                onPress={() => Linking.openURL(`https://${selectedStore.merchant!.domain}`).catch(() => {})}
              >
                <Text style={[styles.secondaryButtonText, { color: C.accent }]}>Acceseaza magazin</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                openEditStoreModal(selectedStore);
                setSelectedStoreId(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Editeaza magazinul</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.affiliateHeaderRow}>
            <Text style={styles.cardTitle}>Incasari afiliate</Text>
            {selectedStore.affiliate?.commissionPercent ? (
              <View style={styles.affiliateCommissionBadge}>
                <Text style={styles.affiliateCommissionBadgeText}>
                  {selectedStore.affiliate.commissionPercent}% comision
                </Text>
              </View>
            ) : null}
          </View>

          {affiliateLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : affiliateError ? (
            <Text style={[styles.cardText, { color: 'red' }]}>
              Eroare: {affiliateError}
            </Text>
          ) : !affiliateStats || affiliateStats.conversions === 0 ? (
            <Text style={styles.cardText}>
              Nicio conversie afiliata inregistrata. Comisioanele apar dupa ce clientii
              marcheaza cadouri ca si cumparate din produsele acestui magazin.
            </Text>
          ) : (
            <>
              <View style={styles.affiliateGrid}>
                <View style={styles.affiliateTile}>
                  <Text style={styles.affiliateTileLabel}>Luna curentă</Text>
                  <Text style={[styles.affiliateTileValue, styles.affiliateValuePositive]}>
                    {affiliateStats.currentMonthExpected} RON
                  </Text>
                  <Text style={[styles.affiliateTileLabel, { marginTop: 2 }]}>acumulat în curs</Text>
                </View>
                <View style={styles.affiliateTile}>
                  <Text style={styles.affiliateTileLabel}>De virat</Text>
                  <Text style={[styles.affiliateTileValue, affiliateStats.previousMonthsPending > 0 && styles.affiliateValuePending]}>
                    {affiliateStats.previousMonthsPending} RON
                  </Text>
                  {affiliateStats.daysUntilPayment !== null && affiliateStats.previousMonthsPending > 0 && (
                    <Text style={[styles.affiliateTileLabel, { marginTop: 2 }]}>
                      {affiliateStats.daysUntilPayment > 0
                        ? `în ${affiliateStats.daysUntilPayment} zile`
                        : affiliateStats.daysUntilPayment === 0
                        ? 'scadent azi'
                        : `întârziat ${Math.abs(affiliateStats.daysUntilPayment)} zile`}
                    </Text>
                  )}
                </View>
                <View style={styles.affiliateTile}>
                  <Text style={styles.affiliateTileLabel}>Incasat</Text>
                  <Text style={[styles.affiliateTileValue, affiliateStats.totalReceived > 0 && styles.affiliateValuePositive]}>
                    {affiliateStats.totalReceived} RON
                  </Text>
                </View>
                <View style={styles.affiliateTile}>
                  <Text style={styles.affiliateTileLabel}>Conversii</Text>
                  <Text style={styles.affiliateTileValue}>
                    {affiliateStats.conversions}
                  </Text>
                  <Text style={[styles.affiliateTileLabel, { marginTop: 2 }]}>{affiliateStats.paymentTermDays}z termen plată</Text>
                </View>
              </View>

              <Pressable
                style={styles.affiliateExpandButton}
                onPress={() => setAffiliateExpanded((v) => !v)}
              >
                <Text style={styles.affiliateExpandText}>
                  Top {Math.min(10, groupedAffiliateProducts.length)} produse cu incasari
                </Text>
                <Text style={styles.affiliateExpandChevron}>
                  {affiliateExpanded ? '▲' : '▼'}
                </Text>
              </Pressable>

              {affiliateExpanded && groupedAffiliateProducts.slice(0, 10).map((group, index) => {
                const catalogProduct = selectedStore.products.find(
                  (p) => p.name?.toLowerCase().trim() === group.name.toLowerCase().trim()
                );
                return (
                <Pressable
                  key={group.name}
                  style={styles.affiliateGroupRow}
                  onPress={() => catalogProduct && setSelectedPriceProduct(catalogProduct)}
                >
                  <View style={styles.affiliateGroupRank}>
                    <Text style={styles.affiliateGroupRankText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.affiliateProductName} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={styles.affiliateProductMeta}>
                      {group.conversions} {group.conversions === 1 ? 'conversie' : 'conversii'} · {group.commissionPercent}%
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.affiliateProductAmount, styles.affiliateValuePositive]}>
                      {group.totalExpected} RON
                    </Text>
                    <Text style={styles.affiliateProductMeta}>
                    {catalogProduct ? 'Apasa pentru detalii →' : ''}
                  </Text>
                  </View>
                </Pressable>
                );
              })}
            </>
          )}
        </View>

        {(() => {
          const pi = (selectedStore as any).promotionIndicator;
          if (!pi?.hasPromotion || !pi.code) return null;
          const endDate = pi.duration?.endDate;
          const endFmt = endDate ? (() => {
            const d = /^\d{2}-\d{2}-\d{4}$/.test(endDate)
              ? new Date(endDate.split('-').reverse().join('-'))
              : new Date(endDate);
            return isNaN(d.getTime()) ? null : `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
          })() : null;
          return (
            <View style={styles.adminPromoBanner}>
              <View style={styles.adminPromoBannerHeader}>
                <Text style={styles.adminPromoBannerTitle}>🏷 Promoție activă: -{pi.discountPercent}% cod {pi.code}</Text>
                <Text style={styles.adminPromoBannerBadge}>
                {endFmt ? `până ${endFmt}` : 'Promoție permanentă'}
              </Text>
              </View>
              {pi.hasMinimumOrderValue && pi.minimumOrderValue && (
                <Text style={styles.adminPromoBannerDetail}>Cos minim: {pi.minimumOrderValue} {pi.currency || 'RON'}</Text>
              )}
              {pi.note && <Text style={styles.adminPromoBannerNote}>{pi.note}</Text>}
            </View>
          );
        })()}

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

          {!!selectedStore.updatedAt && (
            <Text style={styles.helperText}>
              Ultimul import: {formatImportDate(selectedStore.updatedAt)}
            </Text>
          )}

          <Text style={styles.productsSummary}>
            Total produse: {selectedStore.products.length}
          </Text>

          <View style={styles.productFiltersRow}>
            <TextInput
              placeholder="Cauta dupa numele produsului"
              style={[styles.searchInput, styles.productSearchInput]}
              value={productSearchText}
              onChangeText={setProductSearchText}
            />
            <Dropdown
              style={[styles.dropdown, styles.productCategoryDropdown]}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              data={productCategoryOptions}
              maxHeight={260}
              labelField="label"
              valueField="value"
              placeholder="Toate categoriile"
              value={productCategoryFilter}
              onChange={(item) => setProductCategoryFilter(item.value)}
            />
            <Dropdown
              style={[styles.dropdown, styles.productCategoryDropdown]}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              data={[
                { label: 'Toate produsele', value: 'all' },
                { label: 'Utilizate in liste de cadouri', value: 'used' },
                { label: 'Neutilizate in liste de cadouri', value: 'unused' },
              ]}
              maxHeight={200}
              labelField="label"
              valueField="value"
              placeholder="Toate produsele"
              value={productUsageFilter}
              onChange={(item) => setProductUsageFilter(item.value)}
            />
          </View>

          {(productSearchText.trim() || productCategoryFilter !== 'all' || productUsageFilter !== 'all') && (
            <Text style={styles.productFilterCount}>
              {filteredProducts.length} produse gasite
            </Text>
          )}

          {pagedProducts.map((product, index) => (
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
                {(() => {
                  const pi = (selectedStore as any).promotionIndicator;
                  const effectivePromo = product.promo?.code ? product.promo : (pi?.hasPromotion ? pi : null);
                  if (!effectivePromo?.code && !effectivePromo?.discountPercent) return null;
                  const pct = effectivePromo.discountPercent;
                  const code = effectivePromo.code || pi?.code;
                  const minOrder = effectivePromo.minimumOrderValue ?? (pi?.hasMinimumOrderValue ? pi?.minimumOrderValue : null);
                  return (
                    <View style={styles.adminProductPromoRow}>
                      <Text style={styles.adminProductPromoTag}>-{pct}% {code}</Text>
                      {minOrder ? <Text style={styles.adminProductPromoMin}>min. {minOrder} RON</Text> : null}
                    </View>
                  );
                })()}
                <Text style={styles.productHistoryText}>Detalii produs</Text>
              </View>
              <View style={styles.priceBlock}>
                {(() => {
                  const currency = selectedStore.currency || 'RON';
                  const currentPrice = product.price?.current;
                  if (currentPrice === undefined || !Number.isFinite(currentPrice)) return null;

                  const pi = (selectedStore as any).promotionIndicator;
                  const excluded = Array.isArray(pi?.excludedProductIds) && pi.excludedProductIds.includes(product.id);
                  const productPromo = product.promo?.code ? product.promo : null;
                  const storePromo = !excluded && pi?.hasPromotion && pi?.code ? pi : null;
                  const effectivePromo = productPromo || storePromo;
                  const hasNoMinOrder = effectivePromo &&
                    !effectivePromo.hasMinimumOrderValue &&
                    !effectivePromo.minimumOrderValue;

                  if (effectivePromo?.discountPercent) {
                    const promoPrice = productPromo?.priceAfterPromo && productPromo.priceAfterPromo > 0
                      ? productPromo.priceAfterPromo
                      : Math.round(currentPrice * (1 - effectivePromo.discountPercent / 100) * 100) / 100;
                    const minOrder = effectivePromo.hasMinimumOrderValue && effectivePromo.minimumOrderValue
                      ? effectivePromo.minimumOrderValue
                      : null;
                    return (
                      <>
                        <Text style={styles.originalPrice}>{formatMoney(currentPrice, currency)}</Text>
                        <Text style={styles.productPrice}>{formatMoney(promoPrice, currency)}</Text>
                        {minOrder && (
                          <Text style={styles.promoMinBadge}>coș min. {minOrder} RON</Text>
                        )}
                      </>
                    );
                  }

                  return (
                    <>
                      <Text style={styles.productPrice}>{formatMoney(currentPrice, currency)}</Text>
                      {product.price?.hasDiscount && product.price.original !== undefined && (
                        <Text style={styles.originalPrice}>
                          {formatMoney(product.price.original, currency)}
                        </Text>
                      )}
                      {product.price?.discountPercent !== undefined && product.price.discountPercent > 0 && (
                        <Text style={styles.discountText}>-{product.price.discountPercent}%</Text>
                      )}
                    </>
                  );
                })()}
              </View>
            </Pressable>
          ))}

          {totalProductPages > 1 && (() => {
            const pages: (number | '...')[] = [];
            if (totalProductPages <= 7) {
              for (let i = 0; i < totalProductPages; i++) pages.push(i);
            } else {
              pages.push(0);
              if (productPage > 2) pages.push('...');
              for (let i = Math.max(1, productPage - 1); i <= Math.min(totalProductPages - 2, productPage + 1); i++) {
                pages.push(i);
              }
              if (productPage < totalProductPages - 3) pages.push('...');
              pages.push(totalProductPages - 1);
            }
            return (
              <View style={styles.paginationRow}>
                <Pressable
                  style={[styles.paginationButton, productPage === 0 && styles.paginationButtonDisabled]}
                  onPress={() => setProductPage((p) => Math.max(0, p - 1))}
                  disabled={productPage === 0}
                >
                  <Text style={styles.paginationButtonText}>‹ Inapoi</Text>
                </Pressable>

                {pages.map((p, i) =>
                  p === '...' ? (
                    <Text key={`ellipsis-${i}`} style={styles.paginationEllipsis}>…</Text>
                  ) : (
                    <Pressable
                      key={p}
                      style={[styles.paginationPageBtn, p === productPage && styles.paginationPageBtnActive]}
                      onPress={() => setProductPage(p)}
                    >
                      <Text style={[styles.paginationPageText, p === productPage && styles.paginationPageTextActive]}>
                        {p + 1}
                      </Text>
                    </Pressable>
                  )
                )}

                <Pressable
                  style={[styles.paginationButton, productPage >= totalProductPages - 1 && styles.paginationButtonDisabled]}
                  onPress={() => setProductPage((p) => Math.min(totalProductPages - 1, p + 1))}
                  disabled={productPage >= totalProductPages - 1}
                >
                  <Text style={styles.paginationButtonText}>Inainte ›</Text>
                </Pressable>
              </View>
            );
          })()}
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
                <View style={styles.modalProductHeader}>
                  {!!selectedPriceProduct?.imageUrl && (
                    <Image
                      source={{ uri: selectedPriceProduct.imageUrl }}
                      style={styles.modalProductImage}
                      resizeMode="contain"
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {selectedPriceProduct?.name || 'Istoric pret'}
                    </Text>
                    {!!selectedPriceProduct?.brand && (
                      <Text style={styles.meta}>Brand: {selectedPriceProduct.brand}</Text>
                    )}
                  </View>
                </View>

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
                        <Text style={styles.statLabel}>Pret la primul import</Text>
                        <Text style={styles.statValue}>
                          {formatMoney(
                            selectedPriceHistory.latestOriginalPrice,
                            selectedStore.currency || 'RON'
                          )}
                        </Text>
                      </View>
                    </View>

                    {chartAvailableYears.length >= 1 && (
                      <View style={styles.chartYearFilterRow}>
                        <Pressable
                          style={[styles.chartYearBtn, chartYearFilter === 'all' && styles.chartYearBtnActive]}
                          onPress={() => setChartYearFilter('all')}
                        >
                          <Text style={[styles.chartYearBtnText, chartYearFilter === 'all' && styles.chartYearBtnTextActive]}>
                            Toti anii
                          </Text>
                        </Pressable>
                        {chartAvailableYears.map((year) => (
                          <Pressable
                            key={year}
                            style={[styles.chartYearBtn, chartYearFilter === year && styles.chartYearBtnActive]}
                            onPress={() => setChartYearFilter(year)}
                          >
                            <Text style={[styles.chartYearBtnText, chartYearFilter === year && styles.chartYearBtnTextActive]}>
                              {year}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    <View
                      style={styles.priceChartScroll}
                      onLayout={(e) => setChartContainerWidth(e.nativeEvent.layout.width)}
                    >
                      <View
                        style={[
                          styles.priceLineChart,
                          { width: chartContainerWidth, height: PRICE_CHART_HEIGHT },
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
                            priceChartData.mid,
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
                          <View style={[styles.priceLineChartXAxisLine, { width: priceChartData.plotWidth }]} />

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
                    </View>

                    <View style={styles.usageBox}>
                      <Text style={styles.productsSummary}>Folosire in liste cadouri</Text>

                      {usageLoading ? (
                        <View style={styles.usageLoadingRow}>
                          <ActivityIndicator />
                          <Text style={styles.productMeta}>
                            Se calculeaza statisticile...
                          </Text>
                        </View>
                      ) : usageError ? (
                        <Text style={styles.errorText}>{usageError}</Text>
                      ) : (
                        <View style={styles.statsGrid}>
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>In lista</Text>
                            <Text style={styles.statValue}>
                              {filteredUsageOccurrences.length}
                            </Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Conversii magazin</Text>
                            <Text style={styles.statValueSuccess}>
                              {filteredPurchasedFromThisStoreCount}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                  {(() => {
                    const key = selectedPriceProduct?.name?.toLowerCase().trim();
                    const group = key ? groupedAffiliateProducts.find(
                      (g) => g.name.toLowerCase().trim() === key
                    ) : null;
                    const hasAffiliateProgram = !!(selectedPriceProduct as any)?.affiliate?.commissionPercent;
                    if (!group) {
                      if (!hasAffiliateProgram) return null;
                      return (
                        <View style={styles.usageBox}>
                          <Text style={styles.productsSummary}>Incasari marketing afiliat</Text>
                          <Text style={styles.cardText}>
                            Produsul nu a fost inclus inca intr-o lista de cadouri. Comisioanele vor aparea dupa ce clientii adauga si cumpara acest produs.
                          </Text>
                        </View>
                      );
                    }
                    const totalPending = Math.round((group.totalExpected - group.totalReceived) * 100) / 100;
                    return (
                      <View style={styles.usageBox}>
                        <Text style={styles.productsSummary}>Incasari marketing afiliat</Text>
                        <View style={styles.affiliateGrid}>
                          <View style={styles.affiliateTile}>
                            <Text style={styles.affiliateTileLabel}>In asteptare</Text>
                            <Text style={[styles.affiliateTileValue, styles.affiliateValuePending]}>
                              {totalPending} RON
                            </Text>
                          </View>
                          <View style={styles.affiliateTile}>
                            <Text style={styles.affiliateTileLabel}>Incasari</Text>
                            <Text style={[styles.affiliateTileValue, group.totalReceived > 0 && styles.affiliateValuePositive]}>
                              {group.totalReceived} RON
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
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

      <Pressable style={styles.primaryButton} onPress={openCreateStoreModal}>
        <Text style={styles.primaryButtonText}>+ Adauga magazin partener</Text>
      </Pressable>

      {affiliateSummaryLoading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : affiliateSummary && affiliateSummary.totals.conversions > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Incasari marketing afiliat</Text>
          <View style={styles.affiliateGrid}>
            <View style={styles.affiliateTile}>
              <Text style={styles.affiliateTileLabel}>Luna curentă</Text>
              <Text style={[styles.affiliateTileValue, styles.affiliateValuePositive]}>
                {affiliateSummary.totals.currentMonthExpected} RON
              </Text>
              <Text style={[styles.affiliateTileLabel, { marginTop: 2 }]}>acumulat în curs</Text>
            </View>
            <View style={styles.affiliateTile}>
              <Text style={styles.affiliateTileLabel}>De virat</Text>
              <Text style={[styles.affiliateTileValue, affiliateSummary.totals.previousMonthsPending > 0 && styles.affiliateValuePending]}>
                {affiliateSummary.totals.previousMonthsPending} RON
              </Text>
              {affiliateSummary.totals.daysUntilPayment !== null && affiliateSummary.totals.previousMonthsPending > 0 && (
                <Text style={[styles.affiliateTileLabel, { marginTop: 2 }]}>
                  {affiliateSummary.totals.daysUntilPayment > 0
                    ? `în ${affiliateSummary.totals.daysUntilPayment} zile`
                    : affiliateSummary.totals.daysUntilPayment === 0
                    ? 'scadent azi'
                    : `întârziat ${Math.abs(affiliateSummary.totals.daysUntilPayment)} zile`}
                </Text>
              )}
            </View>
            <View style={styles.affiliateTile}>
              <Text style={styles.affiliateTileLabel}>Incasari</Text>
              <Text style={[styles.affiliateTileValue, affiliateSummary.totals.totalReceived > 0 && styles.affiliateValuePositive]}>
                {affiliateSummary.totals.totalReceived} RON
              </Text>
            </View>
            <View style={styles.affiliateTile}>
              <Text style={styles.affiliateTileLabel}>Conversii totale</Text>
              <Text style={styles.affiliateTileValue}>
                {affiliateSummary.totals.conversions}
              </Text>
            </View>
          </View>
          <View style={[styles.affiliateHeaderRow, { marginTop: 14 }]}>
            <Text style={styles.cardTitle}>Pe magazine</Text>
            {affiliateSummary.stores.length > 3 && (
              <Pressable onPress={() => setAffiliateSummaryModalVisible(true)}>
                <Text style={[styles.affiliateDetailButtonText, { fontSize: 13 }]}>
                  Vezi toate ({affiliateSummary.stores.length}) ↗
                </Text>
              </Pressable>
            )}
          </View>
          {[...affiliateSummary.stores]
            .sort((a, b) => b.totalExpected - a.totalExpected)
            .slice(0, 3)
            .map((s) => (
              <Pressable
                key={s.storeId}
                style={styles.affiliateProductRow}
                onPress={() => setSelectedStoreId(s.storeId)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.affiliateProductName}>{s.storeName}</Text>
                  <Text style={styles.affiliateProductMeta}>
                    {s.conversions} {s.conversions === 1 ? 'conversie' : 'conversii'} · {s.commissionPercent}%
                  </Text>
                </View>
                <View style={styles.affiliateProductRight}>
                  <Text style={[styles.affiliateProductAmount, styles.affiliateValuePositive]}>
                    {s.totalExpected} RON
                  </Text>
                  <Text style={styles.affiliateProductMeta}>Vezi magazin →</Text>
                </View>
              </Pressable>
            ))}

          <Modal
            visible={affiliateSummaryModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setAffiliateSummaryModalVisible(false)}
          >
            <View style={styles.overlay} {...getModalBackdropResponder(() => setAffiliateSummaryModalVisible(false))}>
              <View style={styles.modalCard}>
                <View style={styles.handle} />
                <ScrollView contentContainerStyle={styles.modalBody}>
                  <Text style={styles.modalTitle}>Incasari pe magazine</Text>
                  <Text style={styles.meta}>Sortate descrescator dupa valoarea estimata</Text>
                  {[...affiliateSummary.stores]
                    .sort((a, b) => b.totalExpected - a.totalExpected)
                    .map((s, index) => (
                      <Pressable
                        key={s.storeId}
                        style={styles.affiliateProductRow}
                        onPress={() => { setAffiliateSummaryModalVisible(false); setSelectedStoreId(s.storeId); }}
                      >
                        <View style={[styles.affiliateGroupRank, { marginRight: 10 }]}>
                          <Text style={styles.affiliateGroupRankText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.affiliateProductName}>{s.storeName}</Text>
                          <Text style={styles.affiliateProductMeta}>
                            {s.conversions} {s.conversions === 1 ? 'conversie' : 'conversii'} · {s.commissionPercent}%
                          </Text>
                        </View>
                        <View style={styles.affiliateProductRight}>
                          <Text style={[styles.affiliateProductAmount, styles.affiliateValuePositive]}>
                            {s.totalExpected} RON
                          </Text>
                          <Text style={[styles.affiliateProductMeta, { color: C.accent }]}>→</Text>
                        </View>
                      </Pressable>
                    ))}
                </ScrollView>
                <Pressable
                  style={[styles.secondaryButton, { margin: 16 }]}
                  onPress={() => setAffiliateSummaryModalVisible(false)}
                >
                  <Text style={styles.secondaryButtonText}>Inchide</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
      ) : null}

      <View style={styles.stickyFiltersWrapper}>
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
              <Text style={styles.modalTitle}>
                {editingStoreId ? 'Editeaza magazin partener' : 'Adauga magazin partener'}
              </Text>
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
                <Text style={styles.primaryButtonText}>
                  {editingStoreId ? 'Salveaza modificarile' : 'Salveaza magazinul'}
                </Text>
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
    backgroundColor: C.bg,
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
    fontFamily: 'serif',
    fontWeight: '400',
    color: C.text,
  },
  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: C.text,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: C.textDim,
    marginBottom: 14,
  },
  stickyFiltersWrapper: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 10,
    backgroundColor: C.bg,
    paddingVertical: 4,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filtersCard: {
    padding: 14,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    gap: 10,
    ...S.card,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    color: C.text,
    backgroundColor: C.surface2,
    fontSize: 14,
  },
  dropdown: {
    minHeight: 48,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    backgroundColor: C.surface2,
  },
  dropdownContainer: {
    borderRadius: R.md,
    borderColor: C.border,
  },
  dropdownPlaceholder: {
    color: C.textFaint,
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textDim,
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
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 10,
    backgroundColor: C.surface2,
  },
  clearFiltersButton: {
    backgroundColor: C.accentSoft,
    borderRadius: R.pill,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: C.accentInk,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: C.surface2,
    borderRadius: R.pill,
    borderWidth: 0.5,
    borderColor: C.borderStrong,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: C.text,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  storeCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    ...S.card,
  },
  brandImage: {
    width: 68,
    height: 68,
    borderRadius: R.md,
  },
  brandPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: R.md,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  brandImageLarge: {
    width: 120,
    height: 120,
    borderRadius: R.md,
    marginBottom: 14,
  },
  brandPlaceholderLarge: {
    width: 120,
    height: 120,
    borderRadius: R.md,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandPlaceholderText: {
    color: C.accent,
    fontSize: 30,
    fontFamily: 'serif',
    fontWeight: '400',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: C.textDim,
    fontSize: 14,
    marginBottom: 5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    maxHeight: '90%',
    paddingBottom: 16,
    ...S.float,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: R.pill,
    backgroundColor: C.borderStrong,
    marginTop: 10,
    marginBottom: 6,
  },
  modalBody: {
    padding: 16,
  },
  modalProductHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  modalProductImage: {
    width: 100,
    height: 100,
    borderRadius: R.md,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '400',
    color: C.text,
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: C.surface2,
    color: C.text,
  },
  dateInput: {
    flex: 1,
  },
  brandPreview: {
    width: 90,
    height: 90,
    borderRadius: R.md,
    marginTop: 12,
    marginBottom: 14,
  },
  errorText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  helperText: {
    color: C.textDim,
    fontSize: 13,
    marginTop: 10,
  },
  productsSummary: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 4,
  },
  productRow: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 58,
    height: 58,
    borderRadius: R.md,
    backgroundColor: C.surface2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  productMeta: {
    color: C.textDim,
    fontSize: 13,
    marginBottom: 2,
  },
  productLinkText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  productHistoryText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  adminPromoBanner: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#f9a825',
    borderRadius: R.md,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  adminPromoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminPromoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e65100',
    flex: 1,
  },
  adminPromoBannerBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e65100',
    backgroundColor: '#ffe0b2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.sm,
  },
  adminPromoBannerDetail: {
    fontSize: 13,
    color: '#6d4c41',
  },
  adminPromoBannerNote: {
    fontSize: 11,
    color: C.textDim,
    fontStyle: 'italic',
  },
  adminProductPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    marginBottom: 2,
  },
  adminProductPromoTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e65100',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.xs,
  },
  adminProductPromoMin: {
    fontSize: 10,
    color: C.textDim,
    fontStyle: 'italic',
  },
  priceBlock: {
    alignItems: 'flex-end',
    maxWidth: 96,
  },
  productPrice: {
    color: C.sage,
    fontSize: 14,
    fontWeight: '700',
  },
  originalPrice: {
    color: C.textFaint,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  promoMinBadge: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: C.warnBg,
    color: C.warn,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeButtonText: {
    color: C.textDim,
    fontWeight: '700',
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
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 12,
    backgroundColor: C.surface2,
  },
  statLabel: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  statValueSuccess: {
    color: C.sage,
    fontSize: 17,
    fontWeight: '700',
  },
  statValueDanger: {
    color: C.danger,
    fontSize: 17,
    fontWeight: '700',
  },
  chartYearFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  chartYearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  chartYearBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  chartYearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textDim,
  },
  chartYearBtnTextActive: {
    color: '#fff',
  },
  priceChartScroll: {
    marginVertical: 12,
  },
  priceLineChart: {
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    overflow: 'hidden',
  },
  priceChartTitleBlock: {
    position: 'absolute',
    left: PRICE_CHART_LEFT + 10,
    top: 12,
  },
  priceLineChartTitle: {
    color: C.text,
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '400',
  },
  priceLineChartSubtitle: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  priceLineChartYAxis: {
    position: 'absolute',
    left: 4,
    top: PRICE_CHART_TOP - 7,
    height: PRICE_CHART_PLOT_HEIGHT + 14,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: PRICE_CHART_LEFT - 8,
  },
  priceLineChartAxisText: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: C.border,
  },
  priceLineChartXAxisLine: {
    position: 'absolute',
    left: PRICE_CHART_LEFT,
    top: PRICE_CHART_TOP + PRICE_CHART_PLOT_HEIGHT,
    width: PRICE_CHART_PLOT_WIDTH,
    height: 1,
    backgroundColor: C.border,
  },
  priceLineChartSegment: {
    position: 'absolute',
    height: 5,
    borderRadius: R.pill,
    backgroundColor: C.accent,
    transformOrigin: 'left center',
  },
  priceLineChartPointWrap: {
    position: 'absolute',
    alignItems: 'center',
    width: 60,
  },
  priceLineChartPoint: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.surface,
  },
  priceLineChartPointValue: {
    color: C.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    backgroundColor: C.surface,
    paddingHorizontal: 2,
  },
  priceLineChartXLabel: {
    position: 'absolute',
    top: PRICE_CHART_TOP + PRICE_CHART_PLOT_HEIGHT + 22,
    width: 60,
    alignItems: 'center',
  },
  priceLineChartMonth: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  priceLineChartYear: {
    color: C.textFaint,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  priceHistoryRow: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceHistoryDate: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  priceHistoryValues: {
    alignItems: 'flex-end',
  },
  usageBox: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 12,
    backgroundColor: C.surface,
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
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  usageBadge: {
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  usageBadgeSuccess: {
    backgroundColor: C.sageBg,
    color: C.sage,
  },
  usageBadgeMuted: {
    backgroundColor: C.surface2,
    color: C.textDim,
  },
  productFiltersRow: {
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  productSearchInput: {
    marginBottom: 0,
  },
  productCategoryDropdown: {},
  productFilterCount: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  paginationButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  paginationButtonDisabled: {
    opacity: 0.35,
  },
  paginationButtonText: {
    color: C.text,
    fontWeight: '600',
    fontSize: 14,
  },
  paginationPageBtn: {
    minWidth: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  paginationPageBtnActive: {
    backgroundColor: C.accent,
  },
  paginationPageText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textDim,
  },
  paginationPageTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  paginationEllipsis: {
    fontSize: 14,
    color: C.textDim,
    paddingHorizontal: 4,
    alignSelf: 'center',
  },
  paginationInfo: {
    color: C.text,
    fontWeight: '700',
    fontSize: 15,
    minWidth: 60,
    textAlign: 'center',
  },
  affiliateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  affiliateTile: {
    flex: 1,
    minWidth: 70,
    backgroundColor: C.surface2,
    borderRadius: R.md,
    padding: 10,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  affiliateTileLabel: {
    fontSize: 11,
    color: C.textFaint,
    marginBottom: 4,
  },
  affiliateTileValue: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  affiliateValuePositive: {
    color: C.sage,
  },
  affiliateValuePending: {
    color: C.textDim,
  },
  affiliateProductRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  affiliateProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  affiliateProductMeta: {
    fontSize: 12,
    color: C.textDim,
    marginTop: 2,
  },
  affiliateProductRight: {
    alignItems: 'flex-end',
  },
  affiliateProductAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  affiliateProductStatus: {
    fontSize: 12,
    marginTop: 2,
    color: C.textDim,
  },
  affiliateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  affiliateCommissionBadge: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.sm,
  },
  affiliateCommissionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },
  affiliateExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  affiliateExpandText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  affiliateExpandChevron: {
    fontSize: 12,
    color: C.textDim,
  },
  affiliateGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  affiliateGroupRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affiliateGroupRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textDim,
  },
  affiliateDetailButton: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.sm,
    marginTop: 4,
  },
  affiliateDetailButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.accent,
  },
  productActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  affiliateEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    gap: 10,
  },
  affiliateStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.sm,
  },
  affiliateStatusReceived: {
    backgroundColor: C.sageBg,
  },
  affiliateStatusPending: {
    backgroundColor: C.surface2,
  },
  affiliateStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textDim,
  },
});
