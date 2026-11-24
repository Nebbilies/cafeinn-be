import { staffPaths } from './staff-openapi.ts';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'CafeInn API',
    version: '0.1.0',
    description: 'HTTP API for CafeInn.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health', description: 'Service liveness.' }],
  components: {securitySchemes:{staffCookie:{type:'apiKey',in:'cookie',name:'cafeinn_session'}}},
  paths: {
    ...staffPaths,
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        operationId: 'getHealth',
        summary: 'Check service liveness',
        description: 'Returns service status without accessing the database.',
        responses: {
          '200': {
            description: 'The service is running.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status', 'service'],
                  properties: {
                    status: { type: 'string', enum: ['ok'] },
                    service: { type: 'string', enum: ['cafeinn-be'] },
                  },
                },
                example: { status: 'ok', service: 'cafeinn-be' },
              },
            },
          },
        },
      },
    },
  },
};
