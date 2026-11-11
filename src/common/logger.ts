import pino from 'pino';

export function createLogger(level = 'info') {
  return pino({
    level,
    base: { service: 'cafeinn-be' },
    redact: {
      paths: ['password', 'token', 'authorization', 'cookie', 'DATABASE_URL',
        'databaseUrl', 'req.headers.authorization', 'req.headers.cookie'],
      remove: true,
    },
  });
}
