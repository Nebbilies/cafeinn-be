import { EVENTS_MANAGE_PERMISSION } from '../../common/constants/permissions.constants.ts';

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
  EVENT_STAFF: [EVENTS_MANAGE_PERMISSION],
  SALES_STAFF: ['sales.manage', 'menu.status', 'refunds.request'],
} as const;
