import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.ts';
import { databaseUrlSchema } from '../config/env.ts';

let client: PrismaClient | undefined;

export function getPrisma(databaseUrl: string | undefined = process.env.DATABASE_URL) {
  if (!client) {
    const result = databaseUrlSchema.safeParse(databaseUrl);
    if (!result.success) throw new Error('A valid DATABASE_URL is required for database access.');
    client = new PrismaClient({ adapter: new PrismaMariaDb(result.data) });
  }
  return client;
}

export async function disconnectDatabase() {
  const active = client;
  client = undefined;
  await active?.$disconnect();
}
