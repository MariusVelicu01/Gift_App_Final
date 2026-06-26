import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarCacheData } from './calendarCache';
import { PartnerStore } from '../types/partnerStores';
import { PriceAlert } from '../types/priceAlerts';

const LAST_PRICES_KEY = 'gift_app_price_observer_v3';
const READ_ALERTS_KEY = 'gift_app_price_observer_read';

export async function markObserverAlertRead(id: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(READ_ALERTS_KEY);
    const reads: Record<string, string> = stored ? JSON.parse(stored) : {};
    reads[id] = new Date().toISOString();
    await AsyncStorage.setItem(READ_ALERTS_KEY, JSON.stringify(reads));
  } catch {}
}

async function getReadAlerts(): Promise<Record<string, string>> {
  try {
    const stored = await AsyncStorage.getItem(READ_ALERTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function norm(value?: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ™®©]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' '); 
}

function crossStoreKey(name?: string, brand?: string): string {
  const n = norm(name);
  const b = norm(brand);
  return b ? `${n}|${b}` : n;
}

type BestOffer = {
  price: number;
  storeId: string;
  storeName: string;
  productName: string;
  currency: string;
};

function buildBestPriceMap(partnerStores: PartnerStore[]): Map<string, BestOffer> {
  const map = new Map<string, BestOffer>();

  partnerStores.forEach((store) => {
    const pi = (store as any).promotionIndicator;

    (store.products || []).forEach((product) => {
      const currentPrice = Number(product.price?.current);
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) return;

      const promo = product.promo?.code ? product.promo : (
        pi?.hasPromotion && pi.code ? {
          hasPromoCode: true,
          code: pi.code,
          discountPercent: pi.discountPercent,
          hasMinimumOrderValue: pi.hasMinimumOrderValue,
          minimumOrderValue: pi.minimumOrderValue,
        } : null
      );

      let effectivePrice = currentPrice;
      if (promo?.code && promo.discountPercent && !promo.hasMinimumOrderValue) {
        effectivePrice = Math.round((currentPrice * (1 - promo.discountPercent / 100)) * 100) / 100;
      }

      const key = crossStoreKey(product.name, product.brand);
      if (!key) return;

      const existing = map.get(key);
      if (!existing || effectivePrice < existing.price) {
        map.set(key, {
          price: effectivePrice,
          storeId: store.id,
          storeName: store.displayName,
          productName: product.name,
          currency: store.currency || 'RON',
        });
      }
    });
  });

  return map;
}

export async function generatePriceChangeAlerts(
  calendarData: CalendarCacheData,
  partnerStores: PartnerStore[]
): Promise<PriceAlert[]> {
  const bestPriceMap = buildBestPriceMap(partnerStores);
  if (bestPriceMap.size === 0) return [];

  let lastPrices: Record<string, number> = {};
  try {
    const stored = await AsyncStorage.getItem(LAST_PRICES_KEY);
    if (stored) lastPrices = JSON.parse(stored);
  } catch {}

  const alerts: PriceAlert[] = [];
  const updatedPrices: Record<string, number> = {};
  const reads = await getReadAlerts();

  for (const lovedOne of calendarData.lovedOnes) {
    if (lovedOne.isDeleted) continue;
    const plans = calendarData.giftPlansByLovedOne[lovedOne.id] || [];

    for (const plan of plans) {
      if (plan.status !== 'planned') continue;

      for (const product of (plan.selectedProducts || [])) {
        if (product.isPurchased) continue;

        const key = crossStoreKey(product.name, product.brand);
        if (!key) continue;

        const bestOffer = bestPriceMap.get(key);
        if (!bestOffer) continue;

        const storageKey = `${plan.id}__${key}`;
        const lastPrice = lastPrices[storageKey];
        updatedPrices[storageKey] = bestOffer.price;

        if (lastPrice !== undefined) {
          const changeAmount = Number((bestOffer.price - lastPrice).toFixed(2));
          if (Math.abs(changeAmount) >= 0.01) {
            const alertId = [
              'price-obs',
              plan.id.slice(-8),
              key.slice(0, 30),
              Math.round(bestOffer.price * 100),
            ].join('-').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 180);

            alerts.push({
              id: alertId,
              type: 'price_change',
              notificationKind: 'price' as any,
              lovedOneId: lovedOne.id,
              lovedOneName: lovedOne.name,
              giftPlanId: plan.id,
              giftPurpose: plan.purpose || '',
              productId: product.id || key,
              productKey: key,
              productName: product.name || bestOffer.productName,
              storeId: bestOffer.storeId,
              storeName: bestOffer.storeName,
              oldPrice: lastPrice,
              previousStorePrice: lastPrice,
              newPrice: bestOffer.price,
              changeAmount,
              changeDirection: changeAmount > 0 ? 'up' : 'down',
              currency: bestOffer.currency,
              importedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              readAt: reads[alertId] ?? null,
              highlightSeenAt: null,
            } as any);
          }
        }
      }
    }
  }

  try {
    await AsyncStorage.setItem(LAST_PRICES_KEY, JSON.stringify({
      ...lastPrices,
      ...updatedPrices,
    }));
  } catch {}

  return alerts;
}

export async function primePriceObserver(
  calendarData: CalendarCacheData,
  partnerStores: PartnerStore[]
): Promise<void> {
  const bestPriceMap = buildBestPriceMap(partnerStores);
  if (bestPriceMap.size === 0) return;

  let lastPrices: Record<string, number> = {};
  try {
    const stored = await AsyncStorage.getItem(LAST_PRICES_KEY);
    if (stored) lastPrices = JSON.parse(stored);
  } catch {}

  let changed = false;
  for (const lovedOne of calendarData.lovedOnes) {
    if (lovedOne.isDeleted) continue;
    const plans = calendarData.giftPlansByLovedOne[lovedOne.id] || [];

    for (const plan of plans) {
      if (plan.status !== 'planned') continue;

      for (const product of (plan.selectedProducts || [])) {
        if (product.isPurchased) continue;

        const key = crossStoreKey(product.name, product.brand);
        if (!key) continue;

        const bestOffer = bestPriceMap.get(key);
        if (!bestOffer) continue;

        const storageKey = `${plan.id}__${key}`;
        if (lastPrices[storageKey] === undefined) {
          lastPrices[storageKey] = bestOffer.price;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    try {
      await AsyncStorage.setItem(LAST_PRICES_KEY, JSON.stringify(lastPrices));
    } catch {}
  }
}
