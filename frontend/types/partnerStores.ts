export type ProductImportItem = {
  id?: string;
  externalId?: string;
  priceHistoryKey?: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  sku?: string;
  productUrl?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  price?: {
    current?: number;
    original?: number;
    discount?: number;
    discountPercent?: number;
    hasDiscount?: boolean;
  };
  promo?: {
    hasPromoCode?: boolean;
    code?: string;
    discount?: number;
    discountAmount?: number;
    discountPercent?: number;
    note?: string;
  };
  availability?: {
    inStock?: boolean;
    stockStatus?: string;
  };
};

export type ProductPriceHistoryEntry = {
  importedAt: string;
  importName?: string;
  currentPrice: number;
  originalPrice?: number;
  discountAmount?: number;
  discountPercent?: number;
  hasDiscount: boolean;
  inStock?: boolean;
  stockStatus?: string;
};

export type ProductPriceHistorySummary = {
  productKey: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  importsSeen: number;
  latestPrice: number;
  latestOriginalPrice?: number;
  lowestPriceEver: number;
  highestPriceEver: number;
  averagePrice: number;
  discountApplications: number;
  biggestDiscountAmount: number;
  biggestDiscountPercent: number;
  lastPriceChangeAmount: number;
  lastPriceChangeDirection: 'up' | 'down' | 'same' | 'new';
  lastImportName?: string;
  history: ProductPriceHistoryEntry[];
};

export type PartnerStore = {
  id: string;
  companyName: string;
  cui: string;
  tradeRegisterNumber: string;
  displayName: string;
  contractStartDate: string;
  contractEndDate: string;
  brandImageUri?: string;
  products: ProductImportItem[];
  productPriceHistory?: ProductPriceHistorySummary[];
  source?: string;
  merchant?: {
    name?: string;
    domain?: string;
    affiliateNetwork?: string;
  };
  currency?: string;
  lastUpdated?: string;
  lastImportName?: string;
  createdAt: string;
  updatedAt?: string;
};

export type PartnerProductUsageOccurrence = {
  giftPlanId: string;
  lovedOneId: string;
  purpose: string;
  status: 'planned' | 'purchased' | 'completed' | string;
  giftDate: string;
  purchaseDeadlineDate: string;
  year: number | null;
  addedAt: string;
  price: number;
  isPurchased: boolean;
  purchasedAt?: string;
  purchasedStoreName?: string;
  purchasePrice: number;
  purchasedFromThisStore: boolean;
};

export type PartnerProductUsageStats = {
  product: {
    productKey?: string;
    productId?: string;
    externalId?: string;
    id?: string;
    name?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
  };
  totalAddedCount: number;
  purchasedFromThisStoreCount: number;
  addedWithoutPurchaseFromThisStoreCount: number;
  years: number[];
  purposes: string[];
  occurrences: PartnerProductUsageOccurrence[];
};

export type PartnerProductsImportPayload = {
  products: ProductImportItem[];
  source?: string;
  merchant?: {
    name?: string;
    domain?: string;
    affiliateNetwork?: string;
  };
  currency?: string;
  lastUpdated?: string;
};

export type PartnerStorePayload = {
  companyName: string;
  cui: string;
  tradeRegisterNumber: string;
  displayName: string;
  contractStartDate: string;
  contractEndDate: string;
  brandImageUri?: string;
};
