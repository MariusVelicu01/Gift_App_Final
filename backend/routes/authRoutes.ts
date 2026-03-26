import { Router } from 'express';
import {
  forgotPassword,
  login,
  me,
  register,
} from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', requireAuth, me);

export default router;