import { Router } from 'express';
import {
  create,
  getAffiliateStats,
  getAffiliateSummary,
  getAll,
  getProductUsage,
  getStoreProducts,
  importProducts,
  searchStoreProducts,
  update,
} from '../controllers/partnerStoresController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);

router.get('/', getAll);
router.get('/search', searchStoreProducts);
router.get('/affiliate-summary', requireRole('admin'), getAffiliateSummary);
router.get('/:storeId/products', getStoreProducts);
router.get('/:storeId/product-usage', requireRole('admin'), getProductUsage);
router.get('/:storeId/affiliate-stats', requireRole('admin'), getAffiliateStats);
router.post('/', requireRole('admin'), create);
router.put('/:storeId', requireRole('admin'), update);
router.put('/:storeId/products', requireRole('admin'), importProducts);

export default router;
