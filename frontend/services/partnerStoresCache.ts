import { getPartnerStores } from './partnerStoresApi';
import { PartnerStore } from '../types/partnerStores';

let cachedToken: string | null = null;
let cachedData: PartnerStore[] | null = null;
let pendingLoad: Promise<PartnerStore[]> | null = null;
const listeners = new Set<() => void>();

export async function getPartnerStoresCache(token: string): Promise<PartnerStore[]> {
  if (cachedToken === token && cachedData) return cachedData;
  if (cachedToken === token && pendingLoad) return pendingLoad;

  cachedToken = token;
  pendingLoad = getPartnerStores(token);

  try {
    cachedData = await pendingLoad;
    return cachedData;
  } finally {
    pendingLoad = null;
  }
}

export function clearPartnerStoresCache() {
  cachedToken = null;
  cachedData = null;
  pendingLoad = null;
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
