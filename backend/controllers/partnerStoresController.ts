import { Request, Response } from 'express';
import {
  createPartnerStore,
  getPartnerStoreById,
  getPartnerStores,
  ProductImportItem,
  updatePartnerStoreProducts,
} from '../services/partnerStoresService';

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

    const store = await updatePartnerStoreProducts(
      storeId,
      products,
      String(req.body.lastImportName || '').trim() || undefined,
      normalizeImportMetadata(req.body)
    );

    return res.status(200).json(store);
  } catch (error) {
    console.error('IMPORT PRODUCTS ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut importa produsele.' });
  }
}
