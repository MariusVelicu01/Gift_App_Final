import { Router } from 'express';
import {
  getPublicStatus,
  getAdminState,
  startImmediate,
  putSchedule,
  stop,
} from '../controllers/maintenanceController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Public — polled continuously by every client, including signed-out guests, to
// know whether to show the maintenance block/banner.
router.get('/status', getPublicStatus);

router.use(requireAuth, requireRole('admin'));
router.get('/', getAdminState);
router.put('/immediate', startImmediate);
router.put('/schedule', putSchedule);
router.post('/stop', stop);

export default router;
