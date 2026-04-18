import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { getCalendarCache, subscribeCalendarCache } from '../../../services/calendarCache';
import { getPartnerStoresCache, subscribePartnerStoresCache } from '../../../services/partnerStoresCache';
import { GiftPlan } from '../../../types/giftPlans';
import { LovedOne } from '../../../types/lovedOnes';
import { PartnerStore, ProductImportItem } from '../../../types/partnerStores';

type Promotion = {
  product: ProductImportItem;
  store: PartnerStore;
  discountPercent: number;
  currentPrice: number;
  originalPrice?: number;
};

type GiftDetailsTarget = {
  lovedOneId: string;
  giftPlanId: string;
};

type Props = {
  firstName: string;
  onOpenGift?: (target: GiftDetailsTarget) => void;
};

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(today.getDate()).padStart(2, '0')}`;
}

function dateKeyToDate(dateKey?: string) {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function daysUntil(dateKey?: string) {
  const date = dateKeyToDate(dateKey);
  const today = dateKeyToDate(getTodayKey());

  if (!date || !today) return null;

  const diff = date.getTime() - today.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function formatDate(dateKey?: string) {
  if (!dateKey) return '-';
  const [year, month, day] = dateKey.split('-');
  return `${day}.${month}.${year}`;
}

function formatMoney(value: number, currency = 'RON') {
  return `${value} ${currency}`;
}

function openProductLink(affiliateUrl?: string, productUrl?: string) {
  const targetUrl = affiliateUrl || productUrl;

  if (!targetUrl) return;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('OPEN PROMOTION LINK ERROR:', error);
  });
}

export default function HomeScreen({ firstName, onOpenGift }: Props) {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 760;
  const [loading, setLoading] = useState(true);
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [giftPlansByLovedOne, setGiftPlansByLovedOne] = useState<
    Record<string, GiftPlan[]>
  >({});
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);

  const load = async () => {
    try {
      if (!token) return;

      setLoading(true);
      const [calendarData, stores] = await Promise.all([
        getCalendarCache(token),
        getPartnerStoresCache(token),
      ]);

      setLovedOnes(calendarData.lovedOnes);
      setGiftPlansByLovedOne(calendarData.giftPlansByLovedOne);
      setPartnerStores(stores);
    } catch (error) {
      console.error('LOAD HOME ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!token) return;
    const unsubCalendar = subscribeCalendarCache(load);
    const unsubStores = subscribePartnerStoresCache(load);
    return () => {
      unsubCalendar();
      unsubStores();
    };
  }, [token]);

  const allGiftPlans = useMemo(() => {
    return lovedOnes.flatMap((lovedOne) =>
      (giftPlansByLovedOne[lovedOne.id] || []).map((giftPlan) => ({
        lovedOne,
        giftPlan,
      }))
    );
  }, [giftPlansByLovedOne, lovedOnes]);

  const activeGiftPlans = useMemo(
    () => allGiftPlans.filter(({ giftPlan }) => giftPlan.status !== 'completed'),
    [allGiftPlans]
  );

  const urgentBuyPlans = useMemo(() => {
    return activeGiftPlans
      .map((entry) => ({
        ...entry,
        daysLeft: daysUntil(
          entry.giftPlan.purchaseDeadlineDate || entry.giftPlan.deadlineDate
        ),
      }))
      .filter(
        (entry) =>
          entry.giftPlan.status === 'planned' &&
          entry.daysLeft !== null &&
          entry.daysLeft <= 14
      )
      .sort((a, b) => Number(a.daysLeft) - Number(b.daysLeft))
      .slice(0, 4);
  }, [activeGiftPlans]);

  const soonOfferPlans = useMemo(() => {
    return activeGiftPlans
      .map((entry) => ({
        ...entry,
        daysLeft: daysUntil(entry.giftPlan.deadlineDate),
      }))
      .filter(
        (entry) =>
          entry.daysLeft !== null &&
          entry.daysLeft >= 0 &&
          entry.daysLeft <= 30
      )
      .sort((a, b) => Number(a.daysLeft) - Number(b.daysLeft))
      .slice(0, 4);
  }, [activeGiftPlans]);

  const promotions = useMemo(() => {
    const allDiscounted = partnerStores
      .flatMap((store) =>
        store.products.map((product) => {
          const currentPrice = Number(product.price?.current);
          const discountPercent = Number(product.price?.discountPercent || 0);
          const originalPrice = Number(product.price?.original);

          if (
            !Number.isFinite(currentPrice) ||
            currentPrice <= 0 ||
            !product.price?.hasDiscount ||
            discountPercent <= 0
          ) {
            return null;
          }

          return {
            product,
            store,
            currentPrice,
            originalPrice: Number.isFinite(originalPrice)
              ? originalPrice
              : undefined,
            discountPercent,
          };
        })
      )
      .filter(Boolean) as Promotion[];

    return [...allDiscounted]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }, [partnerStores]);


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Se incarca pagina de start...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroBanner} />

      <View>
        <Text style={styles.title}>🎁 Acasa</Text>
        <Text style={styles.subtitle}>Bun venit, {firstName}.</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{activeGiftPlans.length}</Text>
        <Text style={styles.summaryLabel}>🎀 cadouri active</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛒 Ai de cumparat in curand</Text>
        {urgentBuyPlans.length === 0 ? (
          <Text style={styles.cardText}>
            Nu ai deadline-uri de cumparare urgente in urmatoarele 14 zile.
          </Text>
        ) : (
          urgentBuyPlans.map(({ lovedOne, giftPlan, daysLeft }) => (
            <Pressable
              key={`${lovedOne.id}-${giftPlan.id}-buy`}
              style={({ hovered, pressed }) => [
                styles.giftRow,
                hovered && styles.giftRowHover,
                pressed && styles.giftRowPressed,
              ]}
              onPress={() =>
                onOpenGift?.({
                  lovedOneId: lovedOne.id,
                  giftPlanId: giftPlan.id,
                })
              }
            >
              <View style={styles.giftInfo}>
                <Text style={styles.giftTitle}>{giftPlan.purpose}</Text>
                <Text style={styles.giftMeta}>
                  {lovedOne.name} - cumpara pana la{' '}
                  {formatDate(giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate)}
                </Text>
              </View>
              <Text style={styles.buyBadge}>
                {Number(daysLeft) < 0 ? 'intarziat' : `${daysLeft} zile`}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎉 Urmeaza sa oferi</Text>
        {soonOfferPlans.length === 0 ? (
          <Text style={styles.cardText}>
            Nu ai cadouri de oferit in urmatoarele 30 de zile.
          </Text>
        ) : (
          soonOfferPlans.map(({ lovedOne, giftPlan, daysLeft }) => (
            <Pressable
              key={`${lovedOne.id}-${giftPlan.id}-offer`}
              style={({ hovered, pressed }) => [
                styles.giftRow,
                hovered && styles.giftRowHover,
                pressed && styles.giftRowPressed,
              ]}
              onPress={() =>
                onOpenGift?.({
                  lovedOneId: lovedOne.id,
                  giftPlanId: giftPlan.id,
                })
              }
            >
              <View style={styles.giftInfo}>
                <Text style={styles.giftTitle}>{giftPlan.purpose}</Text>
                <Text style={styles.giftMeta}>
                  {lovedOne.name} - ofera pe {formatDate(giftPlan.deadlineDate)}
                </Text>
              </View>
              <Text style={styles.offerBadge}>
                {daysLeft === 0 ? 'azi' : `${daysLeft} zile`}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>🏷️ Promotii din magazine partenere</Text>
          <Text style={styles.sectionMeta}>{promotions.length} oferte</Text>
        </View>

        {promotions.length === 0 ? (
          <Text style={styles.cardText}>
            Nu sunt promotii importate momentan din magazinele partenere.
          </Text>
        ) : (
          promotions.map((promotion, index) => (
            <Pressable
              key={`${promotion.store.id}-${promotion.product.id || promotion.product.name}-${index}`}
              style={({ hovered, pressed }) => [
                styles.promotionRow,
                isCompact && styles.promotionRowCompact,
                hovered && styles.promotionRowHover,
                pressed && styles.promotionRowPressed,
              ]}
              onPress={() =>
                openProductLink(
                  promotion.product.affiliateUrl,
                  promotion.product.productUrl
                )
              }
              disabled={
                !promotion.product.affiliateUrl && !promotion.product.productUrl
              }
            >
              {promotion.product.imageUrl ? (
                <Image
                  source={{ uri: promotion.product.imageUrl }}
                  style={styles.productImage}
                />
              ) : (
                <View style={styles.productPlaceholder} />
              )}

              <View style={styles.promotionInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {promotion.product.name}
                </Text>
                <Text style={styles.productMeta} numberOfLines={1}>
                  {promotion.store.displayName}
                  {promotion.product.brand ? ` - ${promotion.product.brand}` : ''}
                </Text>
                {!!promotion.product.category && (
                  <Text style={styles.productMeta} numberOfLines={1}>
                    {promotion.product.category}
                    {promotion.product.subcategory
                      ? ` / ${promotion.product.subcategory}`
                      : ''}
                  </Text>
                )}
              </View>

              <View style={styles.priceBlock}>
                <Text style={styles.discountBadge}>
                  -{Math.round(promotion.discountPercent)}%
                </Text>
                <Text style={styles.productPrice}>
                  {formatMoney(promotion.currentPrice, promotion.store.currency)}
                </Text>
                {promotion.originalPrice !== undefined && (
                  <Text style={styles.originalPrice}>
                    {formatMoney(promotion.originalPrice, promotion.store.currency)}
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    backgroundColor: '#fff7ed',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 10,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#be123c',
    marginBottom: 2,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  heroBanner: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fce7e0',
    borderStyle: 'dashed',
    backgroundColor: '#fff1f2',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    padding: 14,
    shadowColor: '#be123c',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryValue: {
    color: '#be123c',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    shadowColor: '#be123c',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionMeta: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '700',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9ca3af',
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f9f1ee',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  giftRowHover: {
    backgroundColor: '#fff1f2',
    transform: [{ translateY: -1 }],
  },
  giftRowPressed: {
    transform: [{ scale: 0.99 }],
  },
  giftInfo: {
    flex: 1,
    minWidth: 0,
  },
  giftTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  giftMeta: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  buyBadge: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offerBadge: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#ccfbf1',
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  promotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f9f1ee',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 8,
  },
  promotionRowCompact: {
    alignItems: 'flex-start',
  },
  promotionRowHover: {
    backgroundColor: '#fff1f2',
    transform: [{ translateY: -1 }],
  },
  promotionRowPressed: {
    transform: [{ scale: 0.99 }],
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  productPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  promotionInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  productMeta: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 3,
    maxWidth: 110,
  },
  discountBadge: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productPrice: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '700',
  },
  originalPrice: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
});
