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
import { useAuth } from '../../../context/AuthContext';
import {
  createPartnerStore,
  getPartnerStores,
  importPartnerStoreProducts,
} from '../../../services/partnerStoresApi';
import {
  PartnerProductsImportPayload,
  PartnerStore,
} from '../../../types/partnerStores';

function openProductLink(affiliateUrl?: string, productUrl?: string) {
  const targetUrl = affiliateUrl || productUrl;

  if (!targetUrl) return;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('OPEN PRODUCT LINK ERROR:', error);
  });
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

export default function PartnerStoresScreen() {
  const { token } = useAuth();
  const [stores, setStores] = useState<PartnerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [cui, setCui] = useState('');
  const [tradeRegisterNumber, setTradeRegisterNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [brandImageUri, setBrandImageUri] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const selectedStore = useMemo(() => {
    return stores.find((store) => store.id === selectedStoreId) || null;
  }, [selectedStoreId, stores]);

  const loadStores = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const data = await getPartnerStores(token);
      setStores(data);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut prelua magazinele.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [token]);

  const resetForm = () => {
    setCompanyName('');
    setCui('');
    setTradeRegisterNumber('');
    setDisplayName('');
    setContractStartDate('');
    setContractEndDate('');
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

    if (!isValidDateKey(contractStartDate) || !isValidDateKey(contractEndDate)) {
      setError('Perioada contractuala trebuie completata in format YYYY-MM-DD.');
      return;
    }

    if (contractEndDate < contractStartDate) {
      setError('Data de final nu poate fi inaintea datei de inceput.');
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

      setStores((current) => [savedStore, ...current]);
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

          setStores((current) =>
            current.map((store) =>
              store.id === selectedStore.id ? updatedStore : store
            )
          );
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
        <Pressable style={styles.secondaryButton} onPress={() => setSelectedStoreId(null)}>
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
            Contract: {selectedStore.contractStartDate} - {selectedStore.contractEndDate}
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
              onPress={() => openProductLink(product.affiliateUrl, product.productUrl)}
              disabled={!product.affiliateUrl && !product.productUrl}
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

      {stores.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nu exista magazine partenere</Text>
          <Text style={styles.cardText}>
            Adauga primul magazin pentru a putea importa catalogul de produse.
          </Text>
        </View>
      ) : (
        stores.map((store) => (
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
              <Text style={styles.meta}>Contract pana la {store.contractEndDate}</Text>
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
        <View style={styles.overlay}>
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
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="Start YYYY-MM-DD"
                  value={contractStartDate}
                  onChangeText={(value) => {
                    setContractStartDate(value);
                    if (error) setError('');
                  }}
                />
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="Final YYYY-MM-DD"
                  value={contractEndDate}
                  onChangeText={(value) => {
                    setContractEndDate(value);
                    if (error) setError('');
                  }}
                />
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
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  brandImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  brandPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
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
  dateRow: {
    flexDirection: 'row',
    gap: 10,
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
});
