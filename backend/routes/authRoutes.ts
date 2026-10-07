import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// Brute-force/abuse protection for credential- and account-creation-guessing surfaces
// only. Session-maintenance routes (/me, /refresh, /profile, ...) are deliberately NOT
// under this limiter — /me in particular is polled every few seconds by the frontend's
// account-status check, which would otherwise exhaust this same 20-per-15min bucket and
// lock legitimate users out of /login too (both live under /api/auth).
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Prea multe încercări. Încearcă din nou peste 15 minute.' },
});

router.post('/register', credentialsLimiter, register);
router.post('/login', credentialsLimiter, login);
router.get('/google/oauth-start', googleOAuthStart);
router.get('/google/oauth-callback', googleOAuthCallback);
router.get('/google/profile-hint', googleProfileHint);
router.post('/google/complete-profile', credentialsLimiter, googleCompleteWithTempToken);
router.post('/refresh', refreshToken);
router.post('/forgot-password', credentialsLimiter, forgotPassword);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);
router.patch('/consent', requireAuth, updateConsent);

export default router;