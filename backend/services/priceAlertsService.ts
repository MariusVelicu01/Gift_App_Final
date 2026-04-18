import { db } from '../config/firebase';
import { ProductImportItem } from './partnerStoresService';

type PriceDropAlertInput = {
  storeId: string;
  storeName: string;
  previousProducts?: ProductImportItem[];
  importedProducts: ProductImportItem[];
  currency?: string;
  importedAt: string;
};

function normalizeProductText(value?: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeId(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function getProductIdentityKey(product: {
  productKey?: string;
  name?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
}) {
  if (product.productKey) {
    return String(product.productKey);
  }

  const name = normalizeProductText(product.name);
  const brand = normalizeProductText(product.brand);
  const category = normalizeProductText(product.category);
  const subcategory = normalizeProductText(product.subcategory);
  const descriptor = brand || [category, subcategory].filter(Boolean).join(' ');

  return [name, descriptor].filter(Boolean).join('|');
}

function getProductEffectivePrice(product: ProductImportItem | any) {
  const currentPrice = Number(product?.price?.current ?? product?.price);

  if (!Number.isFinite(currentPrice)) {
    return null;
  }

  const promo = product?.promo;
  const hasPromoCode = Boolean(promo?.hasPromoCode || promo?.code);
  const promoDiscountPercent = Number(promo?.discountPercent);
  const promoDiscountAmount = Number(promo?.discountAmount ?? promo?.discount);
  let promoDiscount = 0;

  if (hasPromoCode) {
    if (Number.isFinite(promoDiscountPercent) && promoDiscountPercent > 0) {
      promoDiscount = (currentPrice * promoDiscountPercent) / 100;
    } else if (Number.isFinite(promoDiscountAmount) && promoDiscountAmount > 0) {
      promoDiscount = promoDiscountAmount;
    }
  }

  promoDiscount = Math.min(currentPrice, Math.max(0, Number(promoDiscount.toFixed(2))));
  return Number((currentPrice - promoDiscount).toFixed(2));
}

function matchesImportedProduct(selectedProduct: any, importedProduct: ProductImportItem) {
  const selectedExternalId = normalizeId(selectedProduct?.externalId);
  const importedExternalId = normalizeId(importedProduct.externalId);
  const selectedProductId = normalizeId(selectedProduct?.productId || selectedProduct?.id);
  const importedProductId = normalizeId(importedProduct.id || importedProduct.sku);

  if (selectedExternalId && importedExternalId && selectedExternalId === importedExternalId) {
    return true;
  }

  if (selectedProductId && importedProductId && selectedProductId === importedProductId) {
    return true;
  }

  return getProductIdentityKey(selectedProduct) === getProductIdentityKey(importedProduct);
}

function findPreviousProduct(
  previousProducts: ProductImportItem[],
  importedProduct: ProductImportItem
) {
  return previousProducts.find((product) => matchesImportedProduct(product, importedProduct));
}

function getUserIdFromGiftPlanPath(path: string) {
  const match = path.match(/^users\/([^/]+)\/lovedOnes\/([^/]+)\/giftPlans\/([^/]+)$/);

  return match
    ? {
        uid: match[1],
        lovedOneId: match[2],
        giftPlanId: match[3],
      }
    : null;
}

function buildAlertDocId(
  giftPlanId: string,
  productId: string,
  storeId: string,
  price: number,
  importedAt: string
) {
  const normalized = [
    giftPlanId,
    productId,
    storeId,
    String(Math.round(price * 100)),
    importedAt,
  ]
    .join('-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 180);

  return normalized || `${giftPlanId}-${Date.now()}`;
}

export async function createPriceDropAlertsForImport({
  storeId,
  storeName,
  previousProducts = [],
  importedProducts,
  currency = 'RON',
  importedAt,
}: PriceDropAlertInput) {
  const changedProducts = importedProducts
    .map((product) => {
      const newPrice = getProductEffectivePrice(product);
      const previousProduct = findPreviousProduct(previousProducts, product);
      const previousStorePrice = previousProduct
        ? getProductEffectivePrice(previousProduct)
        : null;

      if (newPrice === null || previousStorePrice === null) {
        return null;
      }

      const changeAmount = Number((newPrice - previousStorePrice).toFixed(2));

      if (changeAmount === 0) {
        return null;
      }

      return {
        product,
        productKey: getProductIdentityKey(product),
        newPrice,
        previousStorePrice,
        changeAmount,
        changeDirection: changeAmount > 0 ? 'up' : 'down',
      };
    })
    .filter(Boolean) as {
      product: ProductImportItem;
      productKey: string;
      newPrice: number;
      previousStorePrice: number;
      changeAmount: number;
      changeDirection: 'up' | 'down';
    }[];

  if (!changedProducts.length) {
    return 0;
  }

  const snapshot = await db.collectionGroup('giftPlans').get();
  const batch = db.batch();
  let createdCount = 0;
  const now = new Date().toISOString();

  for (const doc of snapshot.docs) {
    const giftPlan = doc.data();

    if (giftPlan.status !== 'planned') {
      continue;
    }

    const pathData = getUserIdFromGiftPlanPath(doc.ref.path);

    if (!pathData) {
      continue;
    }

    const lovedOneSnapshot = await db
      .collection('users')
      .doc(pathData.uid)
      .collection('lovedOnes')
      .doc(pathData.lovedOneId)
      .get();
    const lovedOneName = String(lovedOneSnapshot.data()?.name || '').trim();
    const selectedProducts = Array.isArray(giftPlan.selectedProducts)
      ? giftPlan.selectedProducts
      : [];

    selectedProducts.forEach((selectedProduct: any) => {
      if (selectedProduct?.isPurchased) {
        return;
      }

      if (selectedProduct?.storeId && selectedProduct.storeId !== storeId) {
        return;
      }

      const changedProduct = changedProducts.find((entry) =>
        matchesImportedProduct(selectedProduct, entry.product)
      );

      if (!changedProduct) {
        return;
      }

      const productId = String(selectedProduct.id || selectedProduct.productId || '').trim();
      const notificationId = buildAlertDocId(
        pathData.giftPlanId,
        productId || changedProduct.productKey,
        storeId,
        changedProduct.newPrice,
        importedAt
      );
      const ref = db
        .collection('users')
        .doc(pathData.uid)
        .collection('priceAlerts')
        .doc(notificationId);

      batch.set(
        ref,
        {
          id: notificationId,
          type: 'price_change',
          userId: pathData.uid,
          lovedOneId: pathData.lovedOneId,
          lovedOneName,
          giftPlanId: pathData.giftPlanId,
          giftPurpose: giftPlan.purpose || '',
          productId,
          productKey: getProductIdentityKey(selectedProduct),
          productName: selectedProduct.name || changedProduct.product.name,
          storeId,
          storeName,
          oldPrice: changedProduct.previousStorePrice,
          previousStorePrice: changedProduct.previousStorePrice,
          newPrice: changedProduct.newPrice,
          changeAmount: changedProduct.changeAmount,
          changeDirection: changedProduct.changeDirection,
          currency: selectedProduct.currency || currency,
          importedAt,
          createdAt: now,
          readAt: null,
          highlightSeenAt: null,
        },
        { merge: true }
      );
      createdCount += 1;
    });
  }

  if (createdCount > 0) {
    await batch.commit();
  }

  return createdCount;
}

function getProductEffectivePriceDetails(product: ProductImportItem) {
  const currentPrice = Number(product?.price?.current ?? product?.price);

  if (!Number.isFinite(currentPrice)) return null;

  const promo = product?.promo;
  const hasPromoCode = Boolean(promo?.hasPromoCode || promo?.code);
  const promoDiscountPercent = Number(promo?.discountPercent);
  const promoDiscountAmount = Number(promo?.discountAmount ?? promo?.discount);
  let promoDiscount = 0;

  if (hasPromoCode) {
    if (Number.isFinite(promoDiscountPercent) && promoDiscountPercent > 0) {
      promoDiscount = (currentPrice * promoDiscountPercent) / 100;
    } else if (Number.isFinite(promoDiscountAmount) && promoDiscountAmount > 0) {
      promoDiscount = promoDiscountAmount;
    }
  }

  promoDiscount = Math.min(currentPrice, Math.max(0, Number(promoDiscount.toFixed(2))));
  const effectivePrice = Number((currentPrice - promoDiscount).toFixed(2));
  const baseDiscount = Number(product?.price?.discount) || 0;
  const baseDiscountPercent = Number(product?.price?.discountPercent) || 0;
  const originalPrice = Number.isFinite(Number(product?.price?.original))
    ? Number(product?.price?.original)
    : currentPrice;
  const hasDiscount = Boolean(
    product?.price?.hasDiscount ||
    baseDiscount > 0 ||
    baseDiscountPercent > 0 ||
    originalPrice > currentPrice ||
    promoDiscount > 0
  );

  return {
    effectivePrice,
    currentPrice,
    promoDiscount,
    promoCode: promo?.code ? String(promo.code) : '',
    promoDiscountPercent: Number.isFinite(promoDiscountPercent) && promoDiscountPercent > 0 ? promoDiscountPercent : 0,
    promoNote: promo?.note ? String(promo.note) : '',
    hasPromoCode,
    baseDiscount,
    baseDiscountPercent,
    originalPrice,
    hasDiscount,
  };
}

export async function refreshGiftPlanProductPricesForImport({
  storeId,
  storeName,
  importedProducts,
  currency = 'RON',
}: {
  storeId: string;
  storeName: string;
  importedProducts: ProductImportItem[];
  currency?: string;
}) {
  const snapshot = await db.collectionGroup('giftPlans').get();
  const batches: ReturnType<typeof db.batch>[] = [db.batch()];
  let opsInCurrentBatch = 0;
  let updatedPlansCount = 0;

  for (const doc of snapshot.docs) {
    const giftPlan = doc.data();

    if (giftPlan.status !== 'planned') continue;

    const selectedProducts = Array.isArray(giftPlan.selectedProducts)
      ? giftPlan.selectedProducts
      : [];

    let changed = false;
    const updatedProducts = selectedProducts.map((selectedProduct: any) => {
      if (selectedProduct?.isPurchased) return selectedProduct;
      if (!selectedProduct?.storeId || selectedProduct.storeId !== storeId) return selectedProduct;

      const importedProduct = importedProducts.find((p) =>
        matchesImportedProduct(selectedProduct, p)
      );

      if (!importedProduct) return selectedProduct;

      const details = getProductEffectivePriceDetails(importedProduct);
      if (!details) return selectedProduct;

      changed = true;
      return {
        ...selectedProduct,
        price: details.effectivePrice,
        priceBeforePromo: details.hasPromoCode && details.promoDiscount > 0 ? details.currentPrice : undefined,
        originalPrice: details.originalPrice,
        discount: details.baseDiscount,
        discountPercent: details.baseDiscountPercent,
        hasDiscount: details.hasDiscount,
        hasPromoCode: details.hasPromoCode,
        promoCode: details.promoCode,
        promoDiscount: details.promoDiscount,
        promoDiscountPercent: details.promoDiscountPercent,
        promoNote: details.promoNote,
        currency: currency,
        storeName,
        ...(importedProduct.productUrl ? { productUrl: importedProduct.productUrl } : {}),
        ...(importedProduct.affiliateUrl ? { affiliateUrl: importedProduct.affiliateUrl } : {}),
        ...(importedProduct.imageUrl ? { imageUrl: importedProduct.imageUrl } : {}),
        ...(importedProduct.availability?.inStock !== undefined ? { inStock: importedProduct.availability.inStock } : {}),
        ...(importedProduct.availability?.stockStatus ? { availabilityStatus: importedProduct.availability.stockStatus } : {}),
      };
    });

    if (!changed) continue;

    if (opsInCurrentBatch >= 490) {
      batches.push(db.batch());
      opsInCurrentBatch = 0;
    }

    batches[batches.length - 1].update(doc.ref, { selectedProducts: updatedProducts });
    opsInCurrentBatch++;
    updatedPlansCount++;
  }

  if (updatedPlansCount > 0) {
    await Promise.all(batches.map((batch) => batch.commit()));
  }

  return updatedPlansCount;
}

function alertsCollection(uid: string) {
  return db.collection('users').doc(uid).collection('priceAlerts');
}

export async function getPriceAlerts(uid: string) {
  const snapshot = await alertsCollection(uid).limit(200).get();

  return snapshot.docs
    .map((doc) => doc.data())
    .filter((item) => !item.deletedAt)
    .sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    )
    .slice(0, 50);
}

export async function markPriceAlertRead(uid: string, notificationId: string) {
  const ref = alertsCollection(uid).doc(notificationId);

  await ref.update({
    readAt: new Date().toISOString(),
  });

  const updated = await ref.get();
  return updated.data();
}

export async function markAllPriceAlertsRead(uid: string) {
  const snapshot = await alertsCollection(uid).limit(200).get();
  const batch = db.batch();
  const readAt = new Date().toISOString();
  let changed = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    if (data.deletedAt || data.readAt) return;

    batch.update(doc.ref, { readAt });
    changed += 1;
  });

  if (changed > 0) {
    await batch.commit();
  }

  return getPriceAlerts(uid);
}

export async function deletePriceAlerts(
  uid: string,
  mode: 'read' | 'all'
) {
  const snapshot = await alertsCollection(uid).limit(200).get();
  const batch = db.batch();
  const deletedAt = new Date().toISOString();
  let changed = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    if (data.deletedAt) return;
    if (mode === 'read' && !data.readAt) return;

    batch.update(doc.ref, { deletedAt });
    changed += 1;
  });

  if (changed > 0) {
    await batch.commit();
  }

  return getPriceAlerts(uid);
}

export async function markPriceAlertHighlightSeen(
  uid: string,
  notificationId: string
) {
  const ref = alertsCollection(uid).doc(notificationId);

  await ref.update({
    highlightSeenAt: new Date().toISOString(),
  });

  const updated = await ref.get();
  return updated.data();
}
