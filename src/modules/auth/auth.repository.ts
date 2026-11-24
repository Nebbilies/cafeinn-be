import type { Prisma } from '../../generated/prisma/client.ts';
import { lockEmployee, type Transaction } from '../../database/transaction.ts';
export const memberships = {
  employeeRoles: {
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;
export type Staff = Prisma.EmployeeGetPayload<{ include: typeof memberships }>;
export function identity(employee: Staff) {
  return {
    id: employee.id,
    fullName: employee.fullName,
    roles: employee.employeeRoles.map((m) => m.role.name),
    permissions: [
      ...new Set(employee.employeeRoles.flatMap((m) => m.role.rolePermissions.map((p) => p.permission.code))),
    ],
  };
}
export function eligible(employee: Staff | null): employee is Staff {
  return (
    !!employee && employee.status === 'ACTIVE' && !employee.deletedAt && employee.employeeRoles.length > 0
  );
}
export async function lockedEmployee(tx: Transaction, identifier: string) {
  const where = identifier.includes('@') ? { email: identifier } : { username: identifier };
  const row = await tx.employee.findUnique({ where, select: { id: true } });
  if (!row) return null;
  await lockEmployee(tx, row.id);
  return tx.employee.findFirst({ where: { ...where, id: row.id }, include: memberships });
}
