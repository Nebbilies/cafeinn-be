import { z } from 'zod';

export const databaseUrlSchema = z.url().startsWith('mysql://');

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.url().default('http://localhost:3000').refine((value) => {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.pathname === '/' &&
      !url.search && !url.hash && !url.username && !url.password;
  }),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: databaseUrlSchema.optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    throw new Error('Invalid environment fields: ' +
      [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', '));
  }
  return { ...result.data, CORS_ORIGIN: new URL(result.data.CORS_ORIGIN).origin };
}
