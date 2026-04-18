import { Router } from 'express';
import {
  getAll,
  markAllRead,
  markHighlightSeen,
  markRead,
  removeMany,
} from '../controllers/priceAlertsController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);
router.use(requireRole('client'));

router.get('/', getAll);
router.patch('/read-all', markAllRead);
router.delete('/', removeMany);
router.patch('/:notificationId/read', markRead);
router.patch('/:notificationId/highlight-seen', markHighlightSeen);

export default router;
