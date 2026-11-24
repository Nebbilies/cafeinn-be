import { z } from 'zod';
import { email, password } from '../auth/auth.schema.ts';
import { paginationQuery } from '../../common/pagination.ts';

const fields = z.object({
  username: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[^@\s]+$/),
  fullName: z.string().trim().min(1).max(100),
  email,
  phone: z.string().trim().max(15).nullable().optional(),
  roles: z
    .array(z.enum(['ADMIN', 'SALES_STAFF', 'EVENT_STAFF']))
    .max(3)
    .refine((values) => new Set(values).size === values.length),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export const createStaff = fields
  .extend({ password, confirmation: password, status: fields.shape.status.default('ACTIVE') })
  .strict()
  .refine((input) => input.password === input.confirmation);
export const patchStaff = fields
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0);
export const employeeId = z.coerce.number().int().positive().max(2147483647);

export const employeeListParameters = {
  search: z.string().trim().max(100).optional(),
  status: fields.shape.status.optional(),
  sort: z.enum(['id.asc', 'name.asc', 'name.desc']).default('id.asc'),
};
export const listStaff = paginationQuery.safeExtend(employeeListParameters).strict();
export type StaffListQuery = z.infer<typeof listStaff>;
