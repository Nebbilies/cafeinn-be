import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.ts';
import { serve } from './support/http-fixture.ts';
import { readEnvironment } from '../src/config/env.ts';

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

test('wildcard CORS keeps staff cookies and mutations limited to the local portal', async (context) => {
  const { CORS_ORIGIN } = readEnvironment({ CORS_ORIGIN: '*' });
  const baseUrl = await serve(createApp({ corsOrigin: CORS_ORIGIN }), context);
  const outsider = 'https://outside.example';
  const publicResponse = await fetch(baseUrl + '/api/v1/health', { headers: { Origin: outsider } });
  assert.equal(publicResponse.headers.get('access-control-allow-origin'), '*');
  assert.equal(publicResponse.headers.get('access-control-allow-credentials'), null);
  const portal = 'http://localhost:3000';
  const preflight = await fetch(baseUrl + '/api/v1/auth/login', {
    method: 'OPTIONS',
    headers: { Origin: portal, 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(preflight.headers.get('access-control-allow-origin'), portal);
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  const rejected = await fetch(baseUrl + '/api/v1/auth/login', {
    method: 'POST',
    headers: { Origin: outsider },
  });
  assert.equal(rejected.status, 403);
});
