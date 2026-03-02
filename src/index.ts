import 'dotenv/config';
import { initSentry } from './config/sentry';

// Sentry must init BEFORE importing express/app
initSentry();

import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { disconnectRedis } from './config/redis';
import { initStorage } from './config/storage';
import { initSocket } from './websocket/socket';
import { logger } from './utils/logger';
import { startTriggers, stopTriggers } from './modules/notifications/triggers.service';

async function bootstrap() {
  // Connect to services
  await connectDatabase();
  await initStorage();

  // Create HTTP server and attach Socket.io
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`[Tonalli API] Running on port ${env.PORT} (${env.NODE_ENV})`);
    startTriggers();
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    stopTriggers();
    server.close(async () => {
      await disconnectDatabase();
      await disconnectRedis();
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start', err);
  process.exit(1);
});
