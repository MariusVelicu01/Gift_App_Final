import React, { useEffect, useMemo, useState } from 'react';
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
import { getPartnerStores } from '../../../services/partnerStoresApi';
import { PartnerStore } from '../../../types/partnerStores';

function openProductLink(affiliateUrl?: string, productUrl?: string) {
  const targetUrl = affiliateUrl || productUrl;

  if (!targetUrl) return;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('OPEN PRODUCT LINK ERROR:', error);
  });
}

export default function PartnerStoresScreen() {
  const { token } = useAuth();
  const [stores, setStores] = useState<PartnerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<PartnerStore | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadStores = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const data = await getPartnerStores(token);
      setStores(data);
    } catch (error) {
      console.error('LOAD PARTNER STORES ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
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
        store.merchant?.domain,
        store.merchant?.affiliateNetwork,
        ...store.products.flatMap((product) => [
          product.name,
          product.brand,
          product.category,
          product.subcategory,
        ]),
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

  if (selectedStore) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => setSelectedStore(null)}>
          <Text style={styles.backButtonText}>Inapoi la magazine</Text>
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
          <Text style={styles.meta}>Contract activ pana la {selectedStore.contractEndDate}</Text>
          <Text style={styles.meta}>Produse disponibile: {selectedStore.products.length}</Text>
          {!!selectedStore.merchant?.domain && (
            <Text style={styles.meta}>Website: {selectedStore.merchant.domain}</Text>
          )}
          {!!selectedStore.merchant?.affiliateNetwork && (
            <Text style={styles.meta}>
              Retea afiliere: {selectedStore.merchant.affiliateNetwork}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Produse</Text>

          {selectedStore.products.length === 0 ? (
            <Text style={styles.cardText}>
              Magazinul nu are produse importate momentan.
            </Text>
          ) : (
            selectedStore.products.slice(0, 20).map((product, index) => (
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
                  {!!product.availability?.stockStatus && (
                    <Text style={styles.productMeta}>
                      Stoc: {product.availability.stockStatus}
                    </Text>
                  )}
                  {!!product.affiliateUrl && (
                    <Text style={styles.productLinkText}>Deschide oferta afiliata</Text>
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
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🛍️ Magazine partenere</Text>

      <View style={styles.filtersCard}>
        <TextInput
          placeholder="Cauta dupa magazin, brand, produs sau domeniu"
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
            onPress={() => setSelectedStore(store)}
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
              <Text style={styles.meta}>
                Produse: {getCategoryProductCount(store)}
                {selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}
              </Text>
              <Text style={styles.meta}>Contract pana la {store.contractEndDate}</Text>
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
  container: { padding: 16, gap: 16, backgroundColor: '#fff7ed', paddingBottom: 32 },
  center: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#be123c', marginBottom: 2 },
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
  filtersCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    backgroundColor: '#ffffff',
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
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111827' },
  cardText: { fontSize: 14, lineHeight: 21, color: '#9ca3af' },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
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
  storeCardHover: {
    backgroundColor: '#f0fdfa',
    transform: [{ translateY: -2 }],
  },
  storeCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  brandImage: {
    width: 68,
    height: 68,
    borderRadius: 10,
  },
  brandImageLarge: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginBottom: 14,
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
  brandPlaceholderLarge: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  brandPlaceholderText: {
    color: '#0d9488',
    fontSize: 28,
    fontWeight: '800',
  },
  storeInfo: { flex: 1 },
  storeName: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  productRow: {
    borderTopWidth: 1,
    borderTopColor: '#f9f1ee',
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  productInfo: { flex: 1 },
  productName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  productMeta: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  productLinkText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  priceBlock: {
    alignItems: 'flex-end',
    maxWidth: 96,
  },
  productPrice: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '700',
  },
  originalPrice: {
    color: '#d1d5db',
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
    fontWeight: '500',
  },
  discountText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
