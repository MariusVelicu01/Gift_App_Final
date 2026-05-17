import { Router } from 'express';
import { recommend } from '../controllers/giftBotController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);
router.use(requireRole('client'));

router.post('/recommend', recommend);

export default router;
