import { apiFetch } from './api';
import {
  PartnerStore,
  PartnerStorePayload,
  PartnerProductsImportPayload,
  ProductImportItem,
  ProductPage,
  PartnerProductUsageStats,
} from '../types/partnerStores';

export async function getPartnerStores(token: string): Promise<PartnerStore[]> {
  return apiFetch('/partner-stores', { method: 'GET' }, token);
}

export type ProductQueryOptions = {
  cursor?: string | null;
  limit?: number;
  category?: string;
  search?: string;
};

function buildProductQueryString(options: ProductQueryOptions): string {
  const params = new URLSearchParams();
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.category) params.set('category', options.category);
  if (options.search) params.set('search', options.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Paginated product listing for one store — replaces relying on PartnerStore.products
// for screens that browse/search rather than needing the whole catalog at once.
export async function getStoreProducts(
  token: string,
  storeId: string,
  options: ProductQueryOptions = {}
): Promise<ProductPage> {
  return apiFetch(
    `/partner-stores/${storeId}/products${buildProductQueryString(options)}`,
    { method: 'GET' },
    token
  );
}

// Paginated cross-store search (Firestore collectionGroup query server-side).
export async function searchPartnerStoreProducts(
  token: string,
  options: ProductQueryOptions = {}
): Promise<ProductPage> {
  return apiFetch(`/partner-stores/search${buildProductQueryString(options)}`, { method: 'GET' }, token);
}

export async function createPartnerStore(
  token: string,
  data: PartnerStorePayload
): Promise<PartnerStore> {
  return apiFetch(
    '/partner-stores',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

export async function updatePartnerStore(
  token: string,
  storeId: string,
  data: PartnerStorePayload
): Promise<PartnerStore> {
  return apiFetch(
    `/partner-stores/${storeId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
}

export async function importPartnerStoreProducts(
  token: string,
  storeId: string,
  products: ProductImportItem[] | PartnerProductsImportPayload,
  lastImportName?: string
): Promise<PartnerStore> {
  const payload = Array.isArray(products)
    ? { products, lastImportName }
    : { ...products, lastImportName };

  return apiFetch(
    `/partner-stores/${storeId}/products`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token
  );
}

export async function getPartnerStoreProductUsage(
  token: string,
  storeId: string,
  product: ProductImportItem
): Promise<PartnerProductUsageStats> {
  const params = new URLSearchParams();

  if (product.priceHistoryKey) params.set('productKey', product.priceHistoryKey);
  if (product.id) params.set('id', product.id);
  if (product.id) params.set('productId', product.id);
  if (product.externalId) params.set('externalId', product.externalId);
  if (product.name) params.set('name', product.name);
  if (product.brand) params.set('brand', product.brand);
  if (product.category) params.set('category', product.category);
  if (product.subcategory) params.set('subcategory', product.subcategory);

  return apiFetch(
    `/partner-stores/${storeId}/product-usage?${params.toString()}`,
    { method: 'GET' },
    token
  );
}

export type StoreAffiliateStats = {
  storeId: string;
  commissionPercent: number;
  paymentTermDays: number;
  conversions: number;
  currentMonthExpected: number;
  previousMonthsPending: number;
  totalReceived: number;
  nextPaymentDate: string | null;
  daysUntilPayment: number | null;
  products: {
    name: string;
    commissionPercent: number;
    expectedAmount: number;
    receivedAmount: number;
    status: string;
    purchasePrice: number;
    purchasedAt?: string;
    paymentDueDate?: string;
  }[];
};

export async function getStoreAffiliateStats(
  token: string,
  storeId: string
): Promise<StoreAffiliateStats> {
  return apiFetch(`/partner-stores/${storeId}/affiliate-stats`, { method: 'GET' }, token);
}

export type AffiliateSummary = {
  totals: {
    conversions: number;
    currentMonthExpected: number;
    previousMonthsPending: number;
    totalReceived: number;
    nextPaymentDate: string | null;
    daysUntilPayment: number | null;
  };
  stores: {
    storeId: string;
    storeName: string;
    conversions: number;
    totalExpected: number;
    totalReceived: number;
    commissionPercent: number;
  }[];
};

export async function getAffiliateSummary(token: string): Promise<AffiliateSummary> {
  return apiFetch('/partner-stores/affiliate-summary', { method: 'GET' }, token);
}
