import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.ts';
import { serve } from './support/http-fixture.ts';

test('anonymous session and employee list require sign-in', async (context) => {
  const base = await serve(createApp(), context);
  for (const path of ['auth/session', 'employees']) {
    assert.equal((await fetch(base + '/api/v1/' + path)).status, 401);
  }
});

test('login limit counts requests across identifiers and rejects foreign origins', async (context) => {
  const base = await serve(createApp(), context);
  const path = base + '/api/v1/auth/login';
  assert.equal(
    (await fetch(path, { method: 'POST', headers: { Origin: 'https://outside.example' } })).status,
    403,
  );
  for (let i = 0; i < 30; i++)
    assert.equal(
      (
        await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: String(i) }),
        })
      ).status,
      400,
    );
  assert.equal((await fetch(path, { method: 'POST' })).status, 429);
});

test('invalid login is validated without needing storage', async (context) => {
  const base = await serve(createApp(), context);
  const response = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 400);
});

test('employee list rejects invalid and repeated query inputs before storage access', async (context) => {
  const base = await serve(createApp(), context);
  const cookie = 'cafeinn_session=' + 'a'.repeat(64);
  for (const query of [
    'page=0', 'page=1.5', 'page=1e2', 'page=1&page=2', 'pageSize=51',
    'page=42949674&pageSize=50', 'status=all', 'sort=email.asc', 'search=x&search=y',
  ]) {
    const response = await fetch(base + '/api/v1/employees?' + query, { headers: { cookie } });
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).error.code, 'INVALID_INPUT', query);
  }
});
