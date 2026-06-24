import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeadlineAlert } from '../types/priceAlerts';
import { CalendarCacheData } from './calendarCache';

const DEADLINE_READS_KEY = 'gift_app_deadline_reads';
const UPCOMING_DAYS = 7; // alert window

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysUntil(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateKey.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export async function generateDeadlineAlerts(
  calendarData: CalendarCacheData
): Promise<DeadlineAlert[]> {
  const today = todayKey();

  let reads: Record<string, string> = {};
  try {
    const stored = await AsyncStorage.getItem(DEADLINE_READS_KEY);
    if (stored) reads = JSON.parse(stored);
  } catch {}

  const alerts: DeadlineAlert[] = [];

  for (const lovedOne of calendarData.lovedOnes) {
    if (lovedOne.isDeleted) continue;
    const plans = calendarData.giftPlansByLovedOne[lovedOne.id] || [];

    for (const plan of plans) {
      if (plan.status === 'completed') continue;

      const purchaseDeadline = plan.purchaseDeadlineDate || plan.deadlineDate;
      if (purchaseDeadline && plan.status === 'planned') {
        const days = daysUntil(purchaseDeadline);
        if (days <= UPCOMING_DAYS) {
          const id = `deadline-purchase-${plan.id}-${today}`;
          alerts.push({
            notificationKind: 'deadline',
            id,
            type: 'purchase_deadline',
            deadlineStatus: days < 0 ? 'overdue' : 'upcoming',
            lovedOneId: lovedOne.id,
            lovedOneName: lovedOne.name,
            giftPlanId: plan.id,
            giftPurpose: plan.purpose || '',
            deadlineDate: purchaseDeadline,
            daysLeft: Math.abs(days),
            createdAt: new Date().toISOString(),
            readAt: reads[id] ?? null,
          });
        }
      }

      if (plan.deadlineDate && plan.status === 'purchased') {
        const days = daysUntil(plan.deadlineDate);
        if (days <= UPCOMING_DAYS) {
          const id = `deadline-offer-${plan.id}-${today}`;
          alerts.push({
            notificationKind: 'deadline',
            id,
            type: 'offer_deadline',
            deadlineStatus: days < 0 ? 'overdue' : 'upcoming',
            lovedOneId: lovedOne.id,
            lovedOneName: lovedOne.name,
            giftPlanId: plan.id,
            giftPurpose: plan.purpose || '',
            deadlineDate: plan.deadlineDate,
            daysLeft: Math.abs(days),
            createdAt: new Date().toISOString(),
            readAt: reads[id] ?? null,
          });
        }
      }
    }
  }

  return alerts.sort((a, b) => {
    if (!a.readAt && b.readAt) return -1;
    if (a.readAt && !b.readAt) return 1;
    return a.daysLeft - b.daysLeft;
  });
}

export async function markDeadlineAlertRead(id: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(DEADLINE_READS_KEY);
    const reads: Record<string, string> = stored ? JSON.parse(stored) : {};
    reads[id] = new Date().toISOString();
    await AsyncStorage.setItem(DEADLINE_READS_KEY, JSON.stringify(reads));
  } catch {}
}
