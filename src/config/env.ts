import { z } from 'zod';

export const databaseUrlSchema = z.url().startsWith('mysql://');

export const localPortalOrigin = 'http://localhost:3000';
const portalOriginSchema = z.url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && url.pathname === '/' &&
    !url.search && !url.hash && !url.username && !url.password;
});

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.union([z.literal('*'), portalOriginSchema]).default(localPortalOrigin),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUSTED_PROXY_IP: z.union([z.ipv4(),z.ipv6()]).optional(),
  SMTP_HOST: z.string().min(1).default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_FROM: z.email().default('cafeinn@example.com'),
  RECOVERY_SECRET: z.string().min(32).optional(),
  DATABASE_URL: databaseUrlSchema.optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    throw new Error('Invalid environment fields: ' +
      [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', '));
  }
  const corsOrigin = result.data.CORS_ORIGIN;
  return { ...result.data, CORS_ORIGIN: corsOrigin === '*' ? corsOrigin : new URL(corsOrigin).origin };
}
