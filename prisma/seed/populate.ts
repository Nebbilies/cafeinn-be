import type { PrismaClient } from '../../src/generated/prisma/client.ts';
import type { DemoData } from './data-types.ts';
import { DEMO_MARKER, DEMO_VERSION } from './demo-data.ts';

export async function populate(client: PrismaClient, data: DemoData, referenceDate: string) {
  return client.$transaction(async tx => {
    const marker = await tx.systemSetting.findUnique({ where: { key: DEMO_MARKER } });
    if (marker) {
      const saved: unknown = JSON.parse(marker.value);
      if (typeof saved !== 'object' || saved === null || !('version' in saved) || saved.version !== DEMO_VERSION) throw new Error('Unsupported demo marker');
      return 'unchanged' as const;
    }
    const counts = await Promise.all([
      tx.employee.count(),
      tx.role.count(),
      tx.permission.count(),
      tx.employeeRole.count(),
      tx.rolePermission.count(),
      tx.authSession.count(),
      tx.verificationCode.count(),
      tx.auditLog.count(),
      tx.systemSetting.count(),
      tx.menuCategory.count(),
      tx.menuItem.count(),
      tx.serviceArea.count(),
      tx.diningTable.count(),
      tx.studyRoom.count(),
      tx.roomBooking.count(),
      tx.eventBooking.count(),
      tx.program.count(),
      tx.specialEvent.count(),
      tx.recurringBatch.count(),
      tx.scheduleVersion.count(),
      tx.scheduleSlot.count(),
      tx.artist.count(),
      tx.artistInvitation.count(),
      tx.artistAssignment.count(),
      tx.eventAttendance.count(),
      tx.eventCheckIn.count(),
      tx.eventSurcharge.count(),
      tx.roomRental.count(),
      tx.order.count(),
      tx.orderItem.count(),
      tx.paymentTransaction.count(),
      tx.paymentAllocation.count(),
      tx.receipt.count(),
      tx.itemCancellationRequest.count(),
      tx.refundRequest.count(),
      tx.cashierShift.count(),
      tx.expenseEntry.count(),
      tx.profitReport.count(),
      tx.profitReportLine.count(),
    ]);
    if (counts.some(count => count !== 0)) throw new Error("Refusing to populate a nonempty database");
    await tx.employee.createMany({ data: data.employee });
    await tx.role.createMany({ data: data.role });
    await tx.permission.createMany({ data: data.permission });
    await tx.employeeRole.createMany({ data: data.employeeRole });
    await tx.rolePermission.createMany({ data: data.rolePermission });
    await tx.systemSetting.createMany({ data: data.systemSetting });
    await tx.menuCategory.createMany({ data: data.menuCategory });
    await tx.menuItem.createMany({ data: data.menuItem });
    await tx.serviceArea.createMany({ data: data.serviceArea });
    await tx.diningTable.createMany({ data: data.diningTable });
    await tx.studyRoom.createMany({ data: data.studyRoom });
    await tx.artist.createMany({ data: data.artist });
    for (const row of data.cashierShift) await tx.cashierShift.create({ data: row });
    await tx.recurringBatch.createMany({ data: data.recurringBatch.map(row => ({ ...row, weekdays: row.weekdays ?? [] })) });
    await tx.program.createMany({ data: data.program.map(row => ({ ...row, publishedScheduleVersionId: null })) });
    await tx.specialEvent.createMany({ data: data.specialEvent });
    await tx.scheduleVersion.createMany({ data: data.scheduleVersion });
    await tx.scheduleSlot.createMany({ data: data.scheduleSlot });
    await tx.artistInvitation.createMany({ data: data.artistInvitation });
    await tx.artistAssignment.createMany({ data: data.artistAssignment });
    await tx.roomBooking.createMany({ data: data.roomBooking });
    await tx.eventBooking.createMany({ data: data.eventBooking });
    await tx.eventAttendance.createMany({ data: data.eventAttendance });
    await tx.eventCheckIn.createMany({ data: data.eventCheckIn });
    await tx.roomRental.createMany({ data: data.roomRental.map(row => ({ ...row, roomChargeOrderId: null })) });
    await tx.order.createMany({ data: data.order });
    await tx.orderItem.createMany({ data: data.orderItem });
    await tx.eventSurcharge.createMany({ data: data.eventSurcharge });
    await tx.paymentTransaction.createMany({ data: data.paymentTransaction });
    await tx.paymentAllocation.createMany({ data: data.paymentAllocation });
    await tx.receipt.createMany({ data: data.receipt });
    await tx.itemCancellationRequest.createMany({ data: data.itemCancellationRequest });
    await tx.refundRequest.createMany({ data: data.refundRequest });
    await tx.expenseEntry.createMany({ data: data.expenseEntry });
    await tx.profitReport.createMany({ data: data.profitReport });
    await tx.profitReportLine.createMany({ data: data.profitReportLine });
    await tx.auditLog.createMany({ data: data.auditLog.map(row => ({ ...row, entityKey: row.entityKey ?? undefined, details: row.details ?? undefined })) });
    for (const row of data.program) await tx.program.update({ where: { id: row.id }, data: { publishedScheduleVersionId: row.publishedScheduleVersionId, updatedAt: row.updatedAt } });
    for (const row of data.roomRental) await tx.roomRental.update({ where: { id: row.id }, data: { roomChargeOrderId: row.roomChargeOrderId, updatedAt: row.updatedAt } });
    await tx.systemSetting.create({ data: { key: DEMO_MARKER, value: JSON.stringify({ version: DEMO_VERSION, referenceDate, orders: 150 }), description: 'Completed demo seed; do not remove to rerun against populated data.' } });
    return 'created' as const;
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 60000 });
}
