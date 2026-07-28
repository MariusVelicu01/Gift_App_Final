import { Router } from 'express';
import { db } from '../config/firebase';
import { logger } from '../config/logger';

const router = Router();

// Liveness — "is the process up at all". Keep dependency-free: if Firestore is briefly
// down, restarting this process wouldn't help, so a process manager shouldn't treat that
// as a reason to kill it.
router.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Server is up.',
    timestamp: new Date().toISOString(),
  });
});

// Readiness — "can this instance actually serve requests". Pings Firestore with a tight
// timeout so uptime monitors / load balancers can detect a real connectivity problem.
router.get('/ready', async (_req, res) => {
  const timeoutMs = 3000;

  try {
    await Promise.race([
      db.collection('_health').limit(1).get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore ping timed out')), timeoutMs)),
    ]);

    return res.status(200).json({ ok: true, firestore: 'up', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, 'Readiness check failed');
    return res.status(503).json({ ok: false, firestore: 'down', timestamp: new Date().toISOString() });
  }
});

export default router;
