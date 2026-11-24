import { audit } from '../../common/audit/audit.ts';
import { transaction } from '../../database/transaction.ts';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../common/api-error.ts';
import { readEnvironment } from '../../config/env.ts';
import { eligible, lockedEmployee } from './auth.repository.ts';
import { hashPassword } from './auth-password.ts';
import { sendMail } from '../notifications/mail.service.ts';

const recoveryLifetimeMinutes = 10;

function recoveryKey() {
  const key = readEnvironment().RECOVERY_SECRET;
  if (!key) throw new ApiError(503, 'RECOVERY_UNAVAILABLE');
  return key;
}
function codeDigest(key: string, email: string, code: string) {
  return createHmac('sha256', key)
    .update(email + '\n' + code)
    .digest('hex');
}
export async function requestRecovery(email: string) {
  const key = recoveryKey();
  const issued = await transaction(async (tx) => {
    const employee = await lockedEmployee(tx, email);
    if (!eligible(employee)) return;
    const where = { recipientEmail: employee.email, purpose: 'PASSWORD_RESET' as const };
    const now = new Date();
    const last = await tx.verificationCode.findFirst({ where, orderBy: { id: 'desc' } });
    if (last && now.getTime() - last.createdAt.getTime() < 60000) return;
    await tx.verificationCode.updateMany({
      where: { ...where, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });
    const code = String(randomInt(1000000)).padStart(6, '0');
    const row = await tx.verificationCode.create({
      data: {
        ...where,
        codeHash: codeDigest(key, employee.email, code),
        createdAt: now,
        expiresAt: new Date(now.getTime() + recoveryLifetimeMinutes * 60_000),
      },
    });
    await audit(tx, { employeeId: employee.id, action: 'OTP_REQUESTED' });
    return { id: row.id, email: employee.email, employeeId: employee.id, code };
  });
  if (!issued) return;
  try {
    await sendMail({
      to: issued.email,
      subject: 'CafeInn · Khôi phục mật khẩu',
      text: `Mã khôi phục CafeInn: ${issued.code}. Mã có hiệu lực trong ${recoveryLifetimeMinutes} phút.`,
    });
  } catch {
    await transaction(async (tx) => {
      await tx.verificationCode.update({ where: { id: issued.id }, data: { expiresAt: new Date() } });
      await audit(tx, {
        employeeId: issued.employeeId,
        action: 'OTP_FAILED',
        details: { reason: 'delivery' },
      });
    });
  }
}
export async function resetPassword(email: string, code: string, password: string) {
  const key = recoveryKey();
  const success = await transaction(async (tx) => {
    const employee = await lockedEmployee(tx, email);
    if (!eligible(employee)) return false;
    const row = await tx.verificationCode.findFirst({
      where: { recipientEmail: employee.email, purpose: 'PASSWORD_RESET' },
      orderBy: { id: 'desc' },
    });
    const now = new Date();
    const live = row && row.expiresAt > now && row.failedAttempts < 5;
    if (
      !live ||
      !/^[a-f0-9]{64}$/.test(row.codeHash) ||
      !timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(codeDigest(key, employee.email, code)))
    ) {
      if (live)
        await tx.verificationCode.update({
          where: { id: row.id },
          data: { failedAttempts: { increment: 1 } },
        });
      await audit(tx, { employeeId: employee.id, action: 'OTP_FAILED' });
      return false;
    }
    await tx.verificationCode.update({ where: { id: row.id }, data: { expiresAt: now } });
    await tx.employee.update({
      where: { id: employee.id },
      data: { passwordHash: await hashPassword(password), lockedUntil: null, failedLogins: 0 },
    });
    await tx.authSession.deleteMany({ where: { employeeId: employee.id } });
    await audit(tx, { employeeId: employee.id, action: 'PASSWORD_RESET' });
    return true;
  });
  if (!success) throw new ApiError(400, 'INVALID_CODE');
}
