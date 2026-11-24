export const staffGrants = {
  ADMIN: [
    'users.manage',
    'reports.read',
    'menu.manage',
    'tables.manage',
    'rooms.manage',
    'refunds.approve',
    'expenses.manage',
    'policies.manage',
    'audit.read',
  ],
  EVENT_STAFF: ['events.manage'],
  SALES_STAFF: ['sales.manage', 'menu.status', 'refunds.request'],
} as const;
