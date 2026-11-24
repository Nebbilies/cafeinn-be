import assert from 'node:assert/strict';
import test from 'node:test';
import { pageOffset, pageResult, paginationQuery } from '../src/common/pagination.ts';

test('pagination defaults, limits and empty results follow the list contract', () => {
  const defaults = paginationQuery.parse({});
  assert.deepEqual(defaults, { page: 1, pageSize: 10 });
  assert.equal(pageOffset(defaults), 0);
  assert.deepEqual(pageResult([], defaults, 0), {
    items: [],
    pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
  });
  const beyondEnd = paginationQuery.parse({ page: '3', pageSize: '50' });
  assert.equal(pageOffset(beyondEnd), 100);
  assert.deepEqual(pageResult([], beyondEnd, 51).pagination, {
    page: 3, pageSize: 50, totalItems: 51, totalPages: 2,
  });
});
