import { z } from 'zod';

const maxOffset = 2_147_483_647;
const pageNumber = z.int().min(1);
const pageSize = pageNumber.max(50);
export const paginationParameters = {
  page: pageNumber.default(1),
  pageSize: pageSize.default(10),
};

function fromQuery(value: unknown) {
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
}

export const paginationQuery = z.object({
  page: z.preprocess(fromQuery, paginationParameters.page),
  pageSize: z.preprocess(fromQuery, paginationParameters.pageSize),
}).refine((page) => pageOffset(page) <= maxOffset, { path: ['page'], message: 'Page offset is too large.' });

type PageRequest = { page: number; pageSize: number };

export function pageOffset({ page, pageSize }: PageRequest) {
  return (page - 1) * pageSize;
}

export function pageResult<T>(items: T[], { page, pageSize }: PageRequest, totalItems: number) {
  return { items, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

export function paginatedResponse(item: z.ZodType) {
  return z.object({
    items: z.array(item),
    pagination: z.object({
      page: pageNumber,
      pageSize,
      totalItems: z.int().min(0),
      totalPages: z.int().min(0),
    }),
  });
}
