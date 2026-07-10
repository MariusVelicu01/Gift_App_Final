import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || '*',
  })
);

app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Prea multe încercări. Încearcă din nou peste 15 minute.' },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Prea multe cereri. Încearcă din nou peste un minut.' },
});

const giftBotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
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
