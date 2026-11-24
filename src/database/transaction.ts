import type { Prisma } from '../generated/prisma/client.ts';
import { getPrisma } from './prisma.ts';

export type Transaction = Prisma.TransactionClient;
export function transaction<T>(work: (tx: Transaction) => Promise<T>) {
  return getPrisma().$transaction(work, { isolationLevel: 'ReadCommitted', timeout: 15000 });
}
export async function lockEmployee(tx: Transaction, id: number) {
  await tx.$queryRaw`SELECT id FROM employees WHERE id = ${id} FOR UPDATE`;
}
