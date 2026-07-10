import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { registerToken, deleteToken } from '../controllers/pushTokenController';

const router = Router();

router.post('/', requireAuth, registerToken);
router.delete('/', requireAuth, deleteToken);

export default router;
