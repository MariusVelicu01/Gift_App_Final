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
    productUrl: string;
    isPurchased: boolean;
    purchasedStoreName: string;
    purchasePrice: number;
    selectedAsCheapestOffer: boolean;
    manualSearchFallback: boolean;
    wasEverPurchased: boolean;
    affiliateCommission: {
      commissionPercent: number;
      expectedAmount: number;
      status: string;
      receivedAmount: number;
      receivedAt: string;
    } | null;
  }[];
};

export type AffiliateEarning = {
  storeId: string;
  storeName: string;
  commissionPercent: number;
  conversions: number;
  totalExpected: number;
  totalReceived: number;
  totalPending: number;
};

export type AdminUserStatisticsResponse = {
  years: number[];
  purposes: string[];
  giftPlans: AdminUserStatisticsGiftPlan[];
  affiliateEarnings: AffiliateEarning[];
};

export async function getAdminUserStatistics(
  token: string
): Promise<AdminUserStatisticsResponse> {
  return apiFetch('/admin-statistics/users', { method: 'GET' }, token);
}
