import { Request, Response } from "express";
import { logger } from "../config/logger";
import {
  createLovedOne,
  deleteLovedOne,
  getLovedOneById,
  getLovedOnes,
  updateLovedOne,
} from "../services/lovedOnesService";
import { signLovedOneImage } from "../services/uploadService";

function isDateInFuture(day: number, month: number, year: number) {
  const selected = new Date(year, month - 1, day, 23, 59, 59, 999);
  const now = new Date();
  return selected.getTime() > now.getTime();
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

// Loved-one photos are stored privately; imagePath must point at the caller's own
// upload folder so nobody can attach another user's photo by guessing/observing a path.
function isValidLovedOneImagePath(uid: string, imagePath: string): boolean {
  const prefix = `loved-ones/${uid}/`;
  if (!imagePath.startsWith(prefix)) return false;
  const rest = imagePath.slice(prefix.length);
  return /^[a-f0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(rest);
}

// imageUrl is never trusted from the client — it's resolved server-side from imagePath
// (a fresh, short-lived signed URL) right before the record is sent back to its owner.
async function withResolvedImage<T extends { imagePath?: string } | null | undefined>(lovedOne: T): Promise<T> {
  if (!lovedOne || !lovedOne.imagePath) return lovedOne;

  try {
    const imageUrl = await signLovedOneImage(lovedOne.imagePath);
    return { ...lovedOne, imageUrl };
  } catch {
    return lovedOne;
  }
}

function buildLovedOnePayload(uid: string, body: any) {
  const { name, day, month, year, estimatedAgeRange, gender, notes, imagePath } =
    body;

  if (!name?.trim()) {
    return { error: "Numele este obligatoriu." };
  }

  if (day === undefined || day === null || day === "") {
    return { error: "Ziua este obligatorie." };
  }

  if (month === undefined || month === null || month === "") {
    return { error: "Luna este obligatorie." };
  }

  if (
    (year === undefined || year === null || year === "") &&
    (estimatedAgeRange === undefined ||
      estimatedAgeRange === null ||
      estimatedAgeRange === "")
  ) {
    return { error: "Completează anul sau intervalul de vârstă estimată." };
  }

  const parsedDay = Number(day);
  const parsedMonth = Number(month);

  if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
    return { error: "Zi invalidă." };
  }

  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return { error: "Lună invalidă." };
  }

  if (year !== undefined && year !== null && year !== "") {
    const parsedYear = Number(year);

    if (!Number.isInteger(parsedYear) || parsedYear < 1930) {
      return { error: "An invalid." };
    }

    if (isDateInFuture(parsedDay, parsedMonth, parsedYear)) {
      return { error: "Data nu poate fi în viitor." };
    }
  }

  const trimmedName = String(name).trim();
  if (trimmedName.length > 100) {
    return { error: 'Numele nu poate depăși 100 de caractere.' };
  }

  if (notes !== undefined && notes !== null && String(notes).trim().length > 1000) {
    return { error: 'Notele nu pot depăși 1000 de caractere.' };
  }

  const payload: any = {
    name: trimmedName,
    day: parsedDay,
    month: parsedMonth,
    gender: gender || "unknown",
  };

  if (notes !== undefined && notes !== null && String(notes).trim() !== '') {
    payload.notes = String(notes).trim();
  }

  if (imagePath !== undefined && imagePath !== null && String(imagePath).trim() !== '') {
    const path = String(imagePath).trim();

    if (!isValidLovedOneImagePath(uid, path)) {
      return { error: 'Fotografia încărcată este invalidă.' };
    }

    payload.imagePath = path;
  }

  if (year !== undefined && year !== null && year !== "") {
    payload.year = Number(year);
  }

  if (
    estimatedAgeRange !== undefined &&
    estimatedAgeRange !== null &&
    String(estimatedAgeRange).trim() !== ""
  ) {
    payload.estimatedAgeRange = String(estimatedAgeRange).trim();
  }

  return { payload };
}

export async function create(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const result = buildLovedOnePayload(uid, req.body);

    if ("error" in result) {
      return res.status(400).json({ message: result.error });
    }

    const lovedOne = await createLovedOne(uid, {
      ...result.payload,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json(await withResolvedImage(lovedOne));
  } catch (error) {
    logger.error({ err: error }, "CREATE LOVED ONE ERROR");

    return res.status(500).json({
      message: "Nu am putut salva.",
    });
  }
}

export async function getAll(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const data = await getLovedOnes(uid);
    const resolved = await Promise.all(data.map(withResolvedImage));

    return res.status(200).json(resolved);
  } catch (error) {
    logger.error({ err: error }, "GET LOVED ONES ERROR");

    return res.status(500).json({
      message: "Nu am putut prelua datele.",
    });
  }
}

export async function getOne(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.id);

    if (!lovedOneId) {
      return res.status(400).json({ message: "ID invalid." });
    }

    if (!uid) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const lovedOne = await getLovedOneById(uid, lovedOneId);

    if (!lovedOne) {
      return res.status(404).json({ message: "Persoana nu a fost găsită." });
    }

    return res.status(200).json(await withResolvedImage(lovedOne));
  } catch (error) {
    logger.error({ err: error }, "GET ONE LOVED ONE ERROR");

    return res.status(500).json({
      message: "Nu am putut prelua persoana.",
    });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.id);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!lovedOneId) {
      return res.status(400).json({ message: 'ID invalid.' });
    }

    const existing = await getLovedOneById(uid, lovedOneId);

    if (!existing) {
      return res.status(404).json({ message: 'Persoana nu a fost găsită.' });
    }

    const result = buildLovedOnePayload(uid, req.body);

    if ('error' in result) {
      return res.status(400).json({ message: result.error });
    }

    const updated = await updateLovedOne(uid, lovedOneId, {
      ...result.payload,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json(await withResolvedImage(updated));
  } catch (error) {
    logger.error({ err: error }, 'UPDATE LOVED ONE ERROR');

    return res.status(500).json({
      message: 'Nu am putut actualiza persoana.',
    });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const lovedOneId = getParam(req.params.id);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!lovedOneId) {
      return res.status(400).json({ message: 'ID invalid.' });
    }

    const existing = await getLovedOneById(uid, lovedOneId);

    if (!existing) {
      return res.status(404).json({ message: 'Persoana nu a fost gasita.' });
    }

    await deleteLovedOne(uid, lovedOneId);

    return res.status(200).json({
      message:
        'Persoana a fost stearsa din lista ta. Istoricul cadourilor ramane disponibil pentru statistici.',
    });
  } catch (error) {
    logger.error({ err: error }, 'DELETE LOVED ONE ERROR');

    return res.status(500).json({
      message: 'Nu am putut sterge persoana.',
    });
  }
}
