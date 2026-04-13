import { apiFetch } from './api';
import {
  PartnerStore,
  PartnerStorePayload,
  PartnerProductsImportPayload,
  ProductImportItem,
} from '../types/partnerStores';

export async function getPartnerStores(token: string): Promise<PartnerStore[]> {
  return apiFetch('/partner-stores', { method: 'GET' }, token);
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
