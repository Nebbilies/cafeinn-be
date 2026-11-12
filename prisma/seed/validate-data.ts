import type { DemoData } from './data-types.ts';

function requireValid(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid demo data: ${message}`);
}

export function validateDemoData(data: DemoData) {
  requireValid(data.order.length === 150, 'expected 150 orders');
  requireValid(data.order.filter(row => row.status === 'PAID').length === 130, 'expected 130 paid orders');
  requireValid(data.order.filter(row => row.status === 'OPEN').length === 15, 'expected 15 open orders');
  for (const [name, rows] of Object.entries(data)) {
    const ids = (rows as { id?: unknown }[]).map(row => 'id' in row ? String(row.id) : null).filter((id: string | null) => id !== null);
    if (name !== 'profitReportLine') requireValid(new Set(ids).size === ids.length, `${name} duplicate IDs`);
    for (const row of rows) for (const value of Object.values(row)) {
      if (value instanceof Date) requireValid(Number.isFinite(value.getTime()), `${name} invalid date`);
    }
  }
  const rows = data as unknown as Record<string, Record<string, unknown>[]>;
  const relations: [string, string, string, string][] = [
    ['employeeRole', 'employeeId', 'employee', 'id'],
    ['employeeRole', 'roleId', 'role', 'id'],
    ['rolePermission', 'roleId', 'role', 'id'],
    ['rolePermission', 'permissionId', 'permission', 'id'],
    ['authSession', 'employeeId', 'employee', 'id'],
    ['auditLog', 'employeeId', 'employee', 'id'],
    ['menuItem', 'categoryId', 'menuCategory', 'id'],
    ['diningTable', 'areaId', 'serviceArea', 'id'],
    ['roomBooking', 'roomId', 'studyRoom', 'id'],
    ['eventBooking', 'specialEventId', 'specialEvent', 'programId'],
    ['program', 'areaId', 'serviceArea', 'id'],
    ['program', 'recurringBatchId', 'recurringBatch', 'id'],
    ['program', 'publishedScheduleVersionId', 'scheduleVersion', 'id'],
    ['specialEvent', 'programId', 'program', 'id'],
    ['scheduleVersion', 'programId', 'program', 'id'],
    ['scheduleSlot', 'scheduleVersionId', 'scheduleVersion', 'id'],
    ['artistInvitation', 'programId', 'program', 'id'],
    ['artistInvitation', 'artistId', 'artist', 'id'],
    ['artistAssignment', 'scheduleSlotId', 'scheduleSlot', 'id'],
    ['artistAssignment', 'artistId', 'artist', 'id'],
    ['artistAssignment', 'invitationId', 'artistInvitation', 'id'],
    ['eventAttendance', 'specialEventId', 'specialEvent', 'programId'],
    ['eventAttendance', 'eventBookingId', 'eventBooking', 'id'],
    ['eventCheckIn', 'attendanceId', 'eventAttendance', 'id'],
    ['eventSurcharge', 'checkInId', 'eventCheckIn', 'id'],
    ['eventSurcharge', 'orderId', 'order', 'id'],
    ['roomRental', 'roomBookingId', 'roomBooking', 'id'],
    ['roomRental', 'roomId', 'studyRoom', 'id'],
    ['roomRental', 'roomChargeOrderId', 'order', 'id'],
    ['order', 'createdInShiftId', 'cashierShift', 'id'],
    ['order', 'diningTableId', 'diningTable', 'id'],
    ['order', 'roomRentalId', 'roomRental', 'id'],
    ['orderItem', 'orderId', 'order', 'id'],
    ['orderItem', 'menuItemId', 'menuItem', 'id'],
    ['paymentTransaction', 'receivedInShiftId', 'cashierShift', 'id'],
    ['paymentAllocation', 'transactionId', 'paymentTransaction', 'id'],
    ['paymentAllocation', 'orderId', 'order', 'id'],
    ['paymentAllocation', 'eventSurchargeId', 'eventSurcharge', 'id'],
    ['paymentAllocation', 'roomRentalId', 'roomRental', 'id'],
    ['receipt', 'transactionId', 'paymentTransaction', 'id'],
    ['itemCancellationRequest', 'orderItemId', 'orderItem', 'id'],
    ['refundRequest', 'allocationId', 'paymentAllocation', 'id'],
    ['refundRequest', 'reviewerId', 'employee', 'id'],
    ['refundRequest', 'refundTransactionId', 'paymentTransaction', 'id'],
    ['cashierShift', 'employeeId', 'employee', 'id'],
    ['cashierShift', 'previousShiftId', 'cashierShift', 'id'],
    ['profitReport', 'reviewerId', 'employee', 'id'],
    ['profitReportLine', 'reportId', 'profitReport', 'id'],
  ];
  for (const [source, field, target, targetField] of relations) {
    const keys = new Set(rows[target].map(row => row[targetField]));
    for (const row of rows[source]) requireValid(row[field] === null || keys.has(row[field]), `${source}.${field} reference`);
  }
  const uniqueKeys: [string, string[]][] = [
    ['employee', ['id']],
    ['employee', ['email']],
    ['employee', ['username']],
    ['role', ['id']],
    ['role', ['name']],
    ['permission', ['id']],
    ['permission', ['code']],
    ['employeeRole', ['employeeId', 'roleId']],
    ['rolePermission', ['roleId', 'permissionId']],
    ['authSession', ['id']],
    ['verificationCode', ['id']],
    ['auditLog', ['id']],
    ['systemSetting', ['key']],
    ['menuCategory', ['id']],
    ['menuCategory', ['name']],
    ['menuItem', ['id']],
    ['serviceArea', ['id']],
    ['serviceArea', ['name']],
    ['diningTable', ['id']],
    ['diningTable', ['code']],
    ['studyRoom', ['id']],
    ['studyRoom', ['code']],
    ['roomBooking', ['id']],
    ['eventBooking', ['id']],
    ['program', ['id']],
    ['program', ['publishedScheduleVersionId']],
    ['specialEvent', ['programId']],
    ['recurringBatch', ['id']],
    ['scheduleVersion', ['id']],
    ['scheduleSlot', ['id']],
    ['artist', ['id']],
    ['artist', ['email']],
    ['artistInvitation', ['id']],
    ['artistInvitation', ['acceptToken']],
    ['artistInvitation', ['declineToken']],
    ['artistAssignment', ['scheduleSlotId', 'artistId']],
    ['eventAttendance', ['id']],
    ['eventAttendance', ['eventBookingId']],
    ['eventCheckIn', ['id']],
    ['eventSurcharge', ['id']],
    ['eventSurcharge', ['checkInId']],
    ['roomRental', ['id']],
    ['order', ['id']],
    ['orderItem', ['id']],
    ['paymentTransaction', ['id']],
    ['paymentTransaction', ['bankReference']],
    ['paymentAllocation', ['id']],
    ['receipt', ['id']],
    ['receipt', ['transactionId']],
    ['itemCancellationRequest', ['id']],
    ['refundRequest', ['id']],
    ['refundRequest', ['refundTransactionId']],
    ['cashierShift', ['id']],
    ['cashierShift', ['previousShiftId']],
    ['expenseEntry', ['id']],
    ['profitReport', ['id']],
    ['profitReportLine', ['reportId', 'id']],
  ];
  for (const [name, fields] of uniqueKeys) {
    const values = rows[name].filter(row => fields.every(field => row[field] !== null)).map(row => fields.map(field => String(row[field])).join('|'));
    requireValid(new Set(values).size === values.length, `${name} unique ${fields.join(',')}`);
  }
  for (const order of data.order) {
    requireValid(order.serviceType === 'DINE_IN' ? order.diningTableId !== null && order.roomRentalId === null : order.serviceType === 'STUDY_ROOM' ? order.roomRentalId !== null && order.diningTableId === null : order.diningTableId === null && order.roomRentalId === null, `order ${order.id} context`);
    const items = data.orderItem.filter(row => row.orderId === order.id);
    const total = items.reduce((sum, row) => sum + (row.quantity - row.cancelledQuantity) * row.unitPrice, 0)
      + data.eventSurcharge.filter(row => row.orderId === order.id).reduce((sum, row) => sum + row.amount, 0)
      + data.roomRental.filter(row => row.roomChargeOrderId === order.id).reduce((sum, row) => sum + (row.amount ?? 0), 0);
    requireValid(order.totalAmount === total, `order ${order.id} total`);
    requireValid(items.every(row => row.preparedQuantity + row.cancelledQuantity <= row.quantity), `order ${order.id} quantities`);
    const shift = data.cashierShift.find(row => row.id === order.createdInShiftId)!;
    requireValid(order.createdAt >= shift.openedAt && (!shift.closedAt || order.createdAt < shift.closedAt), `order ${order.id} shift`);
  }
  for (const tx of data.paymentTransaction) {
    const allocations = data.paymentAllocation.filter(row => row.transactionId === tx.id);
    requireValid(allocations.reduce((sum, row) => sum + row.amount, 0) === tx.amount, `transaction ${tx.id} allocations`);
    requireValid(tx.kind === 'COLLECTION' && tx.method === 'CASH' ? tx.cashTendered !== null && tx.cashTendered >= tx.amount : tx.cashTendered === null, `transaction ${tx.id} tender`);
    for (const row of allocations) requireValid([row.orderId, row.roomRentalId, row.eventSurchargeId].filter(value => value !== null).length === 1, `allocation ${row.id} source`);
  }
  for (const rental of data.roomRental) {
    requireValid(rental.expectedCheckoutAt > rental.checkedInAt && (!rental.checkedOutAt || rental.checkedOutAt > rental.checkedInAt), `rental ${rental.id} times`);
    requireValid(rental.roomBookingId !== null || (!!rental.contactName && !!rental.phone), `rental ${rental.id} contact`);
    if (rental.checkedOutAt) {
      const minutes = (rental.checkedOutAt.getTime() - rental.checkedInAt.getTime()) / 60000;
      const billable = Math.max(rental.minimumDurationMinutes, Math.ceil(minutes / rental.roundingMinutes) * rental.roundingMinutes);
      requireValid(rental.amount === billable / 60 * rental.hourlyRate, `rental ${rental.id} charge`);
    }
    for (const other of data.roomRental) if (other.id > rental.id && other.roomId === rental.roomId) {
      requireValid((rental.checkedOutAt?.getTime() ?? Infinity) <= other.checkedInAt.getTime() || (other.checkedOutAt?.getTime() ?? Infinity) <= rental.checkedInAt.getTime(), `rentals ${rental.id}/${other.id} overlap`);
    }
  }
  for (const fee of data.eventSurcharge) {
    const checkin = data.eventCheckIn.find(row => row.id === fee.checkInId)!;
    requireValid(fee.amount === checkin.guestCount * fee.unitPrice, `surcharge ${fee.id} amount`);
  }
  for (const request of data.refundRequest) {
    const original = data.paymentAllocation.find(row => row.id === request.allocationId)!;
    requireValid(data.paymentTransaction.find(row => row.id === original.transactionId)?.kind === 'COLLECTION', `refund ${request.id} original`);
    requireValid(request.amount > 0 && request.amount <= original.amount, `refund ${request.id} amount`);
    requireValid((request.status === 'COMPLETED') === (request.refundTransactionId !== null), `refund ${request.id} completion`);
  }
  for (const program of data.program) {
    requireValid(data.scheduleVersion.some(row => row.id === program.publishedScheduleVersionId && row.programId === program.id && row.status === 'PUBLISHED'), `program ${program.id} publication`);
  }
  for (const booking of data.eventBooking) {
    const attendance = data.eventAttendance.find(row => row.eventBookingId === booking.id);
    const arrived = data.eventCheckIn.filter(row => row.attendanceId === attendance?.id).reduce((sum, row) => sum + row.guestCount, 0);
    requireValid(arrived <= booking.guestCount && (booking.status !== 'ARRIVED' || arrived === booking.guestCount), `event booking ${booking.id} arrivals`);
  }
  for (const event of data.specialEvent) {
    const attendanceIds = new Set(data.eventAttendance.filter(row => row.specialEventId === event.programId).map(row => row.id));
    const arrived = data.eventCheckIn.filter(row => attendanceIds.has(row.attendanceId)).reduce((sum, row) => sum + row.guestCount, 0);
    const held = data.eventBooking.filter(row => row.specialEventId === event.programId && row.status === 'HELD').reduce((sum, row) => sum + row.guestCount, 0);
    requireValid(arrived + held <= event.capacityLimit, `event ${event.programId} capacity`);
  }
  for (const assignment of data.artistAssignment) {
    const slot = data.scheduleSlot.find(row => row.id === assignment.scheduleSlotId)!;
    const invitation = data.artistInvitation.find(row => row.id === assignment.invitationId)!;
    const version = data.scheduleVersion.find(row => row.id === slot.scheduleVersionId)!;
    requireValid(invitation.status === 'ACCEPTED' && invitation.artistId === assignment.artistId && invitation.programId === version.programId && slot.startsAt >= invitation.startsAt && slot.endsAt <= invitation.endsAt, 'artist assignment interval');
  }
  for (const batch of data.recurringBatch) {
    const weekdays = batch.weekdays as string[];
    const programs = data.program.filter(row => row.recurringBatchId === batch.id);
    requireValid(programs.length === batch.createdCount && weekdays.length > 0 && new Set(weekdays).size === weekdays.length, 'recurring batch count/weekdays');
    for (const program of programs) {
      const localDay = new Date(program.startsAt.getTime() + 7 * 3600000);
      const day = localDay.toISOString().slice(0, 10);
      requireValid(weekdays.includes(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][localDay.getUTCDay()]) && day >= batch.fromDate.toISOString().slice(0, 10) && day <= batch.toDate.toISOString().slice(0, 10), 'recurring program date');
    }
  }
  let carry = 0;
  for (const shift of data.cashierShift) if (shift.closedAt) {
    const movement = data.paymentTransaction.filter(row => row.receivedInShiftId === shift.id && row.method === 'CASH' && row.status === 'SUCCEEDED').reduce((sum, row) => sum + (row.kind === 'COLLECTION' ? row.amount : -row.amount), 0);
    const expected = carry + shift.openingCashAdjustment + movement;
    requireValid(shift.countedCash !== null && (shift.countedCash === expected || !!shift.explanation), `shift ${shift.id} balance`);
    carry = shift.countedCash;
  }
  for (const transaction of data.paymentTransaction) {
    const shift = data.cashierShift.find(row => row.id === transaction.receivedInShiftId)!;
    requireValid(transaction.updatedAt >= shift.openedAt && (!shift.closedAt || transaction.updatedAt < shift.closedAt), `transaction ${transaction.id} shift time`);
    if (transaction.status === 'SUCCEEDED') requireValid(data.auditLog.some(row => row.action === (transaction.kind === 'COLLECTION' ? 'PAYMENT_CONFIRMED' : 'REFUND_COMPLETED') && row.createdAt.getTime() === transaction.updatedAt.getTime()), `transaction ${transaction.id} settlement audit`);
  }
  for (const line of data.profitReportLine) requireValid(line.dataStatus === 'MISSING_DATA' ? line.amount === null : line.dataStatus === 'NO_ACTIVITY' ? line.amount === 0 : line.amount !== null, `report ${line.reportId}/${line.id} completeness`);
}
