import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.ts';
import { serve } from './support/http-fixture.ts';

test('liveness returns the public contract without database configuration', async (context) => {
  const baseUrl = await serve(createApp(), context);
  const response = await fetch(baseUrl + '/api/v1/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'cafeinn-be' });
});

test('unknown routes return the stable JSON error contract', async (context) => {
  const baseUrl = await serve(createApp(), context);
  const response = await fetch(baseUrl + '/missing');
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_FOUND', message: 'Resource not found.' },
  });
});

test('CORS allows only the configured frontend origin', async (context) => {
  const origin = 'https://staff.example.test';
  const baseUrl = await serve(createApp({ corsOrigin: origin }), context);
  const allowed = await fetch(baseUrl + '/api/v1/health', { headers: { origin } });
  await allowed.text();
  assert.equal(allowed.headers.get('access-control-allow-origin'), origin);
  const blocked = await fetch(baseUrl + '/api/v1/health', {
    headers: { origin: 'https://untrusted.example.test' },
  });
  await blocked.text();
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});
