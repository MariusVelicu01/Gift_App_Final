import { getGiftPlans } from './giftPlansApi';
import { getLovedOnes } from './lovedOnesApi';
import { GiftPlan } from '../types/giftPlans';
import { LovedOne } from '../types/lovedOnes';
import { clearLovedOnesCache } from './lovedOnesCache';

export type CalendarCacheData = {
  lovedOnes: LovedOne[];
  giftPlansByLovedOne: Record<string, GiftPlan[]>;
};

let cachedToken: string | null = null;
let cachedCalendarData: CalendarCacheData | null = null;
let pendingCalendarLoad: Promise<CalendarCacheData> | null = null;
const calendarCacheListeners = new Set<() => void>();

async function fetchCalendarData(token: string): Promise<CalendarCacheData> {
  const lovedOnes = await getLovedOnes(token);
  const giftPlanEntries = await Promise.all(
    lovedOnes.map(async (lovedOne) => {
      const giftPlans = await getGiftPlans(token, lovedOne.id);
      return [lovedOne.id, giftPlans] as const;
    })
  );

  return {
    lovedOnes,
    giftPlansByLovedOne: Object.fromEntries(giftPlanEntries),
  };
}

export function hasCalendarCache(token: string) {
  return cachedToken === token && cachedCalendarData !== null;
}

export async function getCalendarCache(token: string) {
  if (cachedToken === token && cachedCalendarData) {
    return cachedCalendarData;
  }

  if (cachedToken === token && pendingCalendarLoad) {
    return pendingCalendarLoad;
  }

  cachedToken = token;
  pendingCalendarLoad = fetchCalendarData(token);

  try {
    cachedCalendarData = await pendingCalendarLoad;
    return cachedCalendarData;
  } finally {
    pendingCalendarLoad = null;
  }
}

export async function refreshCalendarCache(token: string) {
  cachedToken = token;
  pendingCalendarLoad = fetchCalendarData(token);

  try {
    cachedCalendarData = await pendingCalendarLoad;
    return cachedCalendarData;
  } finally {
    pendingCalendarLoad = null;
  }
}

export function clearCalendarCache() {
  cachedToken = null;
  cachedCalendarData = null;
  pendingCalendarLoad = null;
}

export function invalidateCalendarCache() {
  clearCalendarCache();
  clearLovedOnesCache();
  calendarCacheListeners.forEach((listener) => listener());
}

export function subscribeCalendarCache(listener: () => void) {
  calendarCacheListeners.add(listener);

  return () => {
    calendarCacheListeners.delete(listener);
  };
}
