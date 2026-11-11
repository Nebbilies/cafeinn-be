import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { errorHandler } from '../src/common/middleware/error-handler.ts';
import { serve } from './support/http-fixture.ts';

test('unexpected production errors expose only the generic error contract', async (context) => {
  const app = express();
  app.set('env', 'production');
  app.get('/fixture', () => { throw new Error('private connection detail'); });
  app.use(errorHandler);
  const url = await serve(app, context);
  const response = await fetch(url + '/fixture');
  assert.equal(response.status, 500);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await response.json(), {
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  });
});
