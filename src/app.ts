import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './config/openapi.ts';
import { healthRoutes } from './modules/health/health.routes.ts';
import { errorHandler } from './common/middleware/error-handler.ts';

export function createApp({ corsOrigin = 'http://localhost:3000' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: (origin, callback) => callback(null, origin === corsOrigin) }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/api-docs.json', (_request, response) => {
    response.json(openApiDocument);
  });
  const swaggerOptions = {
    customSiteTitle: 'CafeInn API docs',
    swaggerOptions: { url: '/api-docs.json', validatorUrl: null },
  };
  app.use(
    '/api-docs',
    // Allow local HTTP documentation assets without changing API security headers.
    helmet.contentSecurityPolicy({ directives: { upgradeInsecureRequests: null } }),
    swaggerUi.serveFiles(undefined, swaggerOptions),
    swaggerUi.setup(undefined, swaggerOptions),
  );
  app.use('/api/v1', healthRoutes);
  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
  });
  app.use(errorHandler);
  return app;
}
