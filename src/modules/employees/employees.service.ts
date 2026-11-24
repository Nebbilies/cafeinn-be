import { audit } from '../../common/audit/audit.ts';
import type { z } from 'zod';
import { ApiError } from '../../common/api-error.ts';
import { authorize } from '../auth/auth.service.ts';
import { lockEmployee, transaction } from '../../database/transaction.ts';
import { hashPassword } from '../auth/auth-password.ts';
import type { createStaff, patchStaff, StaffListQuery } from './employees.schema.ts';

import {
  employeeFields,
  employeeDto,
  findEmployeePage,
  findEmployee,
  lockRoleAssignments,
  otherActiveAdmins,
} from './employees.repository.ts';
export function listEmployees(token: string, query: StaffListQuery) {
  return transaction(async (tx) => {
    await authorize(tx, token, 'users.manage');
    return findEmployeePage(tx, query);
  });
}
export function employeeDetail(token: string, id: number) {
  return transaction(async (tx) => {
    await authorize(tx, token, 'users.manage');
    const row = await findEmployee(tx, id);
    if (!row) throw new ApiError(404, 'NOT_FOUND');
    return employeeDto(row);
  });
}

export function createEmployee(token: string, input: z.infer<typeof createStaff>) {
  return transaction(async (tx) => {
    await lockRoleAssignments(tx);
    const actor = await authorize(tx, token, 'users.manage');
    const { roles, password, confirmation, ...fields } = input;
    if (!roles.length) throw new ApiError(400, 'ROLES_REQUIRED');
    if (password !== confirmation) throw new ApiError(400, 'INVALID_INPUT');
    const row = await tx.employee.create({
      data: {
        ...fields,
        passwordHash: await hashPassword(password),
        employeeRoles: { create: roles.map((name) => ({ role: { connect: { name } } })) },
      },
      select: employeeFields,
    });
    await audit(tx, {
      employeeId: actor.id,
      action: 'USER_CREATED',
      entityType: 'employee',
      entityKey: { id: row.id },
      details: { after: { roles, status: row.status } },
    });
    return employeeDto(row);
  });
}

export function updateEmployee(token: string, id: number, input: z.infer<typeof patchStaff>) {
  return transaction(async (tx) => {
    // Every staff update takes the same role lock before checking actor and target.
    await lockRoleAssignments(tx);
    const actor = await authorize(tx, token, 'users.manage');
    await lockEmployee(tx, id);
    const before = await findEmployee(tx, id);
    if (!before) throw new ApiError(404, 'NOT_FOUND');
    const { roles, ...fields } = input;
    const nextRoles = roles ?? employeeDto(before).roles;
    const nextStatus = fields.status ?? before.status;
    if (nextStatus === 'ACTIVE' && !nextRoles.length) throw new ApiError(400, 'ROLES_REQUIRED');
    if (
      before.status === 'ACTIVE' &&
      employeeDto(before).roles.includes('ADMIN') &&
      (nextStatus !== 'ACTIVE' || !nextRoles.includes('ADMIN'))
    ) {
      const others = await otherActiveAdmins(tx, id);
      if (!others) throw new ApiError(409, 'LAST_ADMIN');
    }
    if (roles) {
      await tx.employeeRole.deleteMany({ where: { employeeId: id } });
    }
    const row = await tx.employee.update({
      where: { id },
      data: {
        ...fields,
        employeeRoles: roles ? { create: roles.map((name) => ({ role: { connect: { name } } })) } : undefined,
      },
      select: employeeFields,
    });
    if (nextStatus === 'INACTIVE') await tx.authSession.deleteMany({ where: { employeeId: id } });
    if (before.email !== row.email || nextStatus === 'INACTIVE') {
      await tx.verificationCode.updateMany({
        where: {
          purpose: 'PASSWORD_RESET',
          recipientEmail: { in: [before.email, row.email] },
          expiresAt: { gt: new Date() },
        },
        data: { expiresAt: new Date() },
      });
    }
    await audit(tx, {
      employeeId: actor.id,
      action: 'USER_UPDATED',
      entityType: 'employee',
      entityKey: { id },
      details: { before: employeeDto(before), after: employeeDto(row) },
    });
    return employeeDto(row);
  });
}
