import { Request, Response } from 'express';
import { logger } from '../config/logger';
import {
  getAllLegalDocs,
  updateLegalDoc,
  getCurrentTermsVersion,
  LegalDocType,
  LegalSection,
} from '../services/legalService';
import { setConsentVersion } from '../services/userService';

const VALID_TYPES: LegalDocType[] = ['privacy', 'terms', 'affiliate'];
const MAX_SECTIONS = 40;
const MAX_HEADING_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;

export async function getAll(_req: Request, res: Response) {
  try {
    const docs = await getAllLegalDocs();
    return res.status(200).json(docs);
  } catch (error) {
    logger.error({ err: error }, 'GET LEGAL DOCS ERROR');
    return res.status(500).json({ message: 'Nu am putut prelua documentele legale.' });
  }
}

function sanitizeSections(input: unknown): { sections: LegalSection[] } | { error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: 'Documentul trebuie să aibă cel puțin o secțiune.' };
  }
  if (input.length > MAX_SECTIONS) {
    return { error: `Poți avea maximum ${MAX_SECTIONS} de secțiuni.` };
  }

  const sections: LegalSection[] = [];
  for (const raw of input as any[]) {
    const heading = String(raw?.heading ?? '').trim();
    const body = String(raw?.body ?? '').trim();

    if (!heading || !body) {
      return { error: 'Fiecare secțiune trebuie să aibă titlu și conținut.' };
    }
    if (heading.length > MAX_HEADING_LENGTH) {
      return { error: `Titlul unei secțiuni depășește ${MAX_HEADING_LENGTH} de caractere.` };
    }
    if (body.length > MAX_BODY_LENGTH) {
      return { error: `Conținutul unei secțiuni depășește ${MAX_BODY_LENGTH} de caractere.` };
    }
    sections.push({ heading, body });
  }
  return { sections };
}

export async function update(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const type = req.params.type as LegalDocType;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Tip de document invalid.' });
    }

    const result = sanitizeSections(req.body?.sections);
    if ('error' in result) {
      return res.status(400).json({ message: result.error });
    }

    const doc = await updateLegalDoc(type, result.sections, uid);
    return res.status(200).json(doc);
  } catch (error) {
    logger.error({ err: error }, 'UPDATE LEGAL DOC ERROR');
    return res.status(500).json({ message: 'Nu am putut salva documentul.' });
  }
}

export async function acceptTerms(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const version = await getCurrentTermsVersion();
    const profile = await setConsentVersion(uid, String(version));
    return res.status(200).json(profile);
  } catch (error) {
    logger.error({ err: error }, 'ACCEPT TERMS ERROR');
    return res.status(500).json({ message: 'Nu am putut înregistra acceptarea.' });
  }
}
