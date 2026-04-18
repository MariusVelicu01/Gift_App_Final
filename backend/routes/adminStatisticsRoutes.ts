import { Router } from 'express';
import { getUserStatistics } from '../controllers/adminStatisticsController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/users', getUserStatistics);

export default router;
