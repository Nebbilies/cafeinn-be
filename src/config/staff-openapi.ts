import { z } from 'zod';
import { loginBody, requestBody, resetBody } from '../modules/auth/auth.schema.ts';
import { createStaff, employeeListParameters, patchStaff } from '../modules/employees/employees.schema.ts';
import { paginatedResponse, paginationParameters } from '../common/pagination.ts';

const identity = z.object({
  id: z.int(),
  fullName: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
const employee = identity.omit({ permissions: true }).extend({
  username: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
const error = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
const employeeListQueryDescriptions = {
  page: 'One-based page number.',
  pageSize: 'Number of employees per page.',
  search: 'Partial name, username or email, or a complete employee code such as NV012.',
  sort: 'Sort by ID or full name. Equal names are ordered by ascending employee ID.',
  status: 'Filter by account status. Omit to include both statuses.',
};
function content(schema: z.ZodType) {
  return { 'application/json': { schema: z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' }) } };
}
function operation(
  summary: string,
  options: {
    input?: z.ZodType;
    output?: z.ZodType;
    status?: number;
    secured?: boolean;
    id?: boolean;
    errors?: number[];
  },
) {
  const responses: Record<number, unknown> = {
    [options.status ?? 200]: {
      description: summary,
      ...(options.output && { content: content(options.output) }),
    },
  };
  const descriptions: Record<number, string> = {
    400: 'Invalid input or recovery code.',
    401: 'Invalid credentials or expired session.',
    403: 'Origin rejected or permission denied.',
    404: 'Employee not found.',
    409: 'Identifier conflict or last active Admin.',
    429: 'Request limit reached.',
    503: 'Recovery is unavailable.',
  };
  for (const code of options.errors ?? [])
    responses[code] = { description: descriptions[code], content: content(error) };
  return {
    summary,
    security: options.secured ? [{ staffCookie: [] }] : [],
    responses,
    ...(options.id && {
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer', minimum: 1 } }],
    }),
    ...(options.input && { requestBody: { required: true, content: content(options.input) } }),
  };
}
export const staffPaths = {
  '/api/v1/auth/login': {
    post: operation('Sign in and issue a session cookie', {
      input: loginBody,
      output: identity,
      errors: [400, 401, 403, 429],
    }),
  },
  '/api/v1/auth/session': {
    get: operation('Read current identity and permissions', {
      output: identity,
      secured: true,
      errors: [401],
    }),
  },
  '/api/v1/auth/logout': {
    post: operation('Revoke the current session and clear the cookie', { status: 204, errors: [403] }),
  },
  '/api/v1/auth/recovery/request': {
    post: operation('Request a recovery email', {
      input: requestBody,
      status: 204,
      errors: [400, 403, 429, 503],
    }),
  },
  '/api/v1/auth/recovery/reset': {
    post: operation('Consume the code and reset the password', {
      input: resetBody,
      status: 204,
      errors: [400, 403, 429, 503],
    }),
  },
  '/api/v1/employees': {
    get: {
      ...operation('List employees (users.manage)', {
        output: paginatedResponse(employee),
        secured: true,
        errors: [400, 401, 403],
      }),
      description: 'Totals include matching employees before pagination. Pages past the end return an empty items array.',
      parameters: Object.entries({ ...paginationParameters, ...employeeListParameters }).map(
        ([name, schema]) => ({
          in: 'query',
          name,
          description: employeeListQueryDescriptions[name as keyof typeof employeeListQueryDescriptions],
          required: false,
          schema: z.toJSONSchema(schema, { target: 'openapi-3.0' }),
        }),
      ),
    },
    post: operation('Create an employee (users.manage)', {
      input: createStaff,
      output: employee,
      status: 201,
      secured: true,
      errors: [400, 401, 403, 409],
    }),
  },
  '/api/v1/employees/{id}': {
    get: operation('Read employee details (users.manage)', {
      id: true,
      output: employee,
      secured: true,
      errors: [400, 401, 403, 404],
    }),
    patch: operation('Update an employee (users.manage)', {
      id: true,
      input: patchStaff,
      output: employee,
      secured: true,
      errors: [400, 401, 403, 404, 409],
    }),
  },
};
