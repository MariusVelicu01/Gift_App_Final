import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import lovedOnesRoutes from './routes/lovedOnesRoutes';
import uploadRoutes from './routes/uploadRoutes';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || '*',
  })
);

app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/loved-ones', lovedOnesRoutes);
app.use('/api/upload', uploadRoutes);

export default app;