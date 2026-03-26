import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Server is up.',
    timestamp: new Date().toISOString(),
  });
});

export default router;