import { Request, Response } from 'express';
import { savePushToken, removePushToken } from '../services/pushTokensService';

export async function registerToken(req: Request, res: Response) {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

  const { token } = req.body;
  const EXPO_TOKEN_RE = /^ExponentPushToken\[[\w\-]{10,200}\]$/;
  if (!token || typeof token !== 'string' || !EXPO_TOKEN_RE.test(token)) {
    return res.status(400).json({ message: 'Token invalid.' });
  }

  await savePushToken(uid, token).catch(() => {});
  return res.status(200).json({ ok: true });
}

export async function deleteToken(req: Request, res: Response) {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

  const { token } = req.body;
  if (token && typeof token === 'string') {
    await removePushToken(uid, token).catch(() => {});
  }
  return res.status(200).json({ ok: true });
}
