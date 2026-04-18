import { getPartnerStores } from './partnerStoresApi';
import { PartnerStore } from '../types/partnerStores';

class AdminPartnerStoresCache {
  private cachedToken: string | null = null;
  private cachedData: PartnerStore[] | null = null;
  private pendingLoad: Promise<PartnerStore[]> | null = null;
  private listeners = new Set<() => void>();

  async get(token: string): Promise<PartnerStore[]> {
    if (this.cachedToken === token && this.cachedData) return this.cachedData;
    if (this.cachedToken === token && this.pendingLoad) return this.pendingLoad;

    this.cachedToken = token;
    this.pendingLoad = getPartnerStores(token);

    try {
      this.cachedData = await this.pendingLoad;
      return this.cachedData;
    } finally {
      this.pendingLoad = null;
    }
  }

  setSnapshot(token: string, data: PartnerStore[]) {
    this.cachedToken = token;
    this.cachedData = data;
    this.pendingLoad = null;
    this.emit();
  }

  clear() {
    this.cachedToken = null;
    this.cachedData = null;
    this.pendingLoad = null;
  }

  invalidate() {
    this.clear();
    this.emit();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

export const adminPartnerStoresCache = new AdminPartnerStoresCache();

export async function getAdminPartnerStoresCache(token: string): Promise<PartnerStore[]> {
  return adminPartnerStoresCache.get(token);
}

export function setAdminPartnerStoresCacheSnapshot(token: string, data: PartnerStore[]) {
  adminPartnerStoresCache.setSnapshot(token, data);
}

export function clearAdminPartnerStoresCache() {
  adminPartnerStoresCache.clear();
}

export function invalidateAdminPartnerStoresCache() {
  adminPartnerStoresCache.invalidate();
}

export function subscribeAdminPartnerStoresCache(listener: () => void) {
  return adminPartnerStoresCache.subscribe(listener);
}
