import { Router } from 'express';
import {
  create,
  getAll,
  getOne,
  update,
} from '../controllers/lovedOnesController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);
router.use(requireRole('client'));

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);

export default router;