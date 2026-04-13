export type ProductImportItem = {
  id?: string;
  externalId?: string;
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
  availability?: {
    inStock?: boolean;
    stockStatus?: string;
  };
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
