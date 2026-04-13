import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
      <Text style={styles.title}>Magazine Partenere</Text>

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
      ) : (
        stores.map((store) => (
          <Pressable
            key={store.id}
            style={styles.storeCard}
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
              <Text style={styles.meta}>Produse: {store.products.length}</Text>
              <Text style={styles.meta}>Contract pana la {store.contractEndDate}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#111827' },
  cardText: { fontSize: 15, lineHeight: 22, color: '#374151' },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#111827',
    fontWeight: '800',
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
  brandImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 14,
  },
  brandPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
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
  storeInfo: { flex: 1 },
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
  productInfo: { flex: 1 },
  productName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  productMeta: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  productLinkText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
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
});
