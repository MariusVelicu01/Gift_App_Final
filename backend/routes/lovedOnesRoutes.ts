import { Router } from 'express';
import { create, getAll } from '../controllers/lovedOnesController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);
router.use(requireRole('client'));

router.post('/', create);
router.get('/', getAll);

export default router;