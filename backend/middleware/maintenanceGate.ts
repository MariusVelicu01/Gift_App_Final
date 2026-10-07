import { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../config/firebase';
import { getEffectiveMaintenanceState } from '../services/maintenanceService';

// /auth must stay reachable so an admin can (re)authenticate during maintenance, and so
// the frontend can learn the caller's role at all; /health and /maintenance/status are
// the public probes the app itself depends on to detect and display maintenance state.
const EXEMPT_PREFIXES = ['/api/health', '/api/auth', '/api/maintenance'];

export async function maintenanceGate(req: Request, res: Response, next: NextFunction) {
  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  let state;
  try {
    state = await getEffectiveMaintenanceState();
  } catch {
    // A Firestore hiccup here must never take the whole API down — fail open.
    return next();
  }

  if (!state.blocked) return next();

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
      if (decoded.role === 'admin') return next();
    } catch {
      // Invalid/expired token — falls through to the blocked response below.
    }
  }

  return res.status(503).json({
    code: 'MAINTENANCE',
    message: state.message || 'Aplicația este în mentenanță. Revino puțin mai târziu.',
  });
}
