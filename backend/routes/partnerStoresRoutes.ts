import { Router } from 'express';
import {
  create,
  getAll,
  importProducts,
} from '../controllers/partnerStoresController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);

router.get('/', getAll);
router.post('/', requireRole('admin'), create);
router.put('/:storeId/products', requireRole('admin'), importProducts);

export default router;
