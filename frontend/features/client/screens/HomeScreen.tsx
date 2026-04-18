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
import { C, R, S } from '../../../constants/theme';

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
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function dateKeyToDate(dateKey?: string) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function daysUntil(dateKey?: string) {
  const date = dateKeyToDate(dateKey);
  const today = dateKeyToDate(getTodayKey());
  if (!date || !today) return null;
  return Math.floor((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
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
  const [giftPlansByLovedOne, setGiftPlansByLovedOne] = useState<Record<string, GiftPlan[]>>({});
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
    return () => { unsubCalendar(); unsubStores(); };
  }, [token]);

  const allGiftPlans = useMemo(() => {
    return lovedOnes.flatMap((lovedOne) =>
      (giftPlansByLovedOne[lovedOne.id] || []).map((giftPlan) => ({ lovedOne, giftPlan }))
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
        daysLeft: daysUntil(entry.giftPlan.purchaseDeadlineDate || entry.giftPlan.deadlineDate),
      }))
      .filter((entry) => entry.giftPlan.status === 'planned' && entry.daysLeft !== null && entry.daysLeft <= 14)
      .sort((a, b) => Number(a.daysLeft) - Number(b.daysLeft))
      .slice(0, 4);
  }, [activeGiftPlans]);

  const soonOfferPlans = useMemo(() => {
    return activeGiftPlans
      .map((entry) => ({ ...entry, daysLeft: daysUntil(entry.giftPlan.deadlineDate) }))
      .filter((entry) => entry.daysLeft !== null && entry.daysLeft >= 0 && entry.daysLeft <= 30)
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
          if (!Number.isFinite(currentPrice) || currentPrice <= 0 || !product.price?.hasDiscount || discountPercent <= 0) return null;
          return { product, store, currentPrice, originalPrice: Number.isFinite(originalPrice) ? originalPrice : undefined, discountPercent };
        })
      )
      .filter(Boolean) as Promotion[];
    return [...allDiscounted].sort(() => Math.random() - 0.5).slice(0, 5);
  }, [partnerStores]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Se incarca pagina de start...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hero greeting */}
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>Bun venit</Text>
        <Text style={styles.heroTitle}>
          {firstName},{' '}
          <Text style={styles.heroAccent}>{activeGiftPlans.length} cadouri active</Text>
        </Text>
        <Text style={styles.heroSub}>asteapta atentia ta.</Text>
      </View>

      {/* Stat card */}
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{activeGiftPlans.length}</Text>
        <Text style={styles.statLabel}>cadouri active</Text>
      </View>

      {/* Buy soon */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>De cumparat in curand</Text>
        </View>
        {urgentBuyPlans.length === 0 ? (
          <Text style={styles.cardText}>Nu ai deadline-uri de cumparare urgente in urmatoarele 14 zile.</Text>
        ) : (
          urgentBuyPlans.map(({ lovedOne, giftPlan, daysLeft }) => (
            <Pressable
              key={`${lovedOne.id}-${giftPlan.id}-buy`}
              style={({ hovered, pressed }) => [
                styles.giftRow,
                hovered && styles.giftRowHover,
                pressed && styles.giftRowPressed,
              ]}
              onPress={() => onOpenGift?.({ lovedOneId: lovedOne.id, giftPlanId: giftPlan.id })}
            >
              <View style={styles.giftInfo}>
                <Text style={styles.giftTitle}>{giftPlan.purpose}</Text>
                <Text style={styles.giftMeta}>
                  {lovedOne.name} · pana la {formatDate(giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate)}
                </Text>
              </View>
              <View style={styles.buyBadge}>
                <Text style={styles.buyBadgeText}>
                  {Number(daysLeft) < 0 ? 'intarziat' : `${daysLeft}z`}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {/* Offer soon */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Urmeaza sa oferi</Text>
        </View>
        {soonOfferPlans.length === 0 ? (
          <Text style={styles.cardText}>Nu ai cadouri de oferit in urmatoarele 30 de zile.</Text>
        ) : (
          soonOfferPlans.map(({ lovedOne, giftPlan, daysLeft }) => (
            <Pressable
              key={`${lovedOne.id}-${giftPlan.id}-offer`}
              style={({ hovered, pressed }) => [
                styles.giftRow,
                hovered && styles.giftRowHover,
                pressed && styles.giftRowPressed,
              ]}
              onPress={() => onOpenGift?.({ lovedOneId: lovedOne.id, giftPlanId: giftPlan.id })}
            >
              <View style={styles.giftInfo}>
                <Text style={styles.giftTitle}>{giftPlan.purpose}</Text>
                <Text style={styles.giftMeta}>
                  {lovedOne.name} · pe {formatDate(giftPlan.deadlineDate)}
                </Text>
              </View>
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>
                  {daysLeft === 0 ? 'azi' : `${daysLeft}z`}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {/* Promotions */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Promotii din magazine partenere</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{promotions.length} oferte</Text>
          </View>
        </View>

        {promotions.length === 0 ? (
          <Text style={styles.cardText}>Nu sunt promotii importate momentan.</Text>
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
              onPress={() => openProductLink(promotion.product.affiliateUrl, promotion.product.productUrl)}
              disabled={!promotion.product.affiliateUrl && !promotion.product.productUrl}
            >
              {promotion.product.imageUrl ? (
                <Image source={{ uri: promotion.product.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={styles.productPlaceholder} />
              )}

              <View style={styles.promotionInfo}>
                <Text style={styles.productName} numberOfLines={1}>{promotion.product.name}</Text>
                <Text style={styles.productMeta} numberOfLines={1}>
                  {promotion.store.displayName}{promotion.product.brand ? ` · ${promotion.product.brand}` : ''}
                </Text>
                {!!promotion.product.category && (
                  <Text style={styles.productMeta} numberOfLines={1}>
                    {promotion.product.category}{promotion.product.subcategory ? ` / ${promotion.product.subcategory}` : ''}
                  </Text>
                )}
              </View>

              <View style={styles.priceBlock}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>-{Math.round(promotion.discountPercent)}%</Text>
                </View>
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
    gap: 14,
    paddingBottom: 32,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: C.bg,
  },
  loadingText: {
    color: C.textDim,
    marginTop: 10,
    fontWeight: '500',
  },

  // Hero
  hero: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  heroKicker: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.textFaint,
    fontWeight: '500',
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '400',
    color: C.text,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroAccent: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: C.accent,
  },
  heroSub: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '400',
    color: C.text,
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  // Stat card
  statCard: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: R.xl,
    gap: 4,
  },
  statValue: {
    fontFamily: 'serif',
    fontSize: 36,
    fontWeight: '400',
    color: C.accentInk,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: C.text,
    letterSpacing: -0.2,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textDim,
  },
  countPill: {
    backgroundColor: C.surface2,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textDim,
  },

  // Gift rows
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: R.sm,
  },
  giftRowHover: {
    backgroundColor: C.accentSoft,
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
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
  },
  giftMeta: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '400',
  },
  buyBadge: {
    backgroundColor: C.warnBg,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  buyBadgeText: {
    color: C.warn,
    fontSize: 11,
    fontWeight: '600',
  },
  offerBadge: {
    backgroundColor: C.sageBg,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerBadgeText: {
    color: C.sage,
    fontSize: 11,
    fontWeight: '600',
  },

  // Promotions
  promotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: R.sm,
  },
  promotionRowCompact: {
    alignItems: 'flex-start',
  },
  promotionRowHover: {
    backgroundColor: C.accentSoft,
    transform: [{ translateY: -1 }],
  },
  promotionRowPressed: {
    transform: [{ scale: 0.99 }],
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    backgroundColor: C.surface2,
  },
  productPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    backgroundColor: C.surface2,
  },
  promotionInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    color: C.text,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 3,
  },
  productMeta: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 3,
    maxWidth: 110,
  },
  discountBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountBadgeText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  productPrice: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 13,
    fontWeight: '500',
  },
  originalPrice: {
    color: C.textFaint,
    fontSize: 11,
    fontWeight: '400',
    textDecorationLine: 'line-through',
  },
});
