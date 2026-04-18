import { Request, Response } from 'express';
import {
  deletePriceAlerts,
  getPriceAlerts,
  markAllPriceAlertsRead,
  markPriceAlertHighlightSeen,
  markPriceAlertRead,
} from '../services/priceAlertsService';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export async function getAll(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const alerts = await getPriceAlerts(uid);
    return res.status(200).json(alerts);
  } catch (error) {
    console.error('GET PRICE ALERTS ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut prelua notificarile.' });
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const alerts = await markAllPriceAlertsRead(uid);
    return res.status(200).json(alerts);
  } catch (error) {
    console.error('MARK ALL PRICE ALERTS READ ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut marca notificarile.' });
  }
}

export async function removeMany(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const mode = req.body?.mode === 'all' ? 'all' : 'read';

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const alerts = await deletePriceAlerts(uid, mode);
    return res.status(200).json(alerts);
  } catch (error) {
    console.error('DELETE PRICE ALERTS ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut sterge notificarile.' });
  }
}

export async function markRead(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const notificationId = getParam(req.params.notificationId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!notificationId) {
      return res.status(400).json({ message: 'Notificare invalida.' });
    }

    const alert = await markPriceAlertRead(uid, notificationId);
    return res.status(200).json(alert);
  } catch (error) {
    console.error('MARK PRICE ALERT READ ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut actualiza notificarea.' });
  }
}

export async function markHighlightSeen(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const notificationId = getParam(req.params.notificationId);

    if (!uid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!notificationId) {
      return res.status(400).json({ message: 'Notificare invalida.' });
    }

    const alert = await markPriceAlertHighlightSeen(uid, notificationId);
    return res.status(200).json(alert);
  } catch (error) {
    console.error('MARK PRICE ALERT HIGHLIGHT ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut actualiza notificarea.' });
  }
}
