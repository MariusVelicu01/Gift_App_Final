import { Request, Response } from 'express';
import { logger } from '../config/logger';
import {
  getMaintenanceDoc,
  getEffectiveMaintenanceState,
  setImmediateMaintenance,
  setScheduledMaintenance,
  stopMaintenance,
} from '../services/maintenanceService';

const MAX_MESSAGE_LENGTH = 500;
const MIN_LEAD_MS = 60 * 60 * 1000;

function sanitizeMessage(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  return trimmed ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : null;
}

export async function getPublicStatus(_req: Request, res: Response) {
  try {
    const state = await getEffectiveMaintenanceState();
    return res.status(200).json(state);
  } catch (error) {
    logger.error({ err: error }, 'GET MAINTENANCE STATUS ERROR');
    // Fail-open: if we can't determine maintenance state, act as if it's off rather
    // than accidentally locking everyone out because of an unrelated Firestore hiccup.
    return res.status(200).json({
      phase: 'off',
      blocked: false,
      message: null,
      scheduledStart: null,
      scheduledEnd: null,
    });
  }
}

export async function getAdminState(_req: Request, res: Response) {
  try {
    const doc = await getMaintenanceDoc();
    const effective = await getEffectiveMaintenanceState();
    return res.status(200).json({ ...doc, effective });
  } catch (error) {
    logger.error({ err: error }, 'GET MAINTENANCE ADMIN STATE ERROR');
    return res.status(500).json({ message: 'Nu am putut prelua starea de mentenanță.' });
  }
}

export async function startImmediate(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const message = sanitizeMessage(req.body?.message);
    const doc = await setImmediateMaintenance(message, uid);
    return res.status(200).json(doc);
  } catch (error) {
    logger.error({ err: error }, 'START IMMEDIATE MAINTENANCE ERROR');
    return res.status(500).json({ message: 'Nu am putut activa mentenanța.' });
  }
}

export async function putSchedule(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const { start, end } = req.body || {};
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (!start || !end || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Data de început sau de sfârșit este invalidă.' });
    }

    if (endDate.getTime() <= startDate.getTime()) {
      return res.status(400).json({ message: 'Data de sfârșit trebuie să fie după data de început.' });
    }

    if (startDate.getTime() < Date.now() + MIN_LEAD_MS) {
      return res.status(400).json({
        message: 'Data de început trebuie să fie în viitor, cu cel puțin o oră în avans.',
      });
    }

    const message = sanitizeMessage(req.body?.message);
    const doc = await setScheduledMaintenance(
      startDate.toISOString(),
      endDate.toISOString(),
      message,
      uid
    );
    return res.status(200).json(doc);
  } catch (error) {
    logger.error({ err: error }, 'SET SCHEDULED MAINTENANCE ERROR');
    return res.status(500).json({ message: 'Nu am putut programa mentenanța.' });
  }
}

export async function stop(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const doc = await stopMaintenance(uid);
    return res.status(200).json(doc);
  } catch (error) {
    logger.error({ err: error }, 'STOP MAINTENANCE ERROR');
    return res.status(500).json({ message: 'Nu am putut opri mentenanța.' });
  }
}
