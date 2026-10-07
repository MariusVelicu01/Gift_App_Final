import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { listClientUsers, setUserBlocked } from '../services/userService';
import { deleteUserAccount } from '../services/adminUsersService';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export async function list(req: Request, res: Response) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const users = await listClientUsers(search);
    return res.status(200).json(users);
  } catch (error) {
    logger.error({ err: error }, 'LIST ADMIN USERS ERROR');
    return res.status(500).json({ message: 'Nu am putut prelua utilizatorii.' });
  }
}

export async function block(req: Request, res: Response) {
  try {
    const uid = getParam(req.params.uid);
    const { blocked } = req.body;
    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ message: 'Valoare invalidă.' });
    }

    const profile = await setUserBlocked(uid, blocked);
    if (!profile) return res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
    return res.status(200).json(profile);
  } catch (error) {
    logger.error({ err: error }, 'BLOCK ADMIN USER ERROR');
    return res.status(500).json({ message: 'Nu am putut actualiza contul.' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const adminUid = req.user?.uid;
    if (!adminUid) return res.status(401).json({ message: 'Unauthorized.' });

    const updated = await deleteUserAccount(getParam(req.params.uid), adminUid);
    return res.status(200).json(updated);
  } catch (error: any) {
    logger.error({ err: error }, 'DELETE ADMIN USER ERROR');
    return res.status(400).json({ message: error?.message || 'Nu am putut șterge contul.' });
  }
}
