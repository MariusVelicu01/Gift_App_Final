export type GiftPurpose =
  | 'Zi de nastere'
  | 'Craciun'
  | 'Paste'
  | 'Zi de nume'
  | 'Aniversare'
  | 'Multumire'
  | 'Alta ocazie';

export type GiftPlan = {
  id: string;
  lovedOneId: string;
  purpose: GiftPurpose;
  budget: number;
  deadlineDate: string;
  purchaseDeadlineDate?: string;
  requiresCustomDate: boolean;
  status: 'planned' | 'purchased' | 'completed';
  canModify: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  offeredAt?: string;
  daysUntilCompleted?: number;
  daysRemainingUntilGift?: number;
  experienceDetails?: string;
  reactionRating?: number;
  appFeedbackDetails?: string;
  appFeedbackRating?: number;
  productReactions?: ProductReaction[];
  selectedProducts?: GiftPlanProduct[];
  budgetHistory?: BudgetHistoryEntry[];
};

export type BudgetHistoryEntry = {
  value: number;
  changedAt: string;
  reason?: string;
};

export type GiftPlanProduct = {
  id: string;
  productKey?: string;
  productId?: string;
  externalId?: string;
  storeId: string;
  storeName: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  productUrl?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  discountPercent?: number;
  hasDiscount?: boolean;
  currency: string;
  addedAt: string;
  isPurchased?: boolean;
  purchasedAt?: string;
  purchasedStoreName?: string;
  purchasePrice?: number;
  purchasedFromImportedStore?: boolean;
};

export type ProductReaction = {
  productId: string;
  productName: string;
  reactionRating: number;
  details?: string;
};

export type GiftPlanPayload = {
  purpose: GiftPurpose;
  budget: number;
  deadlineDay?: number;
  deadlineMonth?: number;
  deadlineYear?: number;
  purchaseDeadlineDay?: number;
  purchaseDeadlineMonth?: number;
  purchaseDeadlineYear?: number;
};

export type CompleteGiftPlanPayload = {
  purchasedAt: string;
  appFeedbackDetails?: string;
  appFeedbackRating?: number;
};

export type OfferGiftPlanPayload = {
  offeredAt: string;
  experienceDetails?: string;
  reactionRating: number;
  productReactions: ProductReaction[];
};

export type GiftPlanProductsPayload = {
  selectedProducts: GiftPlanProduct[];
  budget?: number;
  budgetChangeReason?: string;
};
