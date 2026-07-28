import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import { logger } from './config/logger';
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

// Behind a reverse proxy/load balancer (Render, Railway, Fly.io, Nginx, Cloudflare) Express
// must be told how many hops to trust, otherwise req.ip resolves to the proxy's address —
// breaking IP-based rate-limit fallbacks and any IP logging/allowlisting.
// TRUST_PROXY accepts an Express-compatible value: a hop count ("1"), "loopback", or a CIDR list.
const trustProxySetting = process.env.TRUST_PROXY;
if (trustProxySetting !== undefined && trustProxySetting !== '') {
  const asNumber = Number(trustProxySetting);
  app.set('trust proxy', Number.isFinite(asNumber) ? asNumber : trustProxySetting);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(compression());
app.use(pinoHttp({ logger }));

function buildCorsOrigin(): boolean | string | string[] {
  if (process.env.NODE_ENV !== 'production') return true;

  const raw = (process.env.FRONTEND_ORIGIN ?? '').trim();

  // Explicit opt-in to "allow any origin" — only makes sense if the API is public and
  // never used with cookies/credentials. Native mobile requests don't send an Origin header
  // at all, so this only matters if a web build is served.
  if (raw === '*') return true;

  const origins = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return origins.length > 0 ? origins : false;
}

app.use(cors({ origin: buildCorsOrigin() }));

// GiftBot's catalog payload (up to 500 products, each with name/brand/category/urls) can
// legitimately approach several hundred KB — 100kb was rejecting real requests once a
// user's store catalog grew.
app.use(express.json({ limit: '1mb' }));

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
  // IPv6-safe fallback: collapses each client to its /56 subnet so rotating
  // addresses within one allocation can't be used to dodge the per-IP bucket.
  return ipKeyGenerator(req.ip ?? 'unknown');
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

app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta nu a fost găsită.' });
});

Sentry.setupExpressErrorHandler(app);

// Centralized error handler — without this, Express's default handler returns an HTML
// page (with a stack trace outside production) for anything thrown/passed to next() before
// a route handler runs, e.g. multer file-filter/size errors, malformed JSON bodies, or a
// rejected CORS origin.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Corpul cererii este prea mare.' });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Fișierul este prea mare (maxim 5MB).' });
  }

  if (typeof err?.message === 'string' && err.message.includes('neacceptat')) {
    return res.status(400).json({ message: err.message });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ message: 'A apărut o eroare neașteptată.' });
});

export default app;
