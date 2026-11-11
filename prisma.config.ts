import { defineConfig } from 'prisma/config';
import { loadEnvironment } from './src/config/load-env.ts';

loadEnvironment();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Validation and generation do not connect. Never use this placeholder at runtime.
    url: process.env.DATABASE_URL ?? 'mysql://USER:PASSWORD@database.example.invalid:3306/cafeinn',
  },
});
