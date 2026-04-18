import { getLovedOnes } from './lovedOnesApi';
import { LovedOne } from '../types/lovedOnes';

let cachedToken: string | null = null;
let cachedData: LovedOne[] | null = null;
let pendingLoad: Promise<LovedOne[]> | null = null;
const listeners = new Set<() => void>();

export async function getLovedOnesCache(token: string): Promise<LovedOne[]> {
  if (cachedToken === token && cachedData) return cachedData;
  if (cachedToken === token && pendingLoad) return pendingLoad;

  cachedToken = token;
  pendingLoad = getLovedOnes(token);

  try {
    cachedData = await pendingLoad;
    return cachedData;
  } finally {
    pendingLoad = null;
  }
}

export function clearLovedOnesCache() {
  cachedToken = null;
  cachedData = null;
  pendingLoad = null;
}

export function invalidateLovedOnesCache() {
  clearLovedOnesCache();
  listeners.forEach((l) => l());
}

export function subscribeLovedOnesCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
