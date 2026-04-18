export type PriceAlert = {
  notificationKind?: 'price';
  id: string;
  type: 'price_drop' | 'price_change';
  lovedOneId: string;
  lovedOneName?: string;
  giftPlanId: string;
  giftPurpose: string;
  productId: string;
  productKey: string;
  productName: string;
  storeId: string;
  storeName: string;
  oldPrice: number;
  previousStorePrice: number;
  newPrice: number;
  changeAmount?: number;
  changeDirection?: 'up' | 'down';
  currency: string;
  importedAt: string;
  createdAt: string;
  readAt?: string | null;
  highlightSeenAt?: string | null;
  deletedAt?: string | null;
};

export type DeadlineAlert = {
  notificationKind: 'deadline';
  id: string;
  type: 'purchase_deadline' | 'offer_deadline';
  deadlineStatus: 'upcoming' | 'overdue';
  lovedOneId: string;
  lovedOneName?: string;
  giftPlanId: string;
  giftPurpose: string;
  deadlineDate: string;
  daysLeft: number;
  createdAt: string;
  readAt?: string | null;
};

export type BirthdayAlert = {
  notificationKind: 'birthday';
  id: string;
  type: 'birthday';
  lovedOneId: string;
  lovedOneName: string;
  day: number;
  month: number;
  year?: number;
  createdAt: string;
  readAt?: string | null;
};

export type AppNotification = PriceAlert | DeadlineAlert | BirthdayAlert;

export type PriceAlertTarget = {
  alert: PriceAlert;
};
