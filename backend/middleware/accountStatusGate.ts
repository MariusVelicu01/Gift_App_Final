import { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../config/firebase';
import { getUserProfileByUid } from '../services/userService';

// /auth must stay reachable so a blocked user can still obtain a session (and so the
// frontend's polling — which reads GET /auth/me — can always learn the account's own
// status), and /health and /maintenance are unrelated public/maintenance-only concerns.
const EXEMPT_PREFIXES = ['/api/health', '/api/auth', '/api/maintenance'];

export async function accountStatusGate(req: Request, res: Response, next: NextFunction) {
  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  let uid: string;
  let role: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
    role = decoded.role as string | undefined;
  } catch {
    // Invalid/expired token — let requireAuth (downstream) reject it with a proper 401.
    return next();
  }

  if (role === 'admin') return next();

  const profile = await getUserProfileByUid(uid).catch(() => null);
  if (!profile) return next();

  if (profile.deletedAt) {
    return res.status(403).json({ code: 'ACCOUNT_DELETED', message: 'Acest cont a fost șters.' });
  }
  if (profile.blocked) {
    return res.status(403).json({ code: 'ACCOUNT_BLOCKED', message: 'Acest cont a fost blocat.' });
  }

  return next();
}
