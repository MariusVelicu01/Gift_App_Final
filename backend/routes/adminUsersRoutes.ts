import { Router } from 'express';
import { list, block, remove } from '../controllers/adminUsersController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/', list);
router.put('/:uid/block', block);
router.delete('/:uid', remove);

export default router;
