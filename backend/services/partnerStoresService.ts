import { db } from '../config/firebase';

const COLLECTION = 'partnerStores';

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

function normalizeKeyPart(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getProductHistoryKey(product: ProductImportItem) {
  const externalId = normalizeKeyPart(product.externalId);
  if (externalId) return `external-${externalId}`;

  const id = normalizeKeyPart(product.id);
  if (id) return `id-${id}`;

  const sku = normalizeKeyPart(product.sku);
  if (sku) return `sku-${sku}`;

  const name = normalizeKeyPart(product.name);
  const brand = normalizeKeyPart(product.brand);
  return `name-${brand || 'no-brand'}-${name}`;
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

function buildPriceHistory(
  existingSummaries: ProductPriceHistorySummary[] | undefined,
  products: ProductImportItem[],
  importedAt: string,
  importName?: string
) {
  const summaries = new Map<string, ProductPriceHistorySummary>();

  (existingSummaries || []).forEach((summary) => {
    if (summary?.productKey) {
      summaries.set(summary.productKey, {
        ...summary,
        history: Array.isArray(summary.history) ? summary.history : [],
      });
    }
  });

  const productsWithKeys = products.map((product) => {
    const productKey = getProductHistoryKey(product);
    const currentPrice = product.price?.current;

    if (currentPrice === undefined || !Number.isFinite(currentPrice)) {
      return { ...product, priceHistoryKey: productKey };
    }

    const previous = summaries.get(productKey);
    const hasDiscount = hasProductDiscount(product);
    const originalPrice = product.price?.original;
    const discountAmount =
      product.price?.discount ??
      (originalPrice !== undefined && originalPrice > currentPrice
        ? originalPrice - currentPrice
        : undefined);
    const discountPercent =
      product.price?.discountPercent ??
      (originalPrice !== undefined && originalPrice > currentPrice
        ? Number((((originalPrice - currentPrice) / originalPrice) * 100).toFixed(2))
        : undefined);

    const historyEntry: ProductPriceHistoryEntry = {
      importedAt,
      ...(importName ? { importName } : {}),
      currentPrice,
      ...(originalPrice !== undefined && Number.isFinite(originalPrice)
        ? { originalPrice }
        : {}),
      ...(discountAmount !== undefined && Number.isFinite(discountAmount)
        ? { discountAmount }
        : {}),
      ...(discountPercent !== undefined && Number.isFinite(discountPercent)
        ? { discountPercent }
        : {}),
      hasDiscount,
      ...(product.availability?.inStock !== undefined
        ? { inStock: product.availability.inStock }
        : {}),
      ...(product.availability?.stockStatus
        ? { stockStatus: product.availability.stockStatus }
        : {}),
    };

    const history = [...(previous?.history || []), historyEntry].slice(-80);
    const prices = history.map((entry) => entry.currentPrice);
    const previousPrice = previous?.latestPrice;
    const lastPriceChangeAmount =
      previousPrice === undefined ? 0 : Number((currentPrice - previousPrice).toFixed(2));

    summaries.set(productKey, {
      productKey,
      name: product.name,
      ...(product.brand ? { brand: product.brand } : previous?.brand ? { brand: previous.brand } : {}),
      ...(product.category
        ? { category: product.category }
        : previous?.category
        ? { category: previous.category }
        : {}),
      ...(product.subcategory
        ? { subcategory: product.subcategory }
        : previous?.subcategory
        ? { subcategory: previous.subcategory }
        : {}),
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
      averagePrice: Number(
        (prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(2)
      ),
      discountApplications:
        (previous?.discountApplications || 0) + (hasDiscount ? 1 : 0),
      biggestDiscountAmount: Math.max(
        previous?.biggestDiscountAmount || 0,
        discountAmount || 0
      ),
      biggestDiscountPercent: Math.max(
        previous?.biggestDiscountPercent || 0,
        discountPercent || 0
      ),
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
    });

    return { ...product, priceHistoryKey: productKey };
  });

  return {
    products: productsWithKeys,
    productPriceHistory: Array.from(summaries.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  };
}

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
  const existing = await ref.get();
  const existingData = existing.data() as
    | { productPriceHistory?: ProductPriceHistorySummary[] }
    | undefined;
  const updatedAt = new Date().toISOString();
  const importName = lastImportName || undefined;
  const priceHistoryResult = buildPriceHistory(
    existingData?.productPriceHistory,
    products,
    updatedAt,
    importName
  );

  await ref.update({
    products: priceHistoryResult.products,
    productPriceHistory: priceHistoryResult.productPriceHistory,
    lastImportName: importName || null,
    source: metadata?.source || null,
    merchant: metadata?.merchant || null,
    currency: metadata?.currency || null,
    lastUpdated: metadata?.lastUpdated || null,
    updatedAt,
  });

  const updated = await ref.get();
  return updated.data();
}
