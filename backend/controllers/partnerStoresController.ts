import { Request, Response } from 'express';
import { db } from '../config/firebase';
import {
  createPartnerStore,
  getPartnerStoreById,
  getPartnerStores,
  ProductImportItem,
  updatePartnerStoreProducts,
} from '../services/partnerStoresService';
import { createPriceDropAlertsForImport, refreshGiftPlanProductPricesForImport } from '../services/priceAlertsService';

function normalizeProductText(value?: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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

function getYearFromDateKey(value?: string) {
  const match = String(value || '').match(/^(\d{4})-/);
  return match ? Number(match[1]) : null;
}

function matchesProduct(product: any, target: any) {
  const productKey = getProductIdentityKey(product);
  const targetKey = getProductIdentityKey(target);
  const externalId = normalizeProductText(product.externalId);
  const targetExternalId = normalizeProductText(target.externalId);
  const productId = normalizeProductText(product.productId || product.id);
  const targetProductId = normalizeProductText(target.productId || target.id);

  if (externalId && targetExternalId && externalId === targetExternalId) return true;
  if (productId && targetProductId && productId === targetProductId) return true;

  return productKey.length > 0 && productKey === targetKey;
}

function isPurchasedFromCurrentStore(product: any, storeId: string) {
  return Boolean(
    product?.isPurchased &&
      product?.storeId === storeId &&
      (product?.purchasedFromImportedStore ||
        normalizeProductText(product?.purchasedStoreName) ===
          normalizeProductText(product?.storeName))
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

function validateCui(input: string) {
  const normalized = input.toUpperCase().replace(/^RO/, '').replace(/\s/g, '');
  return /^\d{2,10}$/.test(normalized);
}

function validateTradeRegisterNumber(input: string) {
  const normalized = input.trim();
  return /^[JFC]\d{2}\/\d{1,8}\/\d{4}$/i.test(normalized) || /^\d{3,20}$/.test(normalized);
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function buildStorePayload(body: any) {
  const companyName = String(body.companyName || '').trim();
  const cui = String(body.cui || '').trim().toUpperCase();
  const tradeRegisterNumber = String(body.tradeRegisterNumber || '').trim().toUpperCase();
  const displayName = String(body.displayName || '').trim();
  const contractStartDate = String(body.contractStartDate || '').trim();
  const contractEndDate = String(body.contractEndDate || '').trim();
  const brandImageUri = String(body.brandImageUri || '').trim();

  if (!companyName) {
    return { error: 'Numele firmei este obligatoriu.' };
  }

  if (!validateCui(cui)) {
    return { error: 'CUI invalid.' };
  }

  if (!validateTradeRegisterNumber(tradeRegisterNumber)) {
    return { error: 'Numarul de registru este invalid.' };
  }

  if (!displayName) {
    return { error: 'Numele de afisat este obligatoriu.' };
  }

  if (!isValidDateKey(contractStartDate) || !isValidDateKey(contractEndDate)) {
    return { error: 'Perioada contractuala este invalida.' };
  }

  if (contractEndDate < contractStartDate) {
    return { error: 'Data de final nu poate fi inaintea datei de inceput.' };
  }

  return {
    payload: {
      companyName,
      cui,
      tradeRegisterNumber,
      displayName,
      contractStartDate,
      contractEndDate,
      ...(brandImageUri ? { brandImageUri } : {}),
    },
  };
}

function normalizeProducts(products: any[]) {
  return products
    .map((item, index): ProductImportItem => {
      const name = String(
        item.name || item.title || item.denumire || `Produs ${index + 1}`
      ).trim();
      const rawPrice = item.price ?? item.pret ?? {};
      const price =
        typeof rawPrice === 'object'
          ? {
              ...(rawPrice.current !== undefined
                ? { current: Number(rawPrice.current) }
                : {}),
              ...(rawPrice.original !== undefined
                ? { original: Number(rawPrice.original) }
                : {}),
              ...(rawPrice.discount !== undefined
                ? { discount: Number(rawPrice.discount) }
                : {}),
              ...(rawPrice.discountPercent !== undefined
                ? { discountPercent: Number(rawPrice.discountPercent) }
                : {}),
              ...(rawPrice.hasDiscount !== undefined
                ? { hasDiscount: Boolean(rawPrice.hasDiscount) }
                : {}),
            }
          : { current: Number(rawPrice) };
      const availability = item.availability || {};
      const promo = item.promo || {};

      return {
        ...(item.id ? { id: String(item.id) } : {}),
        ...(item.externalId ? { externalId: String(item.externalId) } : {}),
        name,
        ...(item.brand ? { brand: String(item.brand) } : {}),
        ...(item.category || item.categorie
          ? { category: String(item.category || item.categorie) }
          : {}),
        ...(item.subcategory || item.subcategorie
          ? { subcategory: String(item.subcategory || item.subcategorie) }
          : {}),
        ...(item.sku || item.cod ? { sku: String(item.sku || item.cod) } : {}),
        ...(item.productUrl ? { productUrl: String(item.productUrl) } : {}),
        ...(item.affiliateUrl ? { affiliateUrl: String(item.affiliateUrl) } : {}),
        ...(item.imageUrl ? { imageUrl: String(item.imageUrl) } : {}),
        ...(price.current !== undefined && Number.isFinite(price.current)
          ? { price }
          : {}),
        ...(promo.hasPromoCode ||
        promo.code ||
        promo.discount ||
        promo.discountAmount ||
        promo.discountPercent
          ? {
              promo: {
                ...(promo.hasPromoCode !== undefined
                  ? { hasPromoCode: Boolean(promo.hasPromoCode) }
                  : {}),
                ...(promo.code ? { code: String(promo.code) } : {}),
                ...(promo.discount !== undefined
                  ? { discount: Number(promo.discount) }
                  : {}),
                ...(promo.discountAmount !== undefined
                  ? { discountAmount: Number(promo.discountAmount) }
                  : {}),
                ...(promo.discountPercent !== undefined
                  ? { discountPercent: Number(promo.discountPercent) }
                  : {}),
                ...(promo.note ? { note: String(promo.note) } : {}),
              },
            }
          : {}),
        ...(availability.inStock !== undefined || availability.stockStatus
          ? {
              availability: {
                ...(availability.inStock !== undefined
                  ? { inStock: Boolean(availability.inStock) }
                  : {}),
                ...(availability.stockStatus
                  ? { stockStatus: String(availability.stockStatus) }
                  : {}),
              },
            }
          : {}),
      };
    })
    .filter((item) => item.name.length > 0);
}

function normalizeImportMetadata(body: any) {
  const merchant = body.merchant || {};

  return {
    ...(body.source ? { source: String(body.source) } : {}),
    ...(body.currency ? { currency: String(body.currency) } : {}),
    ...(body.lastUpdated ? { lastUpdated: String(body.lastUpdated) } : {}),
    ...(merchant.name || merchant.domain || merchant.affiliateNetwork
      ? {
          merchant: {
            ...(merchant.name ? { name: String(merchant.name) } : {}),
            ...(merchant.domain ? { domain: String(merchant.domain) } : {}),
            ...(merchant.affiliateNetwork
              ? { affiliateNetwork: String(merchant.affiliateNetwork) }
              : {}),
          },
        }
      : {}),
  };
}

export async function getAll(req: Request, res: Response) {
  try {
    const data = await getPartnerStores();
    return res.status(200).json(data);
  } catch (error) {
    console.error('GET PARTNER STORES ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut prelua magazinele.' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const result = buildStorePayload(req.body);

    if ('error' in result) {
      return res.status(400).json({ message: result.error });
    }

    const store = await createPartnerStore({
      ...result.payload,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json(store);
  } catch (error) {
    console.error('CREATE PARTNER STORE ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut salva magazinul.' });
  }
}

export async function importProducts(req: Request, res: Response) {
  try {
    const storeId = getParam(req.params.storeId);
    const existing = await getPartnerStoreById(storeId);

    if (!existing) {
      return res.status(404).json({ message: 'Magazinul nu a fost gasit.' });
    }

    const products = Array.isArray(req.body.products)
      ? normalizeProducts(req.body.products)
      : [];

    if (!products.length) {
      return res.status(400).json({ message: 'Nu exista produse valide in fisier.' });
    }

    const importedAt = new Date().toISOString();
    const store = await updatePartnerStoreProducts(
      storeId,
      products,
      String(req.body.lastImportName || '').trim() || undefined,
      normalizeImportMetadata(req.body)
    );
    const storeName = existing.displayName || existing.companyName || existing.source || 'Magazin';
    const currency = String(req.body.currency || existing.currency || 'RON');

    try {
      await refreshGiftPlanProductPricesForImport({
        storeId,
        storeName,
        importedProducts: products,
        currency,
      });
    } catch (refreshError) {
      console.error('REFRESH GIFT PLAN PRICES ERROR:', refreshError);
    }

    try {
      await createPriceDropAlertsForImport({
        storeId,
        storeName,
        previousProducts: existing.products || [],
        importedProducts: products,
        currency,
        importedAt,
      });
    } catch (alertError) {
      console.error('CREATE PRICE ALERTS ERROR:', alertError);
    }

    return res.status(200).json(store);
  } catch (error) {
    console.error('IMPORT PRODUCTS ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut importa produsele.' });
  }
}

export async function getProductUsage(req: Request, res: Response) {
  try {
    const storeId = getParam(req.params.storeId);
    const existing = await getPartnerStoreById(storeId);

    if (!existing) {
      return res.status(404).json({ message: 'Magazinul nu a fost gasit.' });
    }

    const target = {
      productKey: String(req.query.productKey || '').trim(),
      productId: String(req.query.productId || '').trim(),
      externalId: String(req.query.externalId || '').trim(),
      id: String(req.query.id || '').trim(),
      name: String(req.query.name || '').trim(),
      brand: String(req.query.brand || '').trim(),
      category: String(req.query.category || '').trim(),
      subcategory: String(req.query.subcategory || '').trim(),
    };

    if (!target.name && !target.productKey && !target.productId && !target.externalId && !target.id) {
      return res.status(400).json({ message: 'Produs invalid pentru statistici.' });
    }

    const snapshot = await db.collectionGroup('giftPlans').get();
    const occurrences: any[] = [];

    snapshot.docs.forEach((doc) => {
      const giftPlan = doc.data();
      const selectedProducts = Array.isArray(giftPlan.selectedProducts)
        ? giftPlan.selectedProducts
        : [];

      selectedProducts.forEach((product: any) => {
        if (product?.storeId !== storeId) return;
        if (!matchesProduct(product, target)) return;

        const purchasedFromThisStore = isPurchasedFromCurrentStore(product, storeId);

        occurrences.push({
          giftPlanId: giftPlan.id || doc.id,
          lovedOneId: giftPlan.lovedOneId || '',
          purpose: giftPlan.purpose || '',
          status: giftPlan.status || 'planned',
          giftDate: giftPlan.deadlineDate || '',
          purchaseDeadlineDate: giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate || '',
          year: getYearFromDateKey(giftPlan.deadlineDate),
          addedAt: product.addedAt || giftPlan.createdAt || '',
          price: Number(product.price || 0),
          isPurchased: Boolean(product.isPurchased),
          purchasedAt: product.purchasedAt || giftPlan.completedAt || '',
          purchasedStoreName: product.purchasedStoreName || '',
          purchasePrice: Number(product.purchasePrice || 0),
          purchasedFromThisStore,
        });
      });
    });

    const purchasedFromThisStoreCount = occurrences.filter(
      (item) => item.purchasedFromThisStore
    ).length;
    const addedWithoutPurchaseFromThisStoreCount = occurrences.filter(
      (item) => !item.purchasedFromThisStore
    ).length;
    const years = Array.from(
      new Set(
        occurrences
          .map((item) => item.year)
          .filter((year) => typeof year === 'number')
      )
    ).sort((a, b) => b - a);
    const purposes = Array.from(
      new Set(
        occurrences
          .map((item) => String(item.purpose || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      product: target,
      totalAddedCount: occurrences.length,
      purchasedFromThisStoreCount,
      addedWithoutPurchaseFromThisStoreCount,
      years,
      purposes,
      occurrences,
    });
  } catch (error) {
    console.error('GET PRODUCT USAGE ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut calcula statisticile produsului.' });
  }
}
