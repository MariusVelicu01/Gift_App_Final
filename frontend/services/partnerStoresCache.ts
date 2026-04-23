import { getPartnerStores } from './partnerStoresApi';
import { PartnerStore } from '../types/partnerStores';

let cachedToken: string | null = null;
let cachedData: PartnerStore[] | null = null;
let pendingLoad: Promise<PartnerStore[]> | null = null;
let cachedAt = 0;
const listeners = new Set<() => void>();

const CACHE_TTL_MS = 30000;

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
    return cachedData;
  } finally {
    pendingLoad = null;
  }
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
