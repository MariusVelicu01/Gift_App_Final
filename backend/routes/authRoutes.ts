import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  login,
  me,
  patchSubscription,
  refreshToken,
  register,
  updateProfile,
} from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);
router.patch('/subscription/:uid', requireAuth, requireRole('admin'), patchSubscription);

export default router;