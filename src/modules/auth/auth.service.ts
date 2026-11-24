import { audit } from '../../common/audit/audit.ts';
import { lockEmployee, transaction, type Transaction } from '../../database/transaction.ts';
import { createHash, randomBytes } from 'node:crypto';
import { ApiError } from '../../common/api-error.ts';
import { eligible, identity, lockedEmployee, memberships } from './auth.repository.ts';
import { hashPassword, verifyPassword } from './auth-password.ts';

export const absoluteMs = 12 * 3600000;
export const idleMs = 30 * 60000;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export async function login(identifier: string, password: string) {
  const result = await transaction(async (tx) => {
    const employee = await lockedEmployee(tx, identifier);
    const now = Date.now();
    const locked = employee?.lockedUntil && employee.lockedUntil.getTime() > now;
    if (!eligible(employee) || locked || !(await verifyPassword(password, employee.passwordHash))) {
      if (eligible(employee) && !locked) {
        const failures = (employee.lockedUntil ? 0 : employee.failedLogins) + 1;
        await tx.employee.update({
          where: { id: employee.id },
          data: { failedLogins: failures, lockedUntil: failures >= 5 ? new Date(now + 15 * 60000) : null },
        });
      }
      await audit(tx, { action: 'LOGIN_FAILED', employeeId: employee?.id });
      return null;
    }
    const token = randomBytes(32).toString('hex');
    await tx.employee.update({
      where: { id: employee.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        passwordHash: employee.passwordHash.startsWith('v1$') ? undefined : await hashPassword(password),
      },
    });
    await tx.authSession.create({
      data: { employeeId: employee.id, tokenDigest: digest(token), expiresAt: new Date(now + absoluteMs) },
    });
    await audit(tx, { action: 'LOGIN_SUCCESS', employeeId: employee.id });
    return { token, staff: identity(employee) };
  });
  if (!result) throw new ApiError(401, 'INVALID_CREDENTIALS');
  return result;
}
export async function authorize(tx: Transaction, token: string | undefined, permission?: string) {
  if (!token) throw new ApiError(401, 'SESSION_REQUIRED');
  const where = { tokenDigest: digest(token) };
  const ref = await tx.authSession.findUnique({ where, select: { employeeId: true } });
  if (!ref) throw new ApiError(401, 'SESSION_REQUIRED');
  await lockEmployee(tx, ref.employeeId);
  const session = await tx.authSession.findUnique({ where, include: { employee: { include: memberships } } });
  const now = Date.now();
  if (
    !session ||
    !eligible(session.employee) ||
    session.expiresAt.getTime() <= now ||
    session.updatedAt.getTime() + idleMs <= now
  )
    throw new ApiError(401, 'SESSION_REQUIRED');
  const staff = identity(session.employee);
  if (permission) {
    if (!staff.permissions.includes(permission)) throw new ApiError(403, 'FORBIDDEN');
    await tx.authSession.update({ where, data: { updatedAt: new Date(now) } });
  }
  return staff;
}
export async function logout(token?: string) {
  if (!token) return;
  await transaction(async (tx) => {
    const where = { tokenDigest: digest(token) };
    const row = await tx.authSession.findUnique({ where });
    if (row) {
      await lockEmployee(tx, row.employeeId);
      const deleted = await tx.authSession.deleteMany({ where });
      if (deleted.count) await audit(tx, { action: 'LOGOUT', employeeId: row.employeeId });
    }
  });
}
