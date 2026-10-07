import { Router } from 'express';
import { getAll, update, acceptTerms } from '../controllers/legalController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Public — read by guests (footer links) and by every logged-in client (the
// mandatory re-acceptance check on app load).
router.get('/', getAll);

router.use(requireAuth);
router.post('/accept-terms', acceptTerms);
router.put('/:type', requireRole('admin'), update);

export default router;
