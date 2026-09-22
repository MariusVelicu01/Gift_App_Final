import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  googleOAuthStart,
  googleOAuthCallback,
  googleCompleteWithTempToken,
  googleProfileHint,
  login,
  me,
  refreshToken,
  register,
  updateConsent,
  updateProfile,
} from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/google/oauth-start', googleOAuthStart);
router.get('/google/oauth-callback', googleOAuthCallback);
router.get('/google/profile-hint', googleProfileHint);
router.post('/google/complete-profile', googleCompleteWithTempToken);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);
router.patch('/consent', requireAuth, updateConsent);

export default router;