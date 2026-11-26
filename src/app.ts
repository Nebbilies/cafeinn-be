import express from 'express';
import { authRoutes } from './modules/auth/auth.routes.ts';
import { employees } from './modules/employees/employees.routes.ts';
import { artistsRoutes } from './modules/artists/artists.routes.ts';
import { ApiError } from './common/api-error.ts';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './config/openapi.ts';
import { healthRoutes } from './modules/health/health.routes.ts';
import { errorHandler } from './common/middleware/error-handler.ts';
import { localPortalOrigin } from './config/env.ts';
import { programsRoutes, recurringBatchRoutes } from './modules/programs/programs.routes.ts';

export function createApp({ corsOrigin = localPortalOrigin, trustedProxyIp }: {corsOrigin?:string;trustedProxyIp?:string} = {}) {
  const app = express();
  const staffOrigin = corsOrigin === '*' ? localPortalOrigin : corsOrigin;
  app.disable('x-powered-by');
  if (trustedProxyIp) app.set('trust proxy', trustedProxyIp);
  app.use(helmet());
  app.use(cors((request, callback) => {
    const origin = request.headers.origin;
    if (corsOrigin === '*') request.res?.vary('Origin');
    if (origin === staffOrigin) return callback(null, { origin: staffOrigin, credentials: true });
    callback(null, { origin: corsOrigin === '*' ? '*' : false });
  }));
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
  app.use(
    [
      '/api/v1/auth',
      '/api/v1/employees',
      '/api/v1/artists',
      '/api/v1/programs',
      '/api/v1/recurring-batches',
    ],
    (req, res, next) => {
    res.set('Cache-Control','private, no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method) &&
        ((req.headers.origin && req.headers.origin !== staffOrigin) ||
        (!req.headers.origin && req.headers['sec-fetch-site'] === 'cross-site'))) {
      return next(new ApiError(403,'ORIGIN_REJECTED'));
    }
    next();
  });
  app.use('/api/v1/auth',authRoutes(staffOrigin.startsWith('https://')));
  app.use('/api/v1/employees',employees);
  app.use('/api/v1/artists', artistsRoutes);
  app.use('/api/v1/programs', programsRoutes);
  app.use('/api/v1/recurring-batches', recurringBatchRoutes);
  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
  });
  app.use(errorHandler);
  return app;
}
