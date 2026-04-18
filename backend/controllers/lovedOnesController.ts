import { Request, Response } from "express";
import {
  createLovedOne,
  deleteLovedOne,
  getLovedOneById,
  getLovedOnes,
  updateLovedOne,
} from "../services/lovedOnesService";

function isDateInFuture(day: number, month: number, year: number) {
  const selected = new Date(year, month - 1, day, 23, 59, 59, 999);
  const now = new Date();
  return selected.getTime() > now.getTime();
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

function buildLovedOnePayload(body: any) {
  const { name, day, month, year, estimatedAgeRange, gender, notes, imageUrl } =
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

  const payload: any = {
    name: String(name).trim(),
    day: parsedDay,
    month: parsedMonth,
    gender: gender || "unknown",
  };

  if (notes !== undefined && notes !== null && String(notes).trim() !== "") {
    payload.notes = String(notes).trim();
  }

  if (
    imageUrl !== undefined &&
    imageUrl !== null &&
    String(imageUrl).trim() !== ""
  ) {
    payload.imageUrl = String(imageUrl).trim();
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

    const result = buildLovedOnePayload(req.body);

    if ("error" in result) {
      return res.status(400).json({ message: result.error });
    }

    const lovedOne = await createLovedOne(uid, {
      ...result.payload,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json(lovedOne);
  } catch (error) {
    console.error("CREATE LOVED ONE ERROR:", error);

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

    return res.status(200).json(data);
  } catch (error) {
    console.error("GET LOVED ONES ERROR:", error);

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

    return res.status(200).json(lovedOne);
  } catch (error) {
    console.error("GET ONE LOVED ONE ERROR:", error);

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

    const result = buildLovedOnePayload(req.body);

    if ('error' in result) {
      return res.status(400).json({ message: result.error });
    }

    const updated = await updateLovedOne(uid, lovedOneId, {
      ...result.payload,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('UPDATE LOVED ONE ERROR:', error);

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
    console.error('DELETE LOVED ONE ERROR:', error);

    return res.status(500).json({
      message: 'Nu am putut sterge persoana.',
    });
  }
}
