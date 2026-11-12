import type { Employee, Role, Permission, EmployeeRole, RolePermission, AuthSession, VerificationCode, AuditLog, SystemSetting, MenuCategory, MenuItem, ServiceArea, DiningTable, StudyRoom, RoomBooking, EventBooking, Program, SpecialEvent, RecurringBatch, ScheduleVersion, ScheduleSlot, Artist, ArtistInvitation, ArtistAssignment, EventAttendance, EventCheckIn, EventSurcharge, RoomRental, Order, OrderItem, PaymentTransaction, PaymentAllocation, Receipt, ItemCancellationRequest, RefundRequest, CashierShift, ExpenseEntry, ProfitReport, ProfitReportLine } from '../../src/generated/prisma/client.ts';

export interface DemoData {
  employee: Employee[];
  role: Role[];
  permission: Permission[];
  employeeRole: EmployeeRole[];
  rolePermission: RolePermission[];
  authSession: AuthSession[];
  verificationCode: VerificationCode[];
  auditLog: AuditLog[];
  systemSetting: SystemSetting[];
  menuCategory: MenuCategory[];
  menuItem: MenuItem[];
  serviceArea: ServiceArea[];
  diningTable: DiningTable[];
  studyRoom: StudyRoom[];
  roomBooking: RoomBooking[];
  eventBooking: EventBooking[];
  program: Program[];
  specialEvent: SpecialEvent[];
  recurringBatch: RecurringBatch[];
  scheduleVersion: ScheduleVersion[];
  scheduleSlot: ScheduleSlot[];
  artist: Artist[];
  artistInvitation: ArtistInvitation[];
  artistAssignment: ArtistAssignment[];
  eventAttendance: EventAttendance[];
  eventCheckIn: EventCheckIn[];
  eventSurcharge: EventSurcharge[];
  roomRental: RoomRental[];
  order: Order[];
  orderItem: OrderItem[];
  paymentTransaction: PaymentTransaction[];
  paymentAllocation: PaymentAllocation[];
  receipt: Receipt[];
  itemCancellationRequest: ItemCancellationRequest[];
  refundRequest: RefundRequest[];
  cashierShift: CashierShift[];
  expenseEntry: ExpenseEntry[];
  profitReport: ProfitReport[];
  profitReportLine: ProfitReportLine[];
}

export function emptyData(): DemoData {
  return {
    employee: [],
    role: [],
    permission: [],
    employeeRole: [],
    rolePermission: [],
    authSession: [],
    verificationCode: [],
    auditLog: [],
    systemSetting: [],
    menuCategory: [],
    menuItem: [],
    serviceArea: [],
    diningTable: [],
    studyRoom: [],
    roomBooking: [],
    eventBooking: [],
    program: [],
    specialEvent: [],
    recurringBatch: [],
    scheduleVersion: [],
    scheduleSlot: [],
    artist: [],
    artistInvitation: [],
    artistAssignment: [],
    eventAttendance: [],
    eventCheckIn: [],
    eventSurcharge: [],
    roomRental: [],
    order: [],
    orderItem: [],
    paymentTransaction: [],
    paymentAllocation: [],
    receipt: [],
    itemCancellationRequest: [],
    refundRequest: [],
    cashierShift: [],
    expenseEntry: [],
    profitReport: [],
    profitReportLine: [],
  };
}
