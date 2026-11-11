import { createApp } from './app.ts';
import { loadEnvironment } from './config/load-env.ts';
import { readEnvironment } from './config/env.ts';
import { createLogger } from './common/logger.ts';
import { disconnectDatabase } from './database/prisma.ts';

try {
  loadEnvironment();
  const environment = readEnvironment();
  const logger = createLogger(environment.LOG_LEVEL);
  const server = createApp({ corsOrigin: environment.CORS_ORIGIN }).listen(environment.PORT, () => {
    logger.info({ port: environment.PORT }, 'API listening');
  });
  server.on('error', () => {
    logger.error('Unable to open the API listener.');
    process.exitCode = 1;
  });
  const shutdown = () => {
    const timeout = setTimeout(() => server.closeAllConnections(), 5000);
    timeout.unref();
    server.close(() => {
      void disconnectDatabase().then(() => {
        clearTimeout(timeout);
        logger.info('API stopped');
      }).catch(() => {
        logger.error('Unable to close database resources.');
        process.exitCode = 1;
      });
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch {
  process.stderr.write('Unable to start the API. Check the environment configuration.\n');
  process.exitCode = 1;
}
