import type { Prisma } from '../../generated/prisma/client.ts';
import type { Transaction } from '../../database/transaction.ts';

export function audit(tx: Transaction, data: Prisma.AuditLogUncheckedCreateInput) {
  return tx.auditLog.create({ data });
}
