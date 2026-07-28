import { randomUUID } from 'crypto';
import { FieldPath } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'partnerStores';
const PRODUCTS_SUBCOLLECTION = 'products';

// Firestore batch writes are capped at 500 ops; keep margin for safety.
const BATCH_CHUNK_SIZE = 400;

// Safety cap for the backward-compatible "embed all products" response consumed by
// screens that need the whole catalog for computation (GiftBot catalog, home-screen
// promotions, cross-store price comparison) rather than paginated browsing.
const MAX_EMBEDDED_PRODUCTS_PER_STORE = 2000;

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

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

export type ProductPage = {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
};

function normalizeKeyPart(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Same identity rules as before (external id > id > sku > name+brand), now used directly
// as the Firestore document id for the product, so re-imports upsert instead of duplicating.
function getProductDocId(product: ProductImportItem): string {
  const externalId = normalizeKeyPart(product.externalId);
  if (externalId) return `external-${externalId}`.slice(0, 300);

  const id = normalizeKeyPart(product.id);
  if (id) return `id-${id}`.slice(0, 300);

  const sku = normalizeKeyPart(product.sku);
  if (sku) return `sku-${sku}`.slice(0, 300);

  const name = normalizeKeyPart(product.name);
  const brand = normalizeKeyPart(product.brand);
  const key = `name-${brand || 'no-brand'}-${name}`.slice(0, 300);
  return key.length > 'name--'.length ? key : randomUUID();
}

function hasProductDiscount(product: ProductImportItem) {
  const price = product.price;
  if (!price) return false;

  return Boolean(
    price.hasDiscount ||
      (price.discount !== undefined && price.discount > 0) ||
      (price.discountPercent !== undefined && price.discountPercent > 0) ||
      (price.original !== undefined &&
        price.current !== undefined &&
        price.original > price.current)
  );
}

// Merges one imported product into its previous document, carrying the price-history
// summary forward (same math as the old array-of-summaries version, just scoped to
// a single product doc instead of a shared per-store array).
function mergeProductDoc(
  previous: any | undefined,
  product: ProductImportItem,
  docId: string,
  storeId: string,
  storeName: string,
  currency: string,
  importedAt: string,
  importName?: string
) {
  const currentPrice = product.price?.current;
  const hasDiscount = hasProductDiscount(product);
  const originalPrice = product.price?.original;
  const discountAmount =
    product.price?.discount ??
    (originalPrice !== undefined && currentPrice !== undefined && originalPrice > currentPrice
      ? originalPrice - currentPrice
      : undefined);
  const discountPercent =
    product.price?.discountPercent ??
    (originalPrice !== undefined && currentPrice !== undefined && originalPrice > currentPrice
      ? Number((((originalPrice - currentPrice) / originalPrice) * 100).toFixed(2))
      : undefined);

  const base: any = {
    id: docId,
    storeId,
    storeName,
    currency,
    ...(product.externalId ? { externalId: product.externalId } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    name: product.name,
    nameLower: product.name.toLowerCase(),
    ...(product.brand ? { brand: product.brand } : {}),
    ...(product.category ? { category: product.category, categoryLower: product.category.toLowerCase() } : {}),
    ...(product.subcategory ? { subcategory: product.subcategory } : {}),
    ...(product.productUrl ? { productUrl: product.productUrl } : {}),
    ...(product.affiliateUrl ? { affiliateUrl: product.affiliateUrl } : {}),
    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
    ...(product.price ? { price: product.price } : {}),
    ...(product.promo ? { promo: product.promo } : {}),
    ...(product.availability ? { availability: product.availability } : {}),
    ...((product as any).affiliate ? { affiliate: (product as any).affiliate } : {}),
    ...((product as any).gender ? { gender: (product as any).gender } : {}),
    hasDiscount,
    priceHistoryKey: docId,
  };

  if (currentPrice === undefined || !Number.isFinite(currentPrice)) {
    return { ...previous, ...base, updatedAt: importedAt };
  }

  const historyEntry: ProductPriceHistoryEntry = {
    importedAt,
    ...(importName ? { importName } : {}),
    currentPrice,
    ...(originalPrice !== undefined && Number.isFinite(originalPrice) ? { originalPrice } : {}),
    ...(discountAmount !== undefined && Number.isFinite(discountAmount) ? { discountAmount } : {}),
    ...(discountPercent !== undefined && Number.isFinite(discountPercent) ? { discountPercent } : {}),
    hasDiscount,
    ...(product.availability?.inStock !== undefined ? { inStock: product.availability.inStock } : {}),
    ...(product.availability?.stockStatus ? { stockStatus: product.availability.stockStatus } : {}),
  };

  const history = [...(previous?.history || []), historyEntry].slice(-80);
  const prices = history.map((entry: ProductPriceHistoryEntry) => entry.currentPrice);
  const previousPrice = previous?.latestPrice;
  const lastPriceChangeAmount =
    previousPrice === undefined ? 0 : Number((currentPrice - previousPrice).toFixed(2));

  return {
    ...base,
    firstSeenAt: previous?.firstSeenAt || importedAt,
    lastSeenAt: importedAt,
    importsSeen: (previous?.importsSeen || 0) + 1,
    latestPrice: currentPrice,
    ...(originalPrice !== undefined && Number.isFinite(originalPrice)
      ? { latestOriginalPrice: originalPrice }
      : previous?.latestOriginalPrice !== undefined
      ? { latestOriginalPrice: previous.latestOriginalPrice }
      : {}),
    lowestPriceEver: Math.min(...prices),
    highestPriceEver: Math.max(...prices),
    averagePrice: Number((prices.reduce((sum, p) => sum + p, 0) / prices.length).toFixed(2)),
    discountApplications: (previous?.discountApplications || 0) + (hasDiscount ? 1 : 0),
    biggestDiscountAmount: Math.max(previous?.biggestDiscountAmount || 0, discountAmount || 0),
    biggestDiscountPercent: Math.max(previous?.biggestDiscountPercent || 0, discountPercent || 0),
    lastPriceChangeAmount,
    lastPriceChangeDirection:
      previousPrice === undefined
        ? 'new'
        : lastPriceChangeAmount > 0
        ? 'up'
        : lastPriceChangeAmount < 0
        ? 'down'
        : 'same',
    ...(importName ? { lastImportName: importName } : previous?.lastImportName ? { lastImportName: previous.lastImportName } : {}),
    history,
    updatedAt: importedAt,
  };
}

function productsCollection(storeId: string) {
  return db.collection(COLLECTION).doc(storeId).collection(PRODUCTS_SUBCOLLECTION);
}

function encodeCursor(nameLower: string, id: string): string {
  return Buffer.from(JSON.stringify([nameLower, id])).toString('base64url');
}

function decodeCursor(cursor?: string): [string, string] | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(parsed) && parsed.length === 2) {
      return [String(parsed[0]), String(parsed[1])];
    }
  } catch {
    /* invalid cursor — treat as no cursor */
  }
  return null;
}

function clampLimit(limit?: number): number {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.round(parsed), MAX_PAGE_SIZE);
}

export async function createPartnerStore(data: PartnerStorePayload) {
  const ref = db.collection(COLLECTION).doc();
  const payload = {
    id: ref.id,
    productCount: 0,
    ...data,
  };

  await ref.set(payload);
  return payload;
}

export async function updatePartnerStore(storeId: string, data: PartnerStorePayload) {
  const ref = db.collection(COLLECTION).doc(storeId);
  const existing = await ref.get();

  if (!existing.exists) {
    return null;
  }

  await ref.update({
    ...data,
    updatedAt: new Date().toISOString(),
  });

  const updated = await ref.get();
  return updated.data();
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

// Paginated product listing for a single store — used by the client/admin browse UIs.
export async function getPartnerStoreProducts(
  storeId: string,
  options: { cursor?: string; limit?: number; category?: string; search?: string }
): Promise<ProductPage> {
  const limit = clampLimit(options.limit);
  let query: FirebaseFirestore.Query = productsCollection(storeId);

  if (options.category) {
    query = query.where('categoryLower', '==', options.category.trim().toLowerCase());
  }

  const search = (options.search || '').trim().toLowerCase();
  if (search) {
    query = query
      .where('nameLower', '>=', search)
      .where('nameLower', '<=', search + '');
  }

  query = query.orderBy('nameLower').orderBy(FieldPath.documentId());

  const cursor = decodeCursor(options.cursor);
  if (cursor) {
    query = query.startAfter(cursor[0], cursor[1]);
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
  const items = docs.map((doc) => doc.data());
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.nameLower, last.id) : null,
    hasMore,
  };
}

// Cross-store paginated search (Firestore collectionGroup query) — used by the client
// marketplace search box, which browses/searches across every partner store at once.
export async function searchProductsAcrossStores(options: {
  cursor?: string;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<ProductPage> {
  const limit = clampLimit(options.limit);
  let query: FirebaseFirestore.Query = db.collectionGroup(PRODUCTS_SUBCOLLECTION);

  if (options.category) {
    query = query.where('categoryLower', '==', options.category.trim().toLowerCase());
  }

  const search = (options.search || '').trim().toLowerCase();
  if (search) {
    query = query
      .where('nameLower', '>=', search)
      .where('nameLower', '<=', search + '');
  }

  query = query.orderBy('nameLower').orderBy(FieldPath.documentId());

  const cursor = decodeCursor(options.cursor);
  if (cursor) {
    query = query.startAfter(cursor[0], cursor[1]);
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
  const items = docs.map((doc) => doc.data());
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.nameLower, last.id) : null,
    hasMore,
  };
}

// Backward-compatible "embed all products per store" aggregation, bounded by a safety
// cap. Used for consumers that need the (near-)whole catalog for computation rather
// than paginated browsing (GiftBot catalog, home-screen promotions, price comparison).
export async function getPartnerStoresWithEmbeddedProducts() {
  const stores = await getPartnerStores();

  return Promise.all(
    stores.map(async (store: any) => {
      const snapshot = await productsCollection(store.id)
        .orderBy('nameLower')
        .limit(MAX_EMBEDDED_PRODUCTS_PER_STORE)
        .get();

      return { ...store, products: snapshot.docs.map((doc) => doc.data()) };
    })
  );
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
    affiliate?: {
      commissionPercent: number;
      paymentTermDays?: number;
    };
    promotionIndicator?: Record<string, any>;
  }
) {
  const storeRef = db.collection(COLLECTION).doc(storeId);
  const storeSnap = await storeRef.get();
  const storeData = storeSnap.data() as any;
  const storeName = storeData?.displayName || storeData?.companyName || storeId;
  const currency = metadata?.currency || storeData?.currency || 'RON';

  const productsRef = productsCollection(storeId);
  // Only fetch what's needed to carry price history forward + diff for delisting —
  // keeps this a cheap read even for large catalogs.
  const existingSnapshot = await productsRef.get();
  const existingById = new Map(existingSnapshot.docs.map((doc) => [doc.id, doc.data()]));

  const importedAt = new Date().toISOString();
  const importName = lastImportName || undefined;

  const seenIds = new Set<string>();
  let batch = db.batch();
  let opsInBatch = 0;
  const pendingCommits: Promise<unknown>[] = [];

  function queueWrite(apply: (b: FirebaseFirestore.WriteBatch) => void) {
    if (opsInBatch >= BATCH_CHUNK_SIZE) {
      pendingCommits.push(batch.commit());
      batch = db.batch();
      opsInBatch = 0;
    }
    apply(batch);
    opsInBatch++;
  }

  products.forEach((product) => {
    const docId = getProductDocId(product);
    seenIds.add(docId);

    const merged = mergeProductDoc(
      existingById.get(docId),
      product,
      docId,
      storeId,
      storeName,
      currency,
      importedAt,
      importName
    );

    queueWrite((b) => b.set(productsRef.doc(docId), merged));
  });

  // Delist products that were present before but are absent from this import, mirroring
  // the old "products array is fully replaced on every import" behavior.
  existingById.forEach((_data, docId) => {
    if (!seenIds.has(docId)) {
      queueWrite((b) => b.delete(productsRef.doc(docId)));
    }
  });

  if (opsInBatch > 0) {
    pendingCommits.push(batch.commit());
  }

  await Promise.all(pendingCommits);

  await storeRef.update({
    productCount: seenIds.size,
    lastImportName: importName || null,
    source: metadata?.source || null,
    merchant: metadata?.merchant || null,
    currency: metadata?.currency || null,
    lastUpdated: metadata?.lastUpdated || null,
    updatedAt: importedAt,
    ...(metadata?.affiliate ? { affiliate: metadata.affiliate } : {}),
    ...(metadata?.promotionIndicator ? { promotionIndicator: metadata.promotionIndicator } : {}),
  });

  const updated = await storeRef.get();
  return updated.data();
}

// Full (unpaginated) product read for a single store — only for admin-side aggregate
// stats (affiliate-stats) which need every product's commission % as a fallback lookup.
// Not exposed to paginated client browsing.
export async function getAllProductsForStore(storeId: string) {
  const snapshot = await productsCollection(storeId).get();
  return snapshot.docs.map((doc) => doc.data());
}

// Same, but across every store at once (affiliate-summary) — one collectionGroup read
// instead of N per-store reads.
export async function getAllProductsAcrossStores() {
  const snapshot = await db.collectionGroup(PRODUCTS_SUBCOLLECTION).get();
  return snapshot.docs.map((doc) => doc.data());
}
