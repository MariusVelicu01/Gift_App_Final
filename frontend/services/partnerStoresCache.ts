import { getPartnerStores } from './partnerStoresApi';
import { PartnerStore } from '../types/partnerStores';

let cachedToken: string | null = null;
let cachedData: PartnerStore[] | null = null;
let pendingLoad: Promise<PartnerStore[]> | null = null;
let cachedAt = 0;
const listeners = new Set<() => void>();

const CACHE_TTL_MS = 5 * 60 * 1000;
const BACKGROUND_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

export function isPartnerStoresCacheStale(): boolean {
  return Date.now() - cachedAt > BACKGROUND_REFRESH_THRESHOLD_MS;
}

export function hasPartnerStoresCache(token: string): boolean {
  return cachedToken === token && cachedData !== null;
}

export async function getPartnerStoresCache(
  token: string,
  options: { forceRefresh?: boolean } = {}
): Promise<PartnerStore[]> {
  const isFresh = Date.now() - cachedAt < CACHE_TTL_MS;

  if (cachedToken === token && cachedData && isFresh && !options.forceRefresh) {
    return cachedData;
  }

  if (cachedToken === token && pendingLoad) return pendingLoad;

  cachedToken = token;
  pendingLoad = getPartnerStores(token);

  try {
    cachedData = await pendingLoad;
    cachedAt = Date.now();
    listeners.forEach((l) => l());
    return cachedData;
  } finally {
    pendingLoad = null;
  }
}

export function refreshPartnerStoresCacheInBackground(token: string): void {
  if (pendingLoad) return;

  cachedToken = token;
  pendingLoad = getPartnerStores(token);

  pendingLoad
    .then((data) => {
      cachedData = data;
      cachedAt = Date.now();
      listeners.forEach((l) => l());
    })
    .catch(() => {})
    .finally(() => {
      pendingLoad = null;
    });
}

export function clearPartnerStoresCache() {
  cachedToken = null;
  cachedData = null;
  pendingLoad = null;
  cachedAt = 0;
}

export function invalidatePartnerStoresCache() {
  clearPartnerStoresCache();
  listeners.forEach((l) => l());
}

export function subscribePartnerStoresCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
