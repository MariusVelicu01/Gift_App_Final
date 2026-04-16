import { Request, Response } from 'express';
import { getLovedOneById } from '../services/lovedOnesService';
import {
  completeGiftPlan,
  createGiftPlan,
  deleteGiftPlan,
  getGiftPlanById,
  getGiftPlans,
  GiftPurpose,
  offerGiftPlan,
  updateGiftPlan,
  updateGiftPlanProducts,
} from '../services/giftPlansService';

const PURPOSES: GiftPurpose[] = [
  'Zi de nastere',
  'Craciun',
  'Paste',
  'Zi de nume',
  'Aniversare',
  'Multumire',
  'Alta ocazie',
];

const PURPOSES_WITH_FIXED_DATE: GiftPurpose[] = [
  'Zi de nastere',
  'Craciun',
  'Paste',
];

const ORTHODOX_EASTER_DATES = [
  '2026-04-12',
  '2027-05-02',
  '2028-04-16',
  '2029-04-08',
  '2030-04-28',
  '2031-04-13',
  '2032-05-02',
  '2033-04-24',
  '2034-04-09',
  '2035-04-29',
  '2036-04-20',
  '2037-04-05',
  '2038-04-25',
  '2039-04-17',
  '2040-05-06',
  '2041-04-21',
  '2042-04-13',
  '2043-05-03',
  '2044-04-24',
  '2045-04-09',
  '2046-04-29',
  '2047-04-21',
  '2048-04-05',
  '2049-04-25',
  '2050-04-17',
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function getTodayKey() {
  return toDateKey(new Date());
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

function isExpired(deadlineDate: string) {
  return deadlineDate < getTodayKey();
}

function startOfDayTimestamp(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function calculateDaysUntilCompleted(createdAt: unknown, completedAt: Date) {
  const createdDate = new Date(String(createdAt || completedAt.toISOString()));

  if (Number.isNaN(createdDate.getTime())) {
    return 1;
  }

  const diff =
    startOfDayTimestamp(completedAt) - startOfDayTimestamp(createdDate);

  return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function dateFromDateKey(dateKey: unknown) {
  const [year, month, day] = String(dateKey || '')
    .split('-')
    .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizePastOrTodayDate(dateValue: unknown, fieldLabel: string) {
  const rawDate = String(dateValue || '').trim();
  const date = rawDate ? dateFromDateKey(rawDate) : new Date();

  if (!date) {
    return { error: `${fieldLabel} este invalida.` };
  }

  if (startOfDayTimestamp(date) > startOfDayTimestamp(new Date())) {
    return { error: `${fieldLabel} nu poate fi in viitor.` };
  }

  return { date };
}

function calculateDaysRemainingUntilGift(
  deadlineDate: unknown,
  completedAt: Date
) {
  const deadline = dateFromDateKey(deadlineDate);

  if (!deadline) {
    return 0;
  }

  const diff = startOfDayTimestamp(deadline) - startOfDayTimestamp(completedAt);

  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function isValidDateParts(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function nextAnnualDate(day: number, month: number) {
  const today = new Date();
  let year = today.getFullYear();

  while (year <= today.getFullYear() + 10) {
    if (isValidDateParts(year, month, day)) {
      const dateKey = `${year}-${pad(month)}-${pad(day)}`;

      if (dateKey >= getTodayKey()) {
        return dateKey;
      }
    }

    year++;
  }

  return `${today.getFullYear() + 1}-${pad(month)}-${pad(day)}`;
}

function nextChristmasDate() {
  return nextAnnualDate(25, 12);
}

function nextEasterDate() {
  const todayKey = getTodayKey();
  return ORTHODOX_EASTER_DATES.find((date) => date >= todayKey) || null;
}

function normalizeCustomDate(body: any) {
  const parsedDay = Number(body.deadlineDay);
  const parsedMonth = Number(body.deadlineMonth);
  const parsedYear = Number(body.deadlineYear);

  if (
    !Number.isInteger(parsedDay) ||
    !Number.isInteger(parsedMonth) ||
    !Number.isInteger(parsedYear)
  ) {
    return { error: 'Completeaza data limita pentru cadou.' };
  }

  if (!isValidDateParts(parsedYear, parsedMonth, parsedDay)) {
    return { error: 'Data limita este invalida.' };
  }

  const dateKey = `${parsedYear}-${pad(parsedMonth)}-${pad(parsedDay)}`;

  if (dateKey < getTodayKey()) {
    return { error: 'Data limita nu poate fi in trecut.' };
  }

  return { deadlineDate: dateKey };
}

function normalizeDateParts(body: any, prefix: string, label: string) {
  const parsedDay = Number(body[`${prefix}Day`]);
  const parsedMonth = Number(body[`${prefix}Month`]);
  const parsedYear = Number(body[`${prefix}Year`]);

  if (!parsedDay || !parsedMonth || !parsedYear) {
    return { error: `Selecteaza ${label}.` };
  }

  if (!isValidDateParts(parsedYear, parsedMonth, parsedDay)) {
    return { error: `${label} este invalida.` };
  }

  const dateKey = `${parsedYear}-${pad(parsedMonth)}-${pad(parsedDay)}`;

  if (isExpired(dateKey)) {
    return { error: `${label} nu poate fi in trecut.` };
  }

  return { dateKey };
}

function withCanModify(giftPlan: any) {
  return {
    ...giftPlan,
    canModify: giftPlan.status === 'planned',
  };
}

function normalizeBudgetHistory(history: unknown, currentBudget: number, createdAt?: string) {
  const normalized = Array.isArray(history)
    ? history
        .map((entry: any) => {
          const value = Number(entry?.value);
          const changedAt = String(entry?.changedAt || '').trim();

          if (!Number.isFinite(value) || value <= 0 || !changedAt) {
            return null;
          }

          return {
            value,
            changedAt,
            reason: String(entry?.reason || '').trim(),
          };
        })
        .filter(Boolean)
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      value: currentBudget,
      changedAt: createdAt || new Date().toISOString(),
      reason: 'initial',
    },
  ];
}

function appendBudgetHistory(
  existing: any,
  nextBudget: number,
  reason: string,
  changedAt = new Date().toISOString()
) {
  const history = normalizeBudgetHistory(
    existing?.budgetHistory,
    Number(existing?.budget || nextBudget),
    String(existing?.createdAt || changedAt)
  );
  const previousBudget = Number(existing?.budget);

  if (Number.isFinite(previousBudget) && previousBudget === nextBudget) {
    return history;
  }

  return [
    ...history,
    {
      value: nextBudget,
      changedAt,
      reason,
    },
  ];
}

function normalizeSelectedProducts(products: unknown) {
  if (!Array.isArray(products)) {
    return { error: 'Lista de produse este invalida.' };
  }

  if (products.length > 50) {
    return { error: 'Poti adauga maximum 50 de produse pe un cadou.' };
  }

  const normalized = products.map((product: any, index) => {
    const name = String(product?.name || '').trim();
    const storeId = String(product?.storeId || '').trim();
    const price = Number(product?.price);
    const originalPrice = Number(product?.originalPrice);
    const discount = Number(product?.discount);
    const discountPercent = Number(product?.discountPercent);
    const purchasePrice = Number(product?.purchasePrice);

    if (!name || !storeId || !Number.isFinite(price) || price < 0) {
      throw new Error(`Produsul ${index + 1} este invalid.`);
    }

    return {
      id: String(product?.id || `${storeId}-${index}`),
      productKey: String(product?.productKey || '').trim(),
      productId: String(product?.productId || ''),
      externalId: String(product?.externalId || ''),
      storeId,
      storeName: String(product?.storeName || '').trim(),
      name,
      brand: String(product?.brand || '').trim(),
      category: String(product?.category || '').trim(),
      subcategory: String(product?.subcategory || '').trim(),
      productUrl: String(product?.productUrl || '').trim(),
      affiliateUrl: String(product?.affiliateUrl || '').trim(),
      imageUrl: String(product?.imageUrl || '').trim(),
      price,
      originalPrice: Number.isFinite(originalPrice) ? originalPrice : price,
      discount: Number.isFinite(discount) ? discount : 0,
      discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
      hasDiscount: Boolean(product?.hasDiscount),
      currency: String(product?.currency || 'RON').trim(),
      addedAt: String(product?.addedAt || new Date().toISOString()),
      isPurchased: Boolean(product?.isPurchased),
      purchasedAt: product?.isPurchased
        ? String(product?.purchasedAt || new Date().toISOString())
        : '',
      purchasedStoreName: product?.isPurchased
        ? String(product?.purchasedStoreName || product?.storeName || '').trim()
        : '',
      purchasePrice:
        product?.isPurchased && Number.isFinite(purchasePrice)
          ? purchasePrice
          : 0,
      purchasedFromImportedStore: Boolean(product?.purchasedFromImportedStore),
    };
  });

  return { selectedProducts: normalized };
}

function normalizeProductReactions(reactions: unknown, selectedProducts: any[]) {
  if (!Array.isArray(reactions)) {
    return { error: 'Adauga reactia pentru fiecare produs.' };
  }

  const normalized: {
    productId: string;
    productName: string;
    reactionRating: number;
    details: string;
  }[] = [];

  for (const product of selectedProducts) {
    const productId = String(product?.id || '').trim();

    if (!productId) {
      continue;
    }

    const reaction = reactions.find(
      (item: any) => String(item?.productId || '').trim() === productId
    ) as any;
    const reactionRating = Number(reaction?.reactionRating);

    if (
      !reaction ||
      !Number.isInteger(reactionRating) ||
      reactionRating < 1 ||
      reactionRating > 5
    ) {
      return {
        error: `Alege reactia pentru produsul ${String(product?.name || '').trim()}.`,
      };
    }

    normalized.push({
      productId,
      productName: String(reaction?.productName || product?.name || '').trim(),
      reactionRating,
      details: String(reaction?.details || '').trim(),
    });
  }

  return { productReactions: normalized };
}

async function buildGiftPlanPayload(uid: string, lovedOneId: string, body: any) {
  const lovedOne = await getLovedOneById(uid, lovedOneId);

  if (!lovedOne) {
    return { status: 404, error: 'Persoana nu a fost gasita.' };
  }

  const purpose = String(body.purpose || '').trim() as GiftPurpose;

  if (!PURPOSES.includes(purpose)) {
    return { status: 400, error: 'Scopul cadoului este invalid.' };
  }

  const budget = Number(body.budget);

  if (!Number.isFinite(budget) || budget <= 0) {
    return { status: 400, error: 'Bugetul este invalid.' };
  }

  let deadlineDate: string | null = null;
  let purchaseDeadlineDate: string | null = null;

  const hasManualDeadline =
    body.deadlineDay !== undefined ||
    body.deadlineMonth !== undefined ||
    body.deadlineYear !== undefined;

  if (hasManualDeadline) {
    const result = normalizeCustomDate(body);

    if ('error' in result) {
      return { status: 400, error: result.error };
    }

    deadlineDate = result.deadlineDate;
  } else if (purpose === 'Zi de nastere') {
    deadlineDate = nextAnnualDate(Number(lovedOne.day), Number(lovedOne.month));
  } else if (purpose === 'Craciun') {
    deadlineDate = nextChristmasDate();
  } else if (purpose === 'Paste') {
    deadlineDate = nextEasterDate();
  } else {
    const result = normalizeCustomDate(body);

    if ('error' in result) {
      return { status: 400, error: result.error };
    }

    deadlineDate = result.deadlineDate;
  }

  if (!deadlineDate) {
    return {
      status: 400,
      error: 'Nu exista o data disponibila pentru aceasta ocazie.',
    };
  }

  if (isExpired(deadlineDate)) {
    return { status: 400, error: 'Deadline-ul cadoului a expirat.' };
  }

  const purchaseDeadlineResult = normalizeDateParts(
    body,
    'purchaseDeadline',
    'deadline-ul pana cand vrei sa cumperi cadoul'
  );

  if ('error' in purchaseDeadlineResult) {
    return { status: 400, error: purchaseDeadlineResult.error };
  }

  purchaseDeadlineDate = purchaseDeadlineResult.dateKey;

  if (purchaseDeadlineDate > deadlineDate) {
    return {
      status: 400,
      error: 'Deadline-ul de cumparare nu poate fi dupa data oferirii cadoului.',
    };
  }

  return {
    payload: {
      purpose,
      budget,
      deadlineDate,
      purchaseDeadlineDate,
      requiresCustomDate:
        hasManualDeadline || !PURPOSES_WITH_FIXED_DATE.includes(purpose),
    },
  };
}

export async function getAllGiftPlans(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.lovedOneId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const lovedOne = await getLovedOneById(uid, lovedOneId);

    if (!lovedOne) {
      return res.status(404).json({ message: 'Persoana nu a fost gasita.' });
    }

    const giftPlans = await getGiftPlans(uid, lovedOneId);

    return res.status(200).json(giftPlans.map(withCanModify));
  } catch (error) {
    console.error('GET GIFT PLANS ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut prelua cadourile.' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.lovedOneId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const result = await buildGiftPlanPayload(uid, lovedOneId, req.body);

    if ('error' in result) {
      return res.status(result.status || 400).json({ message: result.error });
    }

    const createdAt = new Date().toISOString();
    const giftPlan = await createGiftPlan(uid, lovedOneId, {
      ...result.payload,
      status: 'planned',
      createdAt,
      budgetHistory: [
        {
          value: result.payload.budget,
          changedAt: createdAt,
          reason: 'initial',
        },
      ],
    });

    return res.status(201).json(withCanModify(giftPlan));
  } catch (error) {
    console.error('CREATE GIFT PLAN ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut salva cadoul.' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.lovedOneId);
    const giftPlanId = getParam(req.params.giftPlanId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const existing = await getGiftPlanById(uid, lovedOneId, giftPlanId);

    if (!existing) {
      return res.status(404).json({ message: 'Cadoul nu a fost gasit.' });
    }

    if (existing.status === 'completed' || existing.status === 'purchased') {
      return res.status(403).json({
        message: 'Cadoul cumparat sau finalizat nu mai poate fi modificat.',
      });
    }

    const result = await buildGiftPlanPayload(uid, lovedOneId, req.body);

    if ('error' in result) {
      return res.status(result.status || 400).json({ message: result.error });
    }

    const updatedAt = new Date().toISOString();
    const giftPlan = await updateGiftPlan(uid, lovedOneId, giftPlanId, {
      ...result.payload,
      status: 'planned',
      updatedAt,
      budgetHistory: appendBudgetHistory(
        existing,
        result.payload.budget,
        'manual',
        updatedAt
      ),
    });

    return res.status(200).json(withCanModify(giftPlan));
  } catch (error) {
    console.error('UPDATE GIFT PLAN ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut actualiza cadoul.' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.lovedOneId);
    const giftPlanId = getParam(req.params.giftPlanId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const existing = await getGiftPlanById(uid, lovedOneId, giftPlanId);

    if (!existing) {
      return res.status(404).json({ message: 'Cadoul nu a fost gasit.' });
    }

    if (existing.status === 'completed' || existing.status === 'purchased') {
      return res.status(403).json({
        message: 'Cadoul cumparat sau finalizat nu mai poate fi sters.',
      });
    }

    await deleteGiftPlan(uid, lovedOneId, giftPlanId);

    return res.status(204).send();
  } catch (error) {
    console.error('DELETE GIFT PLAN ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut sterge cadoul.' });
  }
}

export async function complete(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.lovedOneId);
    const giftPlanId = getParam(req.params.giftPlanId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const existing = await getGiftPlanById(uid, lovedOneId, giftPlanId);

    if (!existing) {
      return res.status(404).json({ message: 'Cadoul nu a fost gasit.' });
    }

    if (existing.status === 'completed' || existing.status === 'purchased') {
      return res.status(400).json({ message: 'Cadoul este deja finalizat.' });
    }

    const selectedProducts = Array.isArray(existing.selectedProducts)
      ? existing.selectedProducts
      : [];
    const purchasedProducts = selectedProducts.filter(
      (product: any) => product?.isPurchased
    );

    if (purchasedProducts.length === 0) {
      return res.status(400).json({
        message: 'Marcheaza cel putin un produs ca fiind cumparat.',
      });
    }

    const completedDateResult = normalizePastOrTodayDate(
      req.body.purchasedAt,
      'Data cumpararii'
    );

    if ('error' in completedDateResult) {
      return res.status(400).json({ message: completedDateResult.error });
    }

    const completedAt = completedDateResult.date;
    const updatedAt = new Date();
    const updatedAtIso = updatedAt.toISOString();
    const purchasedTotal = purchasedProducts.reduce(
      (sum: number, product: any) =>
        sum + Number(product?.purchasePrice || product?.price || 0),
      0
    );
    const appFeedbackRating = Number(req.body.appFeedbackRating);

    const giftPlan = await completeGiftPlan(uid, lovedOneId, giftPlanId, {
      status: 'purchased',
      appFeedbackDetails: String(req.body.appFeedbackDetails || '').trim(),
      ...(Number.isInteger(appFeedbackRating) &&
      appFeedbackRating >= 1 &&
      appFeedbackRating <= 5
        ? { appFeedbackRating }
        : {}),
      completedAt: completedAt.toISOString(),
      daysUntilCompleted: calculateDaysUntilCompleted(
        existing.createdAt,
        completedAt
      ),
      budget: purchasedTotal,
      budgetHistory: appendBudgetHistory(
        existing,
        purchasedTotal,
        'purchased',
        updatedAtIso
      ),
      selectedProducts: purchasedProducts,
      updatedAt: updatedAtIso,
    });

    return res.status(200).json(withCanModify(giftPlan));
  } catch (error) {
    console.error('COMPLETE GIFT PLAN ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut finaliza cadoul.' });
  }
}

export async function offer(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.lovedOneId);
    const giftPlanId = getParam(req.params.giftPlanId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const existing = await getGiftPlanById(uid, lovedOneId, giftPlanId);

    if (!existing) {
      return res.status(404).json({ message: 'Cadoul nu a fost gasit.' });
    }

    if (existing.status === 'completed') {
      return res.status(400).json({ message: 'Cadoul este deja in istoric.' });
    }

    if (existing.status !== 'purchased') {
      return res.status(400).json({
        message: 'Cadoul trebuie marcat ca fiind cumparat inainte sa fie oferit.',
      });
    }

    const selectedProducts = Array.isArray(existing.selectedProducts)
      ? existing.selectedProducts
      : [];
    const purchasedProducts = selectedProducts.filter(
      (product: any) => product?.isPurchased
    );
    const reactionRating = Number(req.body.reactionRating);

    if (
      !Number.isInteger(reactionRating) ||
      reactionRating < 1 ||
      reactionRating > 5
    ) {
      return res.status(400).json({ message: 'Reactia selectata este invalida.' });
    }

    const reactionResult = normalizeProductReactions(
      req.body.productReactions,
      purchasedProducts
    );

    if ('error' in reactionResult) {
      return res.status(400).json({ message: reactionResult.error });
    }

    const offeredDateResult = normalizePastOrTodayDate(
      req.body.offeredAt,
      'Data oferirii'
    );

    if ('error' in offeredDateResult) {
      return res.status(400).json({ message: offeredDateResult.error });
    }

    const offeredAt = offeredDateResult.date;
    const purchasedAt = new Date(String(existing.completedAt || ''));

    if (
      !Number.isNaN(purchasedAt.getTime()) &&
      startOfDayTimestamp(offeredAt) < startOfDayTimestamp(purchasedAt)
    ) {
      return res.status(400).json({
        message: 'Data oferirii nu poate fi inainte de data cumpararii.',
      });
    }

    const updatedAt = new Date();
    const giftPlan = await offerGiftPlan(uid, lovedOneId, giftPlanId, {
      status: 'completed',
      experienceDetails: String(req.body.experienceDetails || '').trim(),
      reactionRating,
      productReactions: reactionResult.productReactions,
      offeredAt: offeredAt.toISOString(),
      daysRemainingUntilGift: calculateDaysRemainingUntilGift(
        existing.deadlineDate,
        offeredAt
      ),
      updatedAt: updatedAt.toISOString(),
    });

    return res.status(200).json(withCanModify(giftPlan));
  } catch (error) {
    console.error('OFFER GIFT PLAN ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut muta cadoul in istoric.' });
  }
}

export async function updateProducts(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.lovedOneId);
    const giftPlanId = getParam(req.params.giftPlanId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const existing = await getGiftPlanById(uid, lovedOneId, giftPlanId);

    if (!existing) {
      return res.status(404).json({ message: 'Cadoul nu a fost gasit.' });
    }

    if (existing.status === 'completed' || existing.status === 'purchased') {
      return res.status(403).json({
        message: 'Cadoul cumparat sau finalizat nu mai poate fi modificat.',
      });
    }

    let normalizedProducts;

    try {
      const result = normalizeSelectedProducts(req.body.selectedProducts);

      if ('error' in result) {
        return res.status(400).json({ message: result.error });
      }

      normalizedProducts = result.selectedProducts;
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }

    const updatedAt = new Date().toISOString();
    const payload: any = {
      selectedProducts: normalizedProducts,
      updatedAt,
    };

    if (req.body.budget !== undefined) {
      const budget = Number(req.body.budget);

      if (!Number.isFinite(budget) || budget <= 0) {
        return res.status(400).json({ message: 'Bugetul este invalid.' });
      }

      payload.budget = budget;
      payload.budgetHistory = appendBudgetHistory(
        existing,
        budget,
        String(req.body.budgetChangeReason || 'manual'),
        updatedAt
      );
    }

    const giftPlan = await updateGiftPlanProducts(
      uid,
      lovedOneId,
      giftPlanId,
      payload
    );

    return res.status(200).json(withCanModify(giftPlan));
  } catch (error) {
    console.error('UPDATE GIFT PRODUCTS ERROR:', error);
    return res.status(500).json({
      message: 'Nu am putut actualiza produsele cadoului.',
    });
  }
}
