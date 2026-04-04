import { Request, Response } from 'express';
import { createLovedOne, getLovedOnes } from '../services/lovedOnesService';

function isDateInFuture(day: number, month: number, year: number) {
  const selected = new Date(year, month - 1, day, 23, 59, 59, 999);
  const now = new Date();
  return selected.getTime() > now.getTime();
}

export async function create(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const {
      name,
      day,
      month,
      year,
      estimatedAgeRange,
      gender,
      notes,
      imageUrl,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: 'Numele este obligatoriu.',
      });
    }

    if (day === undefined || day === null || day === '') {
      return res.status(400).json({
        message: 'Ziua este obligatorie.',
      });
    }

    if (month === undefined || month === null || month === '') {
      return res.status(400).json({
        message: 'Luna este obligatorie.',
      });
    }

    if (
      (year === undefined || year === null || year === '') &&
      (estimatedAgeRange === undefined ||
        estimatedAgeRange === null ||
        estimatedAgeRange === '')
    ) {
      return res.status(400).json({
        message: 'Completează anul sau intervalul de vârstă estimată.',
      });
    }

    const parsedDay = Number(day);
    const parsedMonth = Number(month);

    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      return res.status(400).json({
        message: 'Zi invalidă.',
      });
    }

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        message: 'Lună invalidă.',
      });
    }

    if (year !== undefined && year !== null && year !== '') {
      const parsedYear = Number(year);

      if (!Number.isInteger(parsedYear) || parsedYear < 1930) {
        return res.status(400).json({
          message: 'An invalid.',
        });
      }

      if (isDateInFuture(parsedDay, parsedMonth, parsedYear)) {
        return res.status(400).json({
          message: 'Data nu poate fi în viitor.',
        });
      }
    }

    const payload: any = {
      name: String(name).trim(),
      day: parsedDay,
      month: parsedMonth,
      gender: gender || 'unknown',
      createdAt: new Date().toISOString(),
    };

    if (notes !== undefined && notes !== null && String(notes).trim() !== '') {
      payload.notes = String(notes).trim();
    }

    if (
      imageUrl !== undefined &&
      imageUrl !== null &&
      String(imageUrl).trim() !== ''
    ) {
      payload.imageUrl = String(imageUrl).trim();
    }

    if (year !== undefined && year !== null && year !== '') {
      payload.year = Number(year);
    }

    if (
      estimatedAgeRange !== undefined &&
      estimatedAgeRange !== null &&
      String(estimatedAgeRange).trim() !== ''
    ) {
      payload.estimatedAgeRange = String(estimatedAgeRange).trim();
    }

    const lovedOne = await createLovedOne(uid, payload);

    return res.status(201).json(lovedOne);
  } catch (error) {
    console.error('CREATE LOVED ONE ERROR:', error);

    return res.status(500).json({
      message: 'Nu am putut salva.',
    });
  }
}

export async function getAll(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const data = await getLovedOnes(uid);

    return res.status(200).json(data);
  } catch (error) {
    console.error('GET LOVED ONES ERROR:', error);

    return res.status(500).json({
      message: 'Nu am putut prelua datele.',
    });
  }
}