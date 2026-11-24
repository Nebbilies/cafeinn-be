import { z } from 'zod';
export const password = z
  .string()
  .min(8)
  .max(256)
  .refine((value) => Array.from(value).length >= 8);
export const email = z.email().max(100);
export const loginBody = z.object({
  identifier: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
});
export const requestBody = z.object({ email });
export const resetBody = z.object({ email, code: z.string().regex(/^\d{6}$/), password });
