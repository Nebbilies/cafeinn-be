import { emptyData } from './data-types.ts';

export const DEMO_VERSION = '1';
export const DEMO_MARKER = 'DEMO_SEED_V1';
export const DEMO_PASSWORD = 'cafeinn@123';

export function buildDemoData(referenceDate: string) {
  const data = emptyData();
  const base = Date.parse(`${referenceDate}T00:00:00+07:00`);
  const at = (day: number, hour = 8, minute = 0) => new Date(base + ((day * 24 + hour) * 60 + minute) * 60000);
  const date = (day: number) => new Date(new Date(base + day * 86400000 + 7 * 3600000).toISOString().slice(0, 10));
  const meta = (time = at(-60)) => ({ createdAt: time, updatedAt: time });
  const names = ['Nguyen Minh Anh', 'Tran Bao Ngoc', 'Le Quoc Huy', 'Pham Thao Linh', 'Hoang Gia Bao', 'Vo Thanh Ha', 'Dang Duc Minh', 'Bui Mai Chi', 'Do Khanh Vy', 'Phan Tuan Kiet'];
  const users = ['admin', 'event01', 'event02', 'sales01', 'sales02', 'sales03', 'sales04', 'sales05', 'event.sales', 'admin.sales'];
  users.forEach((username, i) => {
    data.employee.push({ id: i + 1, username, fullName: names[i], email: `${username}@example.com`, phone: `09000000${String(i).padStart(2, '0')}`, passwordHash: 'DRY_RUN_NOT_A_PASSWORD_HASH', status: i === 6 ? 'INACTIVE' : 'ACTIVE', deletedAt: i === 7 ? at(-2) : null, ...meta() });
  });
  (['ADMIN', 'EVENT_STAFF', 'SALES_STAFF'] as const).forEach((name, i) => data.role.push({ id: i + 1, name, ...meta() }));
  const memberships = [[1], [2], [2], [3], [3], [3], [3], [3], [2, 3], [1, 3]];
  memberships.forEach((roles, i) => roles.forEach(roleId => data.employeeRole.push({ employeeId: i + 1, roleId, createdAt: at(-30) })));
  ['users.manage', 'events.manage', 'sales.manage', 'reports.read'].forEach((code, i) => {
    data.permission.push({ id: i + 1, code, description: `Demo permission: ${code}`, ...meta() });
    const roles = i === 0 ? [1] : i === 1 ? [1, 2] : i === 2 ? [1, 3] : [1, 2, 3];
    roles.forEach(roleId => data.rolePermission.push({ roleId, permissionId: i + 1, createdAt: at(-30) }));
  });
  const menus = [
    ['Coffee', 'Espresso', 'Americano', 'Latte', 'Cappuccino', 'Vietnamese iced coffee'],
    ['Tea', 'Peach tea', 'Lychee tea', 'Jasmine tea', 'Matcha latte', 'Oolong tea'],
    ['Juice', 'Orange juice', 'Watermelon juice', 'Apple juice', 'Pineapple juice', 'Lemonade'],
    ['Bakery', 'Croissant', 'Cheesecake', 'Brownie', 'Tiramisu', 'Banana bread'],
    ['Food', 'Chicken sandwich', 'Beef sandwich', 'Pasta', 'Salad', 'French fries'],
    ['Other', 'Mineral water', 'Soda', 'Hot chocolate', 'Yogurt', 'Seasonal smoothie'],
  ];
  menus.forEach(([name, ...items], category) => {
    data.menuCategory.push({ id: category + 1, name, deletedAt: null, ...meta() });
    items.forEach((name, index) => {
      const id = category * 5 + index + 1;
      data.menuItem.push({ id, categoryId: category + 1, name, unitPrice: 25000 + (id % 8) * 5000, status: id === 29 ? 'OUT_OF_STOCK' : id === 30 ? 'DISCONTINUED' : 'AVAILABLE', deletedAt: id === 30 ? at(-1) : null, ...meta() });
    });
  });
  ['Main hall', 'Acoustic stage', 'Garden'].forEach((name, i) => data.serviceArea.push({ id: i + 1, name, kind: i === 1 ? 'ACOUSTIC' : 'REGULAR', status: 'ACTIVE', deletedAt: null, ...meta() }));
  for (let id = 1; id <= 24; id++) data.diningTable.push({ id, areaId: Math.floor((id - 1) / 8) + 1, code: `T${String(id).padStart(2, '0')}`, seats: id % 3 === 0 ? 6 : 4, status: id === 24 ? 'INACTIVE' : 'ACTIVE', occupancy: id <= 10 ? 'OCCUPIED' : 'VACANT', deletedAt: id === 24 ? at(-1) : null, ...meta() });
  for (let id = 1; id <= 6; id++) data.studyRoom.push({ id, code: `R0${id}`, name: `Study room ${id}`, capacity: id < 4 ? 4 : 8, hourlyRate: 60000 + id * 10000, minimumDurationMinutes: 60, status: id === 6 ? 'MAINTENANCE' : 'ACTIVE', deletedAt: null, ...meta() });
  for (let day = -29; day < 0; day++) {
    for (let half = 0; half < 2; half++) {
      const id = data.cashierShift.length + 1;
      data.cashierShift.push({ id, employeeId: half ? 5 : 4, previousShiftId: id === 1 ? null : id - 1, openedAt: at(day, half ? 15 : 7), closedAt: at(day, half ? 23 : 15), openingCashAdjustment: id === 1 ? 500000 : id % 13 === 0 ? -100000 : 0, countedCash: 0, explanation: null, ...meta(at(day, half ? 15 : 7)) });
    }
  }
  data.cashierShift.push({ id: 59, employeeId: 9, previousShiftId: 58, openedAt: at(0, 7), closedAt: null, openingCashAdjustment: 0, countedCash: null, explanation: null, ...meta(at(0, 7)) });
  for (let id = 1; id <= 8; id++) data.artist.push({ id, stageName: `CafeInn ${id % 2 ? 'Solo' : 'Band'} ${id}`, kind: id % 2 ? 'SOLO' : 'BAND', email: `artist${id}@example.com`, phone: `091000000${id}`, genre: id % 2 ? 'Acoustic' : 'Jazz', notes: null, status: id === 8 ? 'INACTIVE' : 'ACTIVE', deletedAt: null, ...meta() });
  data.recurringBatch.push({ id: 1, fromDate: date(-28), toDate: date(-3), weekdays: ['MON', 'THU'], startTime: new Date('1970-01-01T16:00:00Z'), endTime: new Date('1970-01-01T18:00:00Z'), createdCount: 0, ...meta() });
  const programDays = [-25, -18, -11, -4, 3, 10];
  for (let day = -28; day <= -3; day++) if ([1, 4].includes(date(day).getUTCDay())) programDays.push(day);
  programDays.forEach((day, i) => {
    const id = i + 1;
    const startHour = i < 6 ? 19 : 16;
    data.program.push({ id, areaId: 2, name: `${i < 6 ? 'Special acoustic' : 'Weekly acoustic'} ${id}`, description: 'Demo live music program', kind: i < 6 ? 'SPECIAL' : 'RECURRING', startsAt: at(day, startHour), endsAt: at(day, startHour + 2), status: 'PUBLISHED', recurringBatchId: i < 6 ? null : 1, publishedScheduleVersionId: id, ...meta(at(Math.min(day - 7, -10))) });
    if (i < 6) data.specialEvent.push({ programId: id, capacityLimit: 50, surchargePerPerson: 50000, registrationDeadline: at(day, 17), cancellationDeadline: at(day - 1, 19), holdMinutes: 30, ...meta(at(Math.min(day - 7, -10))) });
    else data.recurringBatch[0].createdCount++;
    data.scheduleVersion.push({ id, programId: id, version: 1, reason: 'Initial published schedule', status: 'PUBLISHED', ...meta(at(Math.min(day - 3, -2))) });
    (['SOUNDCHECK', 'PERFORMANCE', 'BREAK', 'PERFORMANCE'] as const).forEach((kind, index) => {
      const slotId = data.scheduleSlot.length + 1;
      const startMinutes = [0, 15, 60, 75][index];
      const endMinutes = [15, 60, 75, 120][index];
      data.scheduleSlot.push({ id: slotId, scheduleVersionId: id, startsAt: at(day, startHour, startMinutes), endsAt: at(day, startHour, endMinutes), kind, stage: 'Main stage', ...meta(at(Math.min(day - 3, -2))) });
      if (kind === 'PERFORMANCE') data.artistAssignment.push({ scheduleSlotId: slotId, artistId: (i % 7) + 1, invitationId: id, status: 'PARTICIPATING', ...meta(at(Math.min(day - 3, -2))) });
    });
    data.artistInvitation.push({ id, programId: id, artistId: (i % 7) + 1, startsAt: at(day, startHour), endsAt: at(day, startHour + 2), content: 'Demo performance invitation', fee: 1000000, responseDeadline: at(day - 4), acceptToken: id.toString(16).padStart(64, '0'), declineToken: (id + 1000).toString(16).padStart(64, '0'), status: 'ACCEPTED', ...meta(at(Math.min(day - 5, -4))) });
  });
  // Historical surcharges correspond to the four completed special events.
  for (let id = 1; id <= 20; id++) {
    const eventId = Math.floor((id - 1) / 5) + 1;
    const day = programDays[eventId - 1];
    data.eventBooking.push({ id, specialEventId: eventId, contactName: `Guest ${id}`, email: `guest${id}@example.com`, phone: `092000${String(id).padStart(4, '0')}`, channel: id % 2 ? 'ONLINE' : 'STAFF_ASSISTED', guestCount: 2, notes: null, holdUntil: at(day, 19, 30), status: 'ARRIVED', ...meta(at(day - 2)) });
    data.eventAttendance.push({ id, specialEventId: eventId, eventBookingId: id, contactName: null, phone: null, ...meta(at(day, 19)) });
    data.eventCheckIn.push({ id, attendanceId: id, guestCount: 2, createdAt: at(day, 19) });
    data.eventSurcharge.push({ id, checkInId: id, orderId: id, unitPrice: 50000, amount: 100000, ...meta(at(day, 19)) });
  }
  (['HELD', 'CANCELLED', 'NO_SHOW', 'HOLD_EXPIRED', 'PARTIALLY_ARRIVED'] as const).forEach((status, i) => {
    const future = status === 'HELD' || status === 'CANCELLED';
    const day = future ? 3 : -4;
    const id = 21 + i;
    data.eventBooking.push({ id, specialEventId: future ? 5 : 4, contactName: `Reservation ${id}`, email: null, phone: `09300000${id}`, channel: 'ONLINE', guestCount: 4, notes: 'Demo reservation lifecycle', holdUntil: at(day, 19, 30), status, ...meta(at(day - 2)) });
    if (status === 'PARTIALLY_ARRIVED') {
      data.eventAttendance.push({ id: 21, specialEventId: 4, eventBookingId: id, contactName: null, phone: null, ...meta(at(day, 19)) });
      data.eventCheckIn.push({ id: 21, attendanceId: 21, guestCount: 1, createdAt: at(day, 19) });
      data.eventSurcharge.push({ id: 21, checkInId: 21, orderId: 20, unitPrice: 50000, amount: 50000, ...meta(at(day, 19)) });
    }
  });
  for (let id = 1; id <= 150; id++) {
    const room = id >= 101 && id <= 130;
    const open = (id >= 86 && id <= 95) || (id >= 126 && id <= 130);
    const cancelled = id >= 96 && id <= 100;
    const day = open ? 0 : id <= 20 ? programDays[Math.floor((id - 1) / 5)] : -29 + ((id - 1) % 29);
    const hour = id <= 20 ? 19 : id === 131 ? 14 : 10;
    const time = at(day, hour, id === 131 ? 50 : 0);
    const shiftId = open ? 59 : (day + 29) * 2 + (hour >= 15 ? 2 : 1);
    let rentalId: number | null = null;
    if (room) {
      const roomId = ((id - 101) % 5) + 1;
      const bookingId = id - 100;
      data.roomBooking.push({ id: bookingId, roomId, contactName: `Room guest ${bookingId}`, phone: `094000${String(id).padStart(4, '0')}`, email: null, channel: id % 2 ? 'ONLINE' : 'STAFF_ASSISTED', guestCount: 2, expectedCheckinAt: time, expectedCheckoutAt: at(day, hour + 2), status: 'CHECKED_IN', ...meta(at(day - 1)) });
      const segments = id <= 102 ? 2 : 1;
      for (let segment = 0; segment < segments; segment++) {
        rentalId = data.roomRental.length + 1;
        const actualRoomId = segment ? roomId % 5 + 1 : roomId;
        const rate = data.studyRoom[actualRoomId - 1].hourlyRate;
        data.roomRental.push({ id: rentalId, roomBookingId: id >= 123 && id <= 125 ? null : bookingId, roomId: actualRoomId, roomChargeOrderId: id, contactName: id >= 123 && id <= 125 ? `Walk-in ${id}` : null, phone: id >= 123 && id <= 125 ? `0950000${id}` : null, guestCount: 2, checkedInAt: at(day, hour + segment), checkedOutAt: open ? null : at(day, hour + (segments === 2 ? segment + 1 : id === 111 ? 3 : 2)), expectedCheckoutAt: at(day, hour + (id === 111 ? 3 : 2)), hourlyRate: rate, minimumDurationMinutes: 60, roundingMinutes: 15, amount: open ? null : rate * (segments === 2 ? 1 : id === 111 ? 3 : 2), ...meta(at(day, hour + segment)) });
      }
    }
    const order = { id, createdInShiftId: shiftId, serviceType: room ? 'STUDY_ROOM' as const : id > 130 ? 'TAKEAWAY' as const : 'DINE_IN' as const, diningTableId: room || id > 130 ? null : open ? id - 85 : ((id - 1) % 23) + 1, roomRentalId: rentalId, status: open ? 'OPEN' as const : cancelled ? 'CANCELLED' as const : 'PAID' as const, totalAmount: 0, ...meta(time) };
    const onlyFee = id <= 8 || (id >= 101 && id <= 110);
    if (!onlyFee) for (let line = 0; line < 2 + id % 3; line++) {
      const menuItemId = ((id + line) % 28) + 1;
      const quantity = 1 + (id + line) % 3;
      const cancelledQuantity = cancelled ? quantity : id % 12 === 0 && line === 0 ? 1 : 0;
      const itemId = data.orderItem.length + 1;
      data.orderItem.push({ id: itemId, orderId: id, menuItemId, quantity, preparedQuantity: open ? 0 : quantity - cancelledQuantity, cancelledQuantity, unitPrice: data.menuItem[menuItemId - 1].unitPrice, notes: line === 0 && id % 5 === 0 ? 'Less sugar, no ice' : null, ...meta(time) });
      if (cancelledQuantity) data.itemCancellationRequest.push({ id: data.itemCancellationRequest.length + 1, orderItemId: itemId, quantity: cancelledQuantity, reason: 'Customer changed their order before preparation', createdAt: time });
    }
    const itemAmount = data.orderItem.filter(item => item.orderId === id).reduce((sum, item) => sum + (item.quantity - item.cancelledQuantity) * item.unitPrice, 0);
    const fees = data.eventSurcharge.filter(fee => fee.orderId === id);
    const rentals = data.roomRental.filter(rental => rental.roomChargeOrderId === id);
    order.totalAmount = itemAmount + fees.reduce((sum, fee) => sum + fee.amount, 0) + rentals.reduce((sum, rental) => sum + (rental.amount ?? 0), 0);
    data.order.push(order);
    if (order.status === 'PAID') {
      const transactionId = data.paymentTransaction.length + 1;
      const cash = id % 2 === 0;
      const paidAt = id === 131 ? at(day, 15, 20) : at(day, hour + (room ? id === 111 ? 3 : 2 : 0), room ? 0 : 30);
      data.paymentTransaction.push({ id: transactionId, receivedInShiftId: id === 131 ? shiftId + 1 : shiftId, kind: 'COLLECTION', method: cash ? 'CASH' : 'BANK_TRANSFER', amount: order.totalAmount, status: 'SUCCEEDED', cashTendered: cash ? Math.ceil(order.totalAmount / 100000) * 100000 : null, transferContent: cash ? null : `CAFEINN ORDER ${id}`, bankReference: cash ? null : `DEMO-BANK-${id}`, ...meta(paidAt) });
      const allocate = (amount: number, orderId: number | null, eventSurchargeId: number | null, roomRentalId: number | null) => data.paymentAllocation.push({ id: data.paymentAllocation.length + 1, transactionId, amount, orderId, eventSurchargeId, roomRentalId, createdAt: paidAt });
      if (itemAmount) allocate(itemAmount, id, null, null);
      fees.forEach(fee => allocate(fee.amount, null, fee.id, null));
      rentals.forEach(rental => allocate(rental.amount!, null, null, rental.id));
      data.receipt.push({ id: data.receipt.length + 1, transactionId, createdAt: paidAt });
      order.updatedAt = paidAt;
    }
    data.auditLog.push({ id: BigInt(data.auditLog.length + 1), employeeId: open ? 9 : hour >= 15 ? 5 : 4, action: 'ORDER_CREATED', entityType: 'Order', entityKey: { id }, details: { serviceType: order.serviceType }, createdAt: time });
  }
  data.roomBooking = data.roomBooking.filter(row => ![23, 24, 25].includes(row.id));
  (['HELD', 'HELD', 'HELD', 'CANCELLED', 'NO_SHOW', 'CANCELLED', 'NO_SHOW', 'HELD'] as const).forEach((status, index) => {
    const day = status === 'HELD' ? index + 1 : -index - 2;
    data.roomBooking.push({ id: 31 + index, roomId: index % 5 + 1, contactName: `Room reservation ${index}`, phone: `096000000${index}`, email: null, channel: 'ONLINE', guestCount: 3, expectedCheckinAt: at(day, 13), expectedCheckoutAt: at(day, 15), status, ...meta(at(Math.min(day - 2, -1))) });
  });
  for (let index = 0; index < 10; index++) data.eventBooking.push({ id: 26 + index, specialEventId: index < 5 ? 5 : 6, contactName: `Future guest ${index}`, phone: `097000000${index}`, email: null, channel: 'ONLINE', guestCount: 2, notes: null, holdUntil: at(index < 5 ? 3 : 10, 19, 30), status: index % 4 === 0 ? 'CANCELLED' : 'HELD', ...meta(at(-1)) });
  // Split one reservation into two arrivals while preserving its total charge.
  data.eventCheckIn[0].guestCount = 1;
  data.eventSurcharge[0].amount = 50000;
  data.eventCheckIn.push({ id: 22, attendanceId: 1, guestCount: 1, createdAt: new Date(data.eventCheckIn[0].createdAt.getTime() + 10 * 60000) });
  data.eventSurcharge.push({ ...data.eventSurcharge[0], id: 22, checkInId: 22, ...meta(data.eventCheckIn[22 - 1].createdAt) });
  const firstCollection = data.paymentAllocation.find(row => row.eventSurchargeId === 1)!;
  firstCollection.amount = 50000;
  data.paymentAllocation.push({ ...firstCollection, id: data.paymentAllocation.length + 1, eventSurchargeId: 22 });
  // A direct arrival has its own contact, without inventing a reservation.
  data.eventAttendance[19].eventBookingId = null;
  data.eventAttendance[19].contactName = 'Walk-in event guest';
  data.eventAttendance[19].phone = '0980000000';
  data.eventBooking = data.eventBooking.filter(row => row.id !== 20);
  data.eventBooking.push({ ...data.eventBooking[0], id: 36, specialEventId: 5, status: 'HELD', holdUntil: at(3, 19, 30), ...meta(at(-1)) });
  (['PENDING', 'RECONCILIATION_REQUIRED'] as const).forEach((status, index) => {
    const order = data.order.find(row => row.id === 86 + index)!;
    const id = data.paymentTransaction.length + 1;
    data.paymentTransaction.push({ id, receivedInShiftId: 59, kind: 'COLLECTION', method: 'BANK_TRANSFER', amount: order.totalAmount, status, cashTendered: null, transferContent: `CAFEINN ORDER ${order.id}`, bankReference: `DEMO-UNSETTLED-${id}`, ...meta(at(0, 10, 30)) });
    data.paymentAllocation.push({ id: data.paymentAllocation.length + 1, transactionId: id, orderId: order.id, eventSurchargeId: null, roomRentalId: null, amount: order.totalAmount, createdAt: at(0, 10, 30) });
  });
  (['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED', 'COMPLETED'] as const).forEach((status, index) => {
    const allocation = data.paymentAllocation.filter(row => row.orderId !== null)[index];
    const original = data.paymentTransaction.find(row => row.id === allocation.transactionId)!;
    const amount = index === 5 ? allocation.amount : Math.floor(allocation.amount / 4);
    const time = new Date(original.createdAt.getTime() + 15 * 60000);
    let refundTransactionId: number | null = null;
    if (status === 'COMPLETED') {
      refundTransactionId = data.paymentTransaction.length + 1;
      data.paymentTransaction.push({ ...original, id: refundTransactionId, kind: 'REFUND', amount, cashTendered: null, bankReference: original.method === 'BANK_TRANSFER' ? `DEMO-REFUND-${index}` : null, ...meta(time) });
      data.paymentAllocation.push({ ...allocation, id: data.paymentAllocation.length + 1, transactionId: refundTransactionId, amount, createdAt: time });
    }
    data.refundRequest.push({ id: index + 1, allocationId: allocation.id, amount, reason: 'Demo customer refund request', status, reviewerId: status === 'PENDING_APPROVAL' ? null : 1, approvalBasis: status === 'PENDING_APPROVAL' ? null : 'Receipt and customer request reviewed', approvedAt: ['APPROVED', 'COMPLETED', 'FAILED'].includes(status) ? time : null, refundTransactionId, ...meta(time) });
  });
  // Closing balance carries into the next shift; cash tender change is not revenue.
  let previousCash = 0;
  data.cashierShift.forEach(shift => {
    const movement = data.paymentTransaction.filter(tx => tx.receivedInShiftId === shift.id && tx.status === 'SUCCEEDED' && tx.method === 'CASH').reduce((sum, tx) => sum + (tx.kind === 'COLLECTION' ? tx.amount : -tx.amount), 0);
    if (shift.closedAt) {
      const discrepancy = shift.id === 20 ? -10000 : 0;
      shift.countedCash = previousCash + shift.openingCashAdjustment + movement + discrepancy;
      shift.explanation = discrepancy ? 'Cash count short by VND 10,000; recorded for review.' : shift.openingCashAdjustment < 0 ? 'Cash removed for safe deposit.' : null;
      previousCash = shift.countedCash;
      shift.updatedAt = shift.closedAt;
    }
  });
  (['F', 'H1', 'H2', 'H3', 'H4', 'H5'] as const).forEach((category, i) => {
    for (let week = 0; week < 4; week++) data.expenseEntry.push({ id: data.expenseEntry.length + 1, category, amount: (i + 1) * 100000 + week * 10000, occurredOn: date(-28 + week * 7), documentNumber: `DEMO-EXP-${i}-${week}`, allocationBasis: 'Actual expense for this reporting period', description: `Demo ${category} expense`, ...meta(at(-28 + week * 7)) });
  });
  for (let id = 1; id <= 3; id++) {
    const zero = id === 3;
    data.profitReport.push({ id, fromDate: date(zero ? -40 : id === 1 ? -29 : 0), toDate: date(zero ? -40 : id === 1 ? -1 : 0), version: 1, status: id === 1 ? 'CHECKED' : 'PROVISIONAL', dataCompleteness: id === 2 ? 'MISSING_DATA' : 'COMPLETE', reviewerId: id === 1 ? 1 : null, checkedAt: id === 1 ? at(0, 8) : null, notes: id === 2 ? 'Current-day expenses not yet entered.' : null, ...meta(at(0, 8)) });
    (['A', 'B', 'C', 'D', 'F', 'H1', 'H2', 'H3', 'H4', 'H5'] as const).forEach(code => {
      const missing = id === 2 && ['F', 'H1', 'H2', 'H3', 'H4', 'H5'].includes(code);
      let amount = 0;
      if (id === 1) {
        if (code === 'A') amount = data.paymentAllocation.filter(row => row.orderId !== null && data.paymentTransaction.find(tx => tx.id === row.transactionId)!.kind === 'COLLECTION' && data.paymentTransaction.find(tx => tx.id === row.transactionId)!.status === 'SUCCEEDED').reduce((sum, row) => sum + row.amount, 0);
        else if (code === 'B') amount = data.paymentAllocation.filter(row => row.roomRentalId !== null && data.paymentTransaction.find(tx => tx.id === row.transactionId)!.kind === 'COLLECTION' && data.paymentTransaction.find(tx => tx.id === row.transactionId)!.status === 'SUCCEEDED').reduce((sum, row) => sum + row.amount, 0);
        else if (code === 'C') amount = data.paymentAllocation.filter(row => row.eventSurchargeId !== null && data.paymentTransaction.find(tx => tx.id === row.transactionId)!.kind === 'COLLECTION' && data.paymentTransaction.find(tx => tx.id === row.transactionId)!.status === 'SUCCEEDED').reduce((sum, row) => sum + row.amount, 0);
        else if (code === 'D') amount = data.paymentTransaction.filter(tx => tx.kind === 'REFUND' && tx.status === 'SUCCEEDED').reduce((sum, tx) => sum + tx.amount, 0);
        else amount = data.expenseEntry.filter(row => row.category === code).reduce((sum, row) => sum + row.amount, 0);
      }
      data.profitReportLine.push({ reportId: id, id: code, amount: missing ? null : amount, dataStatus: missing ? 'MISSING_DATA' : amount === 0 ? 'NO_ACTIVITY' : 'AVAILABLE', notes: missing ? 'Awaiting expense documents' : null, ...meta(at(0, 8)) });
    });
  }
  data.roomRental.forEach(row => { row.updatedAt = row.checkedOutAt ?? row.checkedInAt; });
  const audit = (action: typeof data.auditLog[number]['action'], entityType: string, id: number, time: Date, details: Record<string, number | string> = {}, employeeId = 1) => data.auditLog.push({ id: BigInt(data.auditLog.length + 1), action, entityType, entityKey: { id }, details, employeeId, createdAt: time });
  data.paymentTransaction.forEach(row => {
    if (row.status === 'SUCCEEDED' && row.kind === 'COLLECTION') audit('PAYMENT_CONFIRMED', 'PaymentTransaction', row.id, row.updatedAt, { amount: row.amount }, data.cashierShift.find(shift => shift.id === row.receivedInShiftId)!.employeeId);
    if (row.status === 'RECONCILIATION_REQUIRED') audit('PAYMENT_MISMATCH', 'PaymentTransaction', row.id, row.updatedAt);
  });
  data.receipt.forEach(row => audit('RECEIPT_ISSUED', 'Receipt', row.id, row.createdAt));
  data.refundRequest.forEach(row => {
    audit('REFUND_REQUESTED', 'RefundRequest', row.id, row.createdAt);
    if (row.approvedAt) audit('REFUND_APPROVED', 'RefundRequest', row.id, row.approvedAt);
    if (row.status === 'REJECTED') audit('REFUND_REJECTED', 'RefundRequest', row.id, row.updatedAt);
    if (row.status === 'COMPLETED') audit('REFUND_COMPLETED', 'RefundRequest', row.id, row.updatedAt, { transactionId: row.refundTransactionId!, amount: row.amount });
  });
  data.roomRental.forEach(row => {
    audit('ROOM_CHECKED_IN', 'RoomRental', row.id, row.checkedInAt);
    if (row.checkedOutAt) audit('ROOM_CHECKED_OUT', 'RoomRental', row.id, row.checkedOutAt);
    if (row.id === 2 || row.id === 4) audit('ROOM_MOVED', 'RoomRental', row.id, row.checkedInAt, { oldRentalId: row.id - 1, newRentalId: row.id, orderId: row.roomChargeOrderId! });
    if (row.roomChargeOrderId === 111) audit('ROOM_EXTENDED', 'RoomRental', row.id, new Date(row.checkedInAt.getTime() + 3600000), { oldExpectedCheckout: new Date(row.checkedInAt.getTime() + 7200000).toISOString(), newExpectedCheckout: row.expectedCheckoutAt.toISOString() });
  });
  data.eventCheckIn.forEach(row => audit('CHECKIN_RECORDED', 'EventCheckIn', row.id, row.createdAt, { guestCount: row.guestCount }));
  data.cashierShift.forEach(row => { audit('SHIFT_OPENED', 'CashierShift', row.id, row.openedAt, {}, row.employeeId); if (row.closedAt) audit('SHIFT_CLOSED', 'CashierShift', row.id, row.closedAt, {}, row.employeeId); });
  data.profitReport.forEach(row => { audit('REPORT_CREATED', 'ProfitReport', row.id, row.createdAt); if (row.checkedAt) audit('REPORT_CHECKED', 'ProfitReport', row.id, row.checkedAt); });
  data.systemSetting.push({ key: 'DEMO_CURRENCY', value: 'VND', description: 'Demo amounts use whole Vietnamese dong', ...meta() });
  for (const rows of [data.employee, data.menuItem, data.diningTable]) for (const row of rows) if (row.deletedAt) row.updatedAt = row.deletedAt;
  return data;
}
