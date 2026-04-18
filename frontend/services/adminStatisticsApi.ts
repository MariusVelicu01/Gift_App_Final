import { apiFetch } from './api';

export type AdminUserStatisticsGiftPlan = {
  id: string;
  userId: string;
  userGender: 'male' | 'female' | 'unknown';
  purpose: string;
  year: number | null;
  budget: number;
  status: 'planned' | 'purchased' | 'completed' | string;
  createdAt: string;
  deadlineDate: string;
  purchaseDeadlineDate: string;
  completedAt: string;
  daysToPurchase: number | null;
  delayDays: number | null;
  purchasedOnTime: boolean | null;
  selectedProducts: {
    storeId: string;
    storeName: string;
    name: string;
    brand: string;
    category: string;
    subcategory: string;
    productKey: string;
    isPurchased: boolean;
    purchasedStoreName: string;
    selectedAsCheapestOffer: boolean;
    manualSearchFallback: boolean;
  }[];
};

export type AdminUserStatisticsResponse = {
  years: number[];
  purposes: string[];
  giftPlans: AdminUserStatisticsGiftPlan[];
};

export async function getAdminUserStatistics(
  token: string
): Promise<AdminUserStatisticsResponse> {
  return apiFetch('/admin-statistics/users', { method: 'GET' }, token);
}
