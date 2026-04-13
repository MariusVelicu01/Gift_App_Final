import { Request, Response } from 'express';
import { getLovedOneById } from '../services/lovedOnesService';
import {
  completeGiftPlan,
  createGiftPlan,
  deleteGiftPlan,
  getGiftPlanById,
  getGiftPlans,
  GiftPurpose,
  updateGiftPlan,
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

function withCanModify(giftPlan: any) {
  return {
    ...giftPlan,
    canModify:
      giftPlan.status !== 'completed' && !isExpired(giftPlan.deadlineDate),
  };
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

  if (purpose === 'Zi de nastere') {
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

  return {
    payload: {
      purpose,
      budget,
      deadlineDate,
      requiresCustomDate: !PURPOSES_WITH_FIXED_DATE.includes(purpose),
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

    const giftPlan = await createGiftPlan(uid, lovedOneId, {
      ...result.payload,
      status: 'planned',
      createdAt: new Date().toISOString(),
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

    if (existing.status === 'completed') {
      return res.status(403).json({
        message: 'Cadoul finalizat nu mai poate fi modificat.',
      });
    }

    if (isExpired(String(existing.deadlineDate))) {
      return res.status(403).json({
        message: 'Deadline-ul a expirat. Cadoul nu mai poate fi modificat.',
      });
    }

    const result = await buildGiftPlanPayload(uid, lovedOneId, req.body);

    if ('error' in result) {
      return res.status(result.status || 400).json({ message: result.error });
    }

    const giftPlan = await updateGiftPlan(uid, lovedOneId, giftPlanId, {
      ...result.payload,
      status: 'planned',
      updatedAt: new Date().toISOString(),
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

    if (existing.status === 'completed') {
      return res.status(403).json({
        message: 'Cadoul finalizat nu mai poate fi sters.',
      });
    }

    if (isExpired(String(existing.deadlineDate))) {
      return res.status(403).json({
        message: 'Deadline-ul a expirat. Cadoul nu mai poate fi sters.',
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

    if (existing.status === 'completed') {
      return res.status(400).json({ message: 'Cadoul este deja finalizat.' });
    }

    if (isExpired(String(existing.deadlineDate))) {
      return res.status(403).json({
        message: 'Deadline-ul a expirat. Cadoul nu mai poate fi finalizat.',
      });
    }

    const experienceDetails = String(req.body.experienceDetails || '').trim();

    if (!experienceDetails) {
      return res.status(400).json({
        message: 'Adauga detalii despre experienta persoanei dragi.',
      });
    }

    const reactionRating = Number(req.body.reactionRating);

    if (
      !Number.isInteger(reactionRating) ||
      reactionRating < 1 ||
      reactionRating > 5
    ) {
      return res.status(400).json({ message: 'Reactia selectata este invalida.' });
    }

    const giftPlan = await completeGiftPlan(uid, lovedOneId, giftPlanId, {
      status: 'completed',
      experienceDetails,
      reactionRating,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json(withCanModify(giftPlan));
  } catch (error) {
    console.error('COMPLETE GIFT PLAN ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut finaliza cadoul.' });
  }
}
