import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import { getPartnerStoresCache, subscribePartnerStoresCache } from '../../../services/partnerStoresCache';
import { pushAppBackEntry } from '../../../services/navigationHistory';
import { PartnerStore } from '../../../types/partnerStores';
import { C, R, S } from '../../../constants/theme';

function buildStoreUrl(domain?: string) {
  const cleanDomain = String(domain || '').trim();

  if (!cleanDomain) return '';
  if (/^https?:\/\//i.test(cleanDomain)) return cleanDomain;

  return `https://${cleanDomain}`;
}

function openProductLink(affiliateUrl?: string, productUrl?: string) {
  const targetUrl = affiliateUrl || productUrl;

  if (!targetUrl) return;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('OPEN PRODUCT LINK ERROR:', error);
  });
}

function openStoreLink(domain?: string) {
  const targetUrl = buildStoreUrl(domain);

  if (!targetUrl) return;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('OPEN STORE LINK ERROR:', error);
  });
}

function formatDateKey(value?: string) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(value || ''));

  if (!match) return '-';

  return `${match[3]}.${match[2]}.${match[1]}`;
}

function shuffleProducts<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function pickFeaturedProducts(store: PartnerStore) {
  const discountedProducts = shuffleProducts(
    store.products.filter(
      (product) =>
        product.price?.hasDiscount ||
        Number(product.price?.discountPercent || 0) > 0 ||
        Number(product.price?.discount || 0) > 0
    )
  );
  const regularProducts = shuffleProducts(
    store.products.filter((product) => !discountedProducts.includes(product))
  );

  return [...discountedProducts, ...regularProducts].slice(0, 5);
}

type Props = {
  resetRef?: React.MutableRefObject<(() => void) | null>;
};

export default function PartnerStoresScreen({ resetRef }: Props) {
  const { token } = useAuth();
  const [stores, setStores] = useState<PartnerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<PartnerStore | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<PartnerStore['products']>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const selectedStoreBackRef = useRef<ReturnType<typeof pushAppBackEntry> | null>(null);

  useEffect(() => {
    if (!selectedStore) return;

    const entry = pushAppBackEntry(() => {
      setSelectedStore(null);
    });
    selectedStoreBackRef.current = entry;

    return () => {
      entry.remove();
      if (selectedStoreBackRef.current === entry) {
        selectedStoreBackRef.current = null;
      }
    };
  }, [selectedStore?.id]);

  const goBackFromStore = () => {
    if (selectedStoreBackRef.current?.goBack()) return;
    setSelectedStore(null);
  };

  useEffect(() => {
    if (!resetRef) return;

    const resetHandler = () => {
      selectedStoreBackRef.current?.remove();
      selectedStoreBackRef.current = null;
      setSelectedStore(null);
      setFeaturedProducts([]);
      setSearchText('');
      setSelectedCategory('all');
    };

    resetRef.current = resetHandler;

    return () => {
      if (resetRef.current === resetHandler) {
        resetRef.current = null;
      }
    };
  }, [resetRef]);

  const loadStores = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const data = await getPartnerStoresCache(token, { forceRefresh: true });
      setStores(data);
    } catch (error) {
      console.error('LOAD PARTNER STORES ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
    if (!token) return;
    return subscribePartnerStoresCache(loadStores);
  }, [token]);

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

      const searchableText = [
        store.displayName,
        store.companyName,
        store.source,
        store.merchant?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [searchText, selectedCategory, stores]);

  const getCategoryProductCount = (store: PartnerStore) => {
    if (selectedCategory === 'all') {
      return store.products.length;
    }

    return store.products.filter(
      (product) =>
        String(product.category || '').trim().toLowerCase() ===
        selectedCategory.toLowerCase()
    ).length;
  };

  const openStoreDetails = (store: PartnerStore) => {
    setSelectedStore(store);
    setFeaturedProducts(pickFeaturedProducts(store));
  };

  if (selectedStore) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={goBackFromStore}>
          <Text style={styles.backButtonText}>Inapoi la magazine</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.storeHero}>
            {selectedStore.brandImageUri ? (
              <Image source={{ uri: selectedStore.brandImageUri }} style={styles.brandImageLarge} />
            ) : (
              <View style={styles.brandPlaceholderLarge}>
                <Text style={styles.brandPlaceholderText}>
                  {selectedStore.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.storeDetailTitle}>{selectedStore.displayName}</Text>
          {!!selectedStore.merchant?.domain && (
            <Pressable
              style={styles.storeLinkButton}
              onPress={() => openStoreLink(selectedStore.merchant?.domain)}
            >
              <Text style={styles.storeLinkButtonText}>Mergi pe magazin</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Produse recomandate
          </Text>

          {selectedStore.products.length === 0 ? (
            <Text style={styles.cardText}>
              Magazinul nu are produse importate momentan.
            </Text>
          ) : (
            featuredProducts.map((product, index) => (
              <Pressable
                key={`${product.id || product.sku || product.name}-${index}`}
                style={({ pressed }) => [
                  styles.productRow,
                  pressed && styles.productRowPressed,
                ]}
                onPress={() => openProductLink(product.affiliateUrl, product.productUrl)}
                disabled={!product.affiliateUrl && !product.productUrl}
              >
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Text style={styles.productImagePlaceholderText}>
                      {String(product.name || '').charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  {!!product.brand && (
                    <Text style={styles.productMeta}>{product.brand}</Text>
                  )}
                  {!!product.category && (
                    <Text style={styles.productMeta}>
                      {product.category}
                      {product.subcategory ? ` · ${product.subcategory}` : ''}
                    </Text>
                  )}
                  {!!product.availability?.stockStatus && (
                    <Text style={styles.productMeta}>
                      Stoc: {product.availability.stockStatus}
                    </Text>
                  )}
                  {!!product.affiliateUrl && (
                    <Text style={styles.productLinkText}>Deschide oferta →</Text>
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
                  {product.price?.hasDiscount && (
                    <Text style={styles.discountBadge}>Reducere</Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Magazine partenere</Text>

      <View style={styles.filtersCard}>
        <TextInput
          placeholder="Cauta dupa numele magazinului"
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.cardText}>Se incarca magazinele...</Text>
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Magazine disponibile</Text>
          <Text style={styles.cardText}>
            Nu exista magazine partenere disponibile momentan.
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
            style={({ hovered, pressed }) => [
              styles.storeCard,
              hovered && styles.storeCardHover,
              pressed && styles.storeCardPressed,
            ]}
            onPress={() => openStoreDetails(store)}
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
              {!!store.merchant?.domain && (
                <Text style={styles.meta}>Website: {store.merchant.domain}</Text>
              )}
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, backgroundColor: C.bg, paddingBottom: 32 },
  center: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
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
  },
  clearFiltersButton: {
    backgroundColor: C.accentSoft,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: C.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  cardTitle: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 8,
    color: C.text,
  },
  cardText: { fontSize: 14, lineHeight: 21, color: C.textFaint },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: C.surface2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: R.pill,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  backButtonText: {
    color: C.textDim,
    fontWeight: '600',
    fontSize: 14,
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
  storeCardHover: {
    backgroundColor: C.surface2,
    transform: [{ translateY: -2 }],
  },
  storeCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  brandImage: {
    width: 68,
    height: 68,
    borderRadius: R.md,
    resizeMode: 'contain',
    backgroundColor: C.surface2,
  },
  storeHero: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  brandImageLarge: {
    width: 160,
    height: 160,
    borderRadius: R.lg,
    resizeMode: 'contain',
    backgroundColor: C.surface2,
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
  brandPlaceholderLarge: {
    width: 160,
    height: 160,
    borderRadius: R.lg,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPlaceholderText: {
    fontFamily: 'serif',
    color: C.accent,
    fontSize: 48,
    fontWeight: '400',
  },
  storeInfo: { flex: 1 },
  storeName: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 17,
    fontWeight: '400',
    marginBottom: 4,
  },
  meta: {
    color: C.textFaint,
    fontSize: 13,
    marginBottom: 4,
  },
  storeDetailTitle: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '400',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  storeLinkButton: {
    marginTop: 4,
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  storeLinkButtonText: {
    color: C.accentInk,
    fontSize: 14,
    fontWeight: '600',
  },
  productRow: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  productRowPressed: {
    opacity: 0.75,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: R.md,
    backgroundColor: C.surface2,
  },
  productImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: R.md,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  productImagePlaceholderText: {
    fontSize: 22,
    fontFamily: 'serif',
    color: C.accent,
    fontWeight: '500',
  },
  productInfo: { flex: 1 },
  productName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
  },
  productMeta: {
    color: C.textFaint,
    fontSize: 13,
    marginTop: 2,
  },
  productLinkText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  priceBlock: {
    alignItems: 'flex-end',
    maxWidth: 96,
  },
  productPrice: {
    color: C.sage,
    fontSize: 14,
    fontWeight: '600',
  },
  originalPrice: {
    color: C.textFaint,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  discountBadge: {
    overflow: 'hidden',
    borderRadius: R.pill,
    backgroundColor: C.accentSoft,
    color: C.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
