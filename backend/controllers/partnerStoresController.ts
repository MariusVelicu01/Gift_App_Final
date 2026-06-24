import { Request, Response } from 'express';
import { db } from '../config/firebase';
import {
  createPartnerStore,
  getPartnerStoreById,
  getPartnerStores,
  ProductImportItem,
  updatePartnerStore,
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

  const affiliateRaw = body.affiliate || {};
  const commissionPercent = Number(affiliateRaw.commissionPercent);
  const affiliate =
    Number.isFinite(commissionPercent) && commissionPercent >= 0
      ? {
          commissionPercent,
          ...(affiliateRaw.network ? { network: String(affiliateRaw.network).trim() } : {}),
          ...(affiliateRaw.programId ? { programId: String(affiliateRaw.programId).trim() } : {}),
          ...(affiliateRaw.paymentTermDays !== undefined
            ? { paymentTermDays: Number(affiliateRaw.paymentTermDays) }
            : {}),
        }
      : null;

  return {
    payload: {
      companyName,
      cui,
      tradeRegisterNumber,
      displayName,
      contractStartDate,
      contractEndDate,
      ...(brandImageUri ? { brandImageUri } : {}),
      ...(affiliate ? { affiliate } : {}),
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
        ...(() => {
          const aff = item.affiliate || {};
          const pct = Number(aff.commissionPercent);
          if (!Number.isFinite(pct) || pct <= 0) return {};
          return { affiliate: { commissionPercent: pct } };
        })(),
        ...(['barbati', 'femei', 'unisex'].includes(item.gender) ? { gender: item.gender } : {}),
      };
    })
    .filter((item) => item.name.length > 0);
}

function normalizeImportMetadata(body: any) {
  const merchant = body.merchant || {};
  const affiliateProgram = body.affiliateProgram || {};
  const defaultPct = Number(affiliateProgram.defaultCommissionPercent ?? affiliateProgram.maxCommissionPercent);
  const resolvedPct = Number.isFinite(defaultPct) && defaultPct > 0 ? defaultPct : null;

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
    ...(resolvedPct
      ? {
          affiliate: {
            commissionPercent: resolvedPct,
            ...(affiliateProgram.cookieDurationDays !== undefined
              ? { paymentTermDays: Number(affiliateProgram.cookieDurationDays) }
              : {}),
          },
        }
      : {}),
    ...(() => {
      const pi = body.promotionIndicator;
      if (!pi || !pi.hasPromotion) return {};
      return {
        promotionIndicator: {
          hasPromotion: Boolean(pi.hasPromotion),
          ...(pi.code ? { code: String(pi.code) } : {}),
          ...(pi.discountPercent !== undefined ? { discountPercent: Number(pi.discountPercent) } : {}),
          ...(pi.hasMinimumOrderValue !== undefined ? { hasMinimumOrderValue: Boolean(pi.hasMinimumOrderValue) } : {}),
          ...(pi.minimumOrderValue !== undefined ? { minimumOrderValue: Number(pi.minimumOrderValue) } : {}),
          ...(pi.currency ? { currency: String(pi.currency) } : {}),
          ...(pi.note ? { note: String(pi.note) } : {}),
          ...(pi.hasLimitedDuration ? { hasLimitedDuration: true } : {}),
          ...(() => {
            const dur = pi.duration || {};
            const endDate = String(dur.endDate || '').trim();
            const startDate = String(dur.startDate || '').trim();
            if (!endDate && !startDate) return {};
            return { duration: { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) } };
          })(),
        },
      };
    })(),
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

export async function update(req: Request, res: Response) {
  try {
    const storeId = getParam(req.params.storeId);
    const existing = await getPartnerStoreById(storeId);

    if (!existing) {
      return res.status(404).json({ message: 'Magazinul nu a fost gasit.' });
    }

    const result = buildStorePayload(req.body);

    if ('error' in result) {
      return res.status(400).json({ message: result.error });
    }

    const store = await updatePartnerStore(storeId, result.payload);

    return res.status(200).json(store);
  } catch (error) {
    console.error('UPDATE PARTNER STORE ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut actualiza magazinul.' });
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
        importedAt,
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

function getMonthKey(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function lastDayOfCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export async function getAffiliateStats(req: Request, res: Response) {
  try {
    const storeId = getParam(req.params.storeId);
    const existing = await getPartnerStoreById(storeId);

    if (!existing) {
      return res.status(404).json({ message: 'Magazinul nu a fost gasit.' });
    }

    const storeCommissionPct = Number((existing as any)?.affiliate?.commissionPercent || 0);
    const paymentTermDays = Number((existing as any)?.affiliate?.paymentTermDays || 30);

    const storeProducts = Array.isArray((existing as any).products) ? (existing as any).products : [];
    const catalogPctByExternalId = new Map<string, number>();
    const catalogPctByName = new Map<string, number>();
    storeProducts.forEach((p: any) => {
      const pct = Number(p?.affiliate?.commissionPercent);
      if (Number.isFinite(pct) && pct > 0) {
        if (p.externalId) catalogPctByExternalId.set(String(p.externalId), pct);
        if (p.name) catalogPctByName.set(String(p.name).toLowerCase().trim(), pct);
      }
    });

    const snapshot = await db.collectionGroup('giftPlans').get();
    const curMonth = currentMonthKey();

    let conversions = 0;
    let currentMonthExpected = 0;  // luna curentă
    let previousMonthsPending = 0; // luni anterioare, neprimite
    let totalReceived = 0;
    let commissionPercent = storeCommissionPct;
    let earliestPendingPurchaseDate: string | null = null; // pentru calculul datei de plată

    const products: {
      name: string;
      commissionPercent: number;
      expectedAmount: number;
      receivedAmount: number;
      status: string;
      purchasePrice: number;
      purchasedAt?: string;
      paymentDueDate?: string;
    }[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const giftPlanPurchasedAt = String(data.completedAt || data.updatedAt || '');
      const selectedProducts = Array.isArray(data.selectedProducts) ? data.selectedProducts : [];

      selectedProducts.forEach((product: any) => {
        const productStoreId = String(product?.storeId || '');
        if (productStoreId !== storeId) return;
        if (!product?.isPurchased) return;

        const commission = product?.affiliateCommission;
        const purchasePrice = Number(product.purchasePrice || product.price || 0);
        const purchasedAt = String(product.purchasedAt || giftPlanPurchasedAt || '');

        let pct: number;
        let expected: number;
        let received: number;
        let status: string;

        if (!commission || commission.status === 'not_applicable') {
          const externalId = String(product.externalId || '');
          const productName = String(product.name || '').toLowerCase().trim();
          const retroPct =
            (externalId && catalogPctByExternalId.get(externalId)) ||
            (productName && catalogPctByName.get(productName)) ||
            commissionPercent;
          if (!retroPct || !purchasePrice) return;
          pct = retroPct;
          expected = Math.round((purchasePrice * pct / 100) * 100) / 100;
          received = 0;
          status = 'pending';
        } else {
          pct = Number(commission.commissionPercent || 0);
          expected = Number(commission.expectedAmount || 0);
          received = Number(commission.receivedAmount || 0);
          status = String(commission.status || 'pending');
        }

        conversions += 1;
        if (pct > 0) commissionPercent = pct;

        const purchaseMonthKey = getMonthKey(purchasedAt);
        const paymentDueDate = purchasedAt ? addDays(purchasedAt, paymentTermDays) : '';

        if (status === 'received') {
          totalReceived = Math.round((totalReceived + received) * 100) / 100;
        } else {
          if (purchaseMonthKey === curMonth) {
            currentMonthExpected = Math.round((currentMonthExpected + expected) * 100) / 100;
          } else {
            previousMonthsPending = Math.round((previousMonthsPending + expected) * 100) / 100;
            if (purchasedAt && (!earliestPendingPurchaseDate || purchasedAt < earliestPendingPurchaseDate)) {
              earliestPendingPurchaseDate = purchasedAt;
            }
          }
        }

        products.push({
          name: String(product.name || ''),
          commissionPercent: pct,
          expectedAmount: expected,
          receivedAmount: received,
          status,
          purchasePrice,
          purchasedAt: purchasedAt || undefined,
          paymentDueDate: paymentDueDate || undefined,
        });
      });
    });

    const nextPaymentDate = previousMonthsPending > 0 ? lastDayOfCurrentMonth() : null;
    const daysUntilPayment = nextPaymentDate ? daysFromNow(nextPaymentDate) : null;

    return res.status(200).json({
      storeId,
      commissionPercent,
      paymentTermDays,
      conversions,
      currentMonthExpected,
      previousMonthsPending,
      totalReceived,
      nextPaymentDate,
      daysUntilPayment,
      products,
    });
  } catch (error) {
    console.error('GET AFFILIATE STATS ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut calcula statisticile afiliate.' });
  }
}

export async function getAffiliateSummary(req: Request, res: Response) {
  try {
    const allStores = await getPartnerStores();

    const storeCommissionMap = new Map<string, number>();
    const catalogPctByStoreAndExternalId = new Map<string, Map<string, number>>();
    const catalogPctByStoreAndName = new Map<string, Map<string, number>>();

    allStores.forEach((store: any) => {
      const storeId = store.id;
      const storePct = Number(store?.affiliate?.commissionPercent || 0);
      if (storePct > 0) storeCommissionMap.set(storeId, storePct);

      const byExternalId = new Map<string, number>();
      const byName = new Map<string, number>();
      (store.products || []).forEach((p: any) => {
        const pct = Number(p?.affiliate?.commissionPercent || storePct || 0);
        if (pct > 0) {
          if (p.externalId) byExternalId.set(String(p.externalId), pct);
          if (p.name) byName.set(String(p.name).toLowerCase().trim(), pct);
        }
      });
      catalogPctByStoreAndExternalId.set(storeId, byExternalId);
      catalogPctByStoreAndName.set(storeId, byName);
    });

    const snapshot = await db.collectionGroup('giftPlans').get();

    const storeMap = new Map<string, {
      storeId: string;
      storeName: string;
      conversions: number;
      totalExpected: number;
      totalReceived: number;
      commissionPercent: number;
    }>();

    const curMonth = currentMonthKey();
    let globalCurrentMonth = 0;
    let globalPreviousPending = 0;
    let globalReceived = 0;
    let globalEarliestPending: string | null = null;
    let globalPaymentTermDays = 30;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      (Array.isArray(data.selectedProducts) ? data.selectedProducts : []).forEach((product: any) => {
        const storeId = String(product?.storeId || '');
        if (!storeId || storeId === 'manual') return;
        if (!product?.isPurchased) return;

        const commission = product?.affiliateCommission;
        const purchasePrice = Number(product.purchasePrice || product.price || 0);
        const byExternalId = catalogPctByStoreAndExternalId.get(storeId);
        const byName = catalogPctByStoreAndName.get(storeId);
        const storePct = storeCommissionMap.get(storeId) || 0;

        let pct: number;
        let expected: number;
        let received: number;
        let status: string;

        if (!commission || commission.status === 'not_applicable') {
          const externalId = String(product.externalId || '');
          const productName = String(product.name || '').toLowerCase().trim();
          const retroPct =
            (externalId && byExternalId?.get(externalId)) ||
            (productName && byName?.get(productName)) ||
            storePct;
          if (!retroPct || !purchasePrice) return;
          pct = retroPct;
          expected = Math.round((purchasePrice * pct / 100) * 100) / 100;
          received = 0;
          status = 'pending';
        } else {
          pct = Number(commission.commissionPercent || 0);
          expected = Number(commission.expectedAmount || 0);
          received = Number(commission.receivedAmount || 0);
          status = String(commission.status || 'pending');
          if (!pct && !expected) return;
        }

        const purchasedAt = String(product.purchasedAt || data.completedAt || '');
        const purchaseMonthKey = getMonthKey(purchasedAt);
        const storePaymentTermDays = Number((allStores as any[]).find((s: any) => s.id === storeId)?.affiliate?.paymentTermDays || 30);

        const existing = storeMap.get(storeId) || {
          storeId,
          storeName: String(product.storeName || storeId),
          conversions: 0,
          totalExpected: 0,
          totalReceived: 0,
          commissionPercent: pct,
        };
        existing.conversions += 1;
        existing.totalExpected = Math.round((existing.totalExpected + expected) * 100) / 100;
        if (status === 'received') existing.totalReceived = Math.round((existing.totalReceived + received) * 100) / 100;
        if (pct > existing.commissionPercent) existing.commissionPercent = pct;
        storeMap.set(storeId, existing);

        if (status !== 'received') {
          if (purchaseMonthKey === curMonth) {
            globalCurrentMonth = Math.round((globalCurrentMonth + expected) * 100) / 100;
          } else {
            globalPreviousPending = Math.round((globalPreviousPending + expected) * 100) / 100;
            if (purchasedAt && (!globalEarliestPending || purchasedAt < globalEarliestPending)) {
              globalEarliestPending = purchasedAt;
              globalPaymentTermDays = storePaymentTermDays;
            }
          }
        } else {
          globalReceived = Math.round((globalReceived + received) * 100) / 100;
        }
      });
    });

    const stores = Array.from(storeMap.values()).sort((a, b) => b.totalExpected - a.totalExpected);
    const nextPaymentDate = globalPreviousPending > 0 ? lastDayOfCurrentMonth() : null;
    const totals = {
      conversions: stores.reduce((s, x) => s + x.conversions, 0),
      currentMonthExpected: globalCurrentMonth,
      previousMonthsPending: globalPreviousPending,
      totalReceived: globalReceived,
      nextPaymentDate,
      daysUntilPayment: nextPaymentDate ? daysFromNow(nextPaymentDate) : null,
    };

    return res.status(200).json({ totals, stores });
  } catch (error) {
    console.error('GET AFFILIATE SUMMARY ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut calcula sumarul afiliat.' });
  }
}
