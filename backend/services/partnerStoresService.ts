import { db } from '../config/firebase';

const COLLECTION = 'partnerStores';

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

export type PartnerStorePayload = {
  companyName: string;
  cui: string;
  tradeRegisterNumber: string;
  displayName: string;
  contractStartDate: string;
  contractEndDate: string;
  brandImageUri?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function createPartnerStore(data: PartnerStorePayload) {
  const ref = db.collection(COLLECTION).doc();
  const payload = {
    id: ref.id,
    products: [],
    ...data,
  };

  await ref.set(payload);
  return payload;
}

export async function getPartnerStores() {
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

export async function getPartnerStoreById(storeId: string) {
  const doc = await db.collection(COLLECTION).doc(storeId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data();
}

export async function updatePartnerStoreProducts(
  storeId: string,
  products: ProductImportItem[],
  lastImportName?: string,
  metadata?: {
    source?: string;
    merchant?: {
      name?: string;
      domain?: string;
      affiliateNetwork?: string;
    };
    currency?: string;
    lastUpdated?: string;
  }
) {
  const ref = db.collection(COLLECTION).doc(storeId);

  await ref.update({
    products,
    lastImportName: lastImportName || null,
    source: metadata?.source || null,
    merchant: metadata?.merchant || null,
    currency: metadata?.currency || null,
    lastUpdated: metadata?.lastUpdated || null,
    updatedAt: new Date().toISOString(),
  });

  const updated = await ref.get();
  return updated.data();
}
