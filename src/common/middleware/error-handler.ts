import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../api-error.ts';
import { Prisma } from '../../generated/prisma/client.ts';

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const expected =
    error instanceof ApiError
      ? error
      : error instanceof ZodError || error?.type === 'entity.parse.failed'
        ? new ApiError(400, 'INVALID_INPUT')
        : error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
          ? new ApiError(409, 'DUPLICATE_IDENTIFIER')
          : undefined;
  if (expected) {
    response.status(expected.status).json({ error: { code: expected.code, message: expected.message } });
    return;
  }
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  });
};
