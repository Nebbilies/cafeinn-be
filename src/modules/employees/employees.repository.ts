import type { Transaction } from '../../database/transaction.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { pageOffset, pageResult } from '../../common/pagination.ts';
import type { StaffListQuery } from './employees.schema.ts';
export const employeeFields = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  status: true,
  employeeRoles: { select: { role: { select: { name: true } } } },
} as const;
type Selected = import('../../generated/prisma/client.ts').Prisma.EmployeeGetPayload<{
  select: typeof employeeFields;
}>;
export function employeeDto({ employeeRoles, ...fields }: Selected) {
  return { ...fields, roles: employeeRoles.map((value) => value.role.name) };
}

export function lockRoleAssignments(tx: Transaction) {
  return tx.$queryRaw`SELECT id FROM roles WHERE name = 'ADMIN' FOR UPDATE`;
}
export function findEmployee(tx: Transaction, id: number) {
  return tx.employee.findFirst({ where: { id, deletedAt: null }, select: employeeFields });
}
export async function findEmployeePage(tx: Transaction, query: StaffListQuery) {
  const { status, search, sort, pageSize } = query;
  const where: Prisma.EmployeeWhereInput = { deletedAt: null, status };
  if (search) {
    const contains = search.replace(/[\\%_]/g, '\\$&');
    const id = /^NV\d{3,}$/i.test(search) ? Number(search.slice(2)) : 0;
    where.OR = [{ fullName: { contains } }, { username: { contains } }, { email: { contains } }];
    if (id > 0 && id <= 2_147_483_647 && search.toUpperCase() === 'NV' + String(id).padStart(3, '0')) {
      where.OR.push({ id });
    }
  }
  const orderBy: Prisma.EmployeeOrderByWithRelationInput[] = [{ id: 'asc' }];
  if (sort !== 'id.asc') orderBy.unshift({ fullName: sort === 'name.asc' ? 'asc' : 'desc' });
  const skip = pageOffset(query);
  const totalItems = await tx.employee.count({ where });
  const rows = skip < totalItems
    ? await tx.employee.findMany({ where, select: employeeFields, orderBy, skip, take: pageSize })
    : [];
  return pageResult(rows.map(employeeDto), query, totalItems);
}
export function otherActiveAdmins(tx: Transaction, id: number) {
  return tx.employee.count({
    where: {
      id: { not: id },
      deletedAt: null,
      status: 'ACTIVE',
      employeeRoles: { some: { role: { name: 'ADMIN' } } },
    },
  });
}
