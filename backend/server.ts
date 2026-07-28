import dotenv from 'dotenv';
dotenv.config();

// Must run before app/express are imported so Sentry can auto-instrument them.
import './instrument';

import app from './app';
import { logger } from './config/logger';
import { startNotificationsJob } from './jobs/notificationsJob';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`Backend running on http://${HOST}:${PORT}`);
});

const notificationsTask = startNotificationsJob();

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received, shutting down gracefully...`);
  notificationsTask.stop();

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error while closing server');
      process.exit(1);
    }
    logger.info('Server closed. Bye.');
    process.exit(0);
  });

  // Safety net: if in-flight requests never finish, don't hang forever.
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout — some connections did not close in time.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
