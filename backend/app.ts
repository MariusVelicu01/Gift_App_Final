import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import lovedOnesRoutes from './routes/lovedOnesRoutes';
import uploadRoutes from './routes/uploadRoutes';
import partnerStoresRoutes from './routes/partnerStoresRoutes';
import adminStatisticsRoutes from './routes/adminStatisticsRoutes';
import priceAlertsRoutes from './routes/priceAlertsRoutes';
import giftBotRoutes from './routes/giftBotRoutes';
import pushTokenRoutes from './routes/pushTokenRoutes';

const app = express();

app.use(helmet());
app.use(compression());

function buildCorsOrigin(): boolean | string | string[] {
  if (process.env.NODE_ENV !== 'production') return true;
  const raw = process.env.FRONTEND_ORIGIN ?? '';
  const origins = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return origins.length > 0 ? origins : false;
}

app.use(cors({ origin: buildCorsOrigin() }));

app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Prea multe încercări. Încearcă din nou peste 15 minute.' },
});

function tokenKey(req: any): string {
  const auth = req.headers?.authorization as string | undefined;
  if (auth?.startsWith('Bearer ')) {
    // Decode (without verifying) to use stable UID as rate-limit key.
    // Formal signature verification still happens in requireAuth middleware.
    try {
      const parts = auth.slice(7).split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const uid = payload.user_id || payload.sub;
        if (typeof uid === 'string' && uid.length > 0) return uid;
      }
    } catch { /* fall through */ }
    return auth.slice(7, 67);
  }
  return req.ip || 'unknown';
}

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: tokenKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Prea multe cereri. Încearcă din nou peste un minut.' },
});

const giftBotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  keyGenerator: tokenKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limita de recomandări GiftBot atinsă. Încearcă din nou peste un minut.' },
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/loved-ones', generalLimiter, lovedOnesRoutes);
app.use('/api/upload', generalLimiter, uploadRoutes);
app.use('/api/partner-stores', generalLimiter, partnerStoresRoutes);
app.use('/api/admin-statistics', generalLimiter, adminStatisticsRoutes);
app.use('/api/price-alerts', generalLimiter, priceAlertsRoutes);
app.use('/api/giftbot', giftBotLimiter, giftBotRoutes);
app.use('/api/push-tokens', generalLimiter, pushTokenRoutes);

export default app;
