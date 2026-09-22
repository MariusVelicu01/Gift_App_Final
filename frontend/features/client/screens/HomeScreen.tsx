import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { openUrl } from '../../../utils/openUrl';
import { useAuth } from '../../../context/AuthContext';
import { getCalendarCache, subscribeCalendarCache } from '../../../services/calendarCache';
import { getPartnerStoresCache, subscribePartnerStoresCache } from '../../../services/partnerStoresCache';
import { GiftPlan } from '../../../types/giftPlans';
import { LovedOne } from '../../../types/lovedOnes';
import { PartnerStore, ProductImportItem } from '../../../types/partnerStores';
import { C, R, S } from '../../../constants/theme';
import RevealIn from '../../../components/landing/RevealIn';
import ClientFooter from '../components/ClientFooter';
import type { ClientTab } from './ClientDashboard';
import GiftMascot from '../../../components/landing/GiftMascot';
import AnimatedGiftIcon from '../../../components/landing/AnimatedGiftIcon';
import DriftBlob from '../../../components/landing/DriftBlob';
import PartnerOffersCarousel from '../components/PartnerOffersCarousel';

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
  lastName?: string;
  userGender?: string;
  onOpenGift?: (target: GiftDetailsTarget) => void;
  onNavigateTab?: (tab: ClientTab) => void;
};

function profileGenderToProductGender(g?: string): 'barbati' | 'femei' | null {
  if (!g) return null;
  const lower = g.toLowerCase();
  if (lower === 'masculin' || lower === 'male') return 'barbati';
  if (lower === 'feminin' || lower === 'female') return 'femei';
  return null;
}

function sortProductsByGender(products: any[], userProductGender: 'barbati' | 'femei' | null) {
  if (!userProductGender) return products;
  const opposite = userProductGender === 'barbati' ? 'femei' : 'barbati';
  const primary: any[] = [];
  const opp: any[] = [];
  products.forEach(p => {
    const g = (p.product?.gender || p.gender || 'unisex') as string;
    if (g === opposite) opp.push(p);
    else primary.push(p); // matching or unisex
  });
  const shuffled = [...primary].sort(() => Math.random() - 0.5);
  const result: any[] = [];
  shuffled.forEach((item, i) => {
    result.push(item);
    if ((i + 1) % 5 === 0 && opp.length > 0) result.push(opp.splice(0, 1)[0]);
  });
  return result;
}

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
  if (!Number.isFinite(value)) return `- ${currency}`;
  return `${Number(value.toFixed(2))} ${currency}`;
}

function openProductLink(affiliateUrl?: string, productUrl?: string) {
  const targetUrl = affiliateUrl || productUrl;
  if (!targetUrl) return;
  openUrl(targetUrl);
}

export default function HomeScreen({ firstName, lastName, userGender, onOpenGift, onNavigateTab }: Props) {
  const userProductGender = profileGenderToProductGender(userGender);
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 760;
  const isNarrow = width < 960;
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
    const shuffled = [...allDiscounted].sort(() => Math.random() - 0.5);
    return sortProductsByGender(shuffled, userProductGender).slice(0, 8);
  }, [partnerStores, userProductGender]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Se incarca pagina de start...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, isNarrow && styles.containerFlush]}>
      {(() => {
        const heroCardEl = (
          <View style={[styles.heroCard, isCompact && styles.heroCardCompact, !isCompact && styles.heroCardWide]}>
            <View style={styles.heroCopy}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Bun venit</Text>
              </View>
              <Text style={styles.heroTitle}>
                {firstName}{lastName ? ` ${lastName}` : ''}
              </Text>
              <Text style={styles.heroSub}>
                {activeGiftPlans.length > 0 ? (
                  <>
                    Ai{' '}
                    <Text style={styles.heroSubAccent}>
                      {activeGiftPlans.length}{' '}
                      {activeGiftPlans.length === 1 ? 'cadou activ' : 'cadouri active'}
                    </Text>{' '}
                    care asteapta atentia ta.
                  </>
                ) : (
                  'Niciun cadou activ momentan — e un moment bun sa mai adaugi unul.'
                )}
              </Text>
            </View>

            {isCompact && (
              <View style={styles.heroMascotBlock}>
                <GiftMascot size={64} mood={urgentBuyPlans.length > 0 ? 'building' : 'idle'} />
                <Text style={styles.heroMascotCaption}>
                  {activeGiftPlans.length} {activeGiftPlans.length === 1 ? 'activ' : 'active'}
                </Text>
              </View>
            )}
          </View>
        );

        const brandStripEl = (
          <View style={[styles.brandStrip, isCompact && styles.brandStripCompact, !isCompact && styles.brandStripWide]}>
            {!isCompact && (
              <>
                <DriftBlob style={styles.brandBlobLeft} driftX={14} driftY={10} duration={5200} />
                <DriftBlob style={styles.brandBlobRight} driftX={-16} driftY={-8} duration={6600} />
                <View style={styles.brandStripCenterWrap} pointerEvents="none">
                  <Text style={styles.brandStripCenterText}>PresentPerfect</Text>
                </View>
              </>
            )}

            <View style={styles.brandStripTop}>
              <View style={styles.brandStripCopy}>
                <Text style={styles.brandStripHeadline}>
                  Cadoul potrivit.{'\n'}
                  <Text style={styles.brandStripHeadlineAccent}>La timpul potrivit.</Text>
                </Text>
              </View>
              {!isCompact && <AnimatedGiftIcon size={80} />}
            </View>
          </View>
        );

        return isCompact ? (
          <>
            <RevealIn delay={0}>{brandStripEl}</RevealIn>
            <RevealIn delay={80}>{heroCardEl}</RevealIn>
          </>
        ) : (
          <View style={styles.topRow}>
            <RevealIn delay={0} style={styles.topRowItem}>{heroCardEl}</RevealIn>
            <RevealIn delay={80} style={styles.topRowItem}>{brandStripEl}</RevealIn>
          </View>
        );
      })()}

      {/* Buy soon + Offer soon */}
      <View style={[styles.twoColRow, !isCompact && styles.twoColRowWide]}>
        <RevealIn delay={160} style={!isCompact && styles.twoColItem}>
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
        </RevealIn>

        <RevealIn delay={240} style={!isCompact && styles.twoColItem}>
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
        </RevealIn>
      </View>

      {/* Promotions + partner banners */}
      <View style={[styles.twoColRow, !isCompact && styles.twoColRowWide]}>
        <RevealIn delay={320} style={!isCompact && styles.twoColItem}>
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
        </RevealIn>

        <RevealIn delay={400} style={!isCompact && styles.twoColItem}>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Bannere magazine partenere</Text>
            <View style={styles.demoPill}>
              <Text style={styles.demoPillText}>DEMO</Text>
            </View>
          </View>
          <PartnerOffersCarousel arrows={false} />
        </View>
        </RevealIn>
      </View>

      <ClientFooter onNavigate={onNavigateTab} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 32,
    backgroundColor: C.bg,
  },
  containerFlush: {
    paddingHorizontal: 0,
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

  brandStrip: {
    backgroundColor: '#0b0508',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: R.xl,
    gap: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  brandStripCompact: {
    gap: 0,
  },
  brandStripTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandStripCopy: {
    flexShrink: 1,
  },
  brandStripHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fdf2f4',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  brandStripHeadlineAccent: {
    color: '#ff4d6d',
  },
  brandBlobLeft: {
    position: 'absolute',
    top: -40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,77,109,0.16)',
  },
  brandBlobRight: {
    position: 'absolute',
    bottom: -50,
    right: 40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(253,242,244,0.06)',
  },
  brandStripCenterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandStripCenterText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  brandStripWide: {
    flex: 1,
    justifyContent: 'center',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  topRowItem: {
    flex: 1,
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.surface,
    padding: 18,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
  },
  heroCardCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  heroCardWide: {
    flex: 1,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: R.pill,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '400',
    color: C.text,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    color: C.textDim,
    marginTop: 2,
    lineHeight: 20,
  },
  heroSubAccent: {
    color: C.accent,
    fontWeight: '700',
  },

  heroMascotBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: C.accentSoft,
    borderRadius: R.xl,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 116,
  },
  heroMascotCaption: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.accent,
    fontWeight: '700',
  },

  twoColRow: {
    gap: 14,
  },
  twoColRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  twoColItem: {
    flex: 1,
  },

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
  demoPill: {
    backgroundColor: C.warnBg,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.warn,
    letterSpacing: 0.5,
  },

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
