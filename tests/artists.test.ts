import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.ts';
import { ApiError } from '../src/common/api-error.ts';
import { escapeLike } from '../src/common/utils/escape-like.ts';
import { artistDto, buildArtistWhere } from '../src/modules/artists/artists.repository.ts';
import { assertDeletableArtist } from '../src/modules/artists/artists.service.ts';
import {
  normalizeArtistEmail,
  normalizeOptionalText,
} from '../src/modules/artists/utils/normalize-artist.ts';
import { serve } from './support/http-fixture.ts';

test('anonymous requests to artist endpoints require sign-in', async (context) => {
  const base = await serve(createApp(), context);
  for (const [method, path] of [
    ['GET', '/api/v1/artists'],
    ['GET', '/api/v1/artists/1'],
    ['POST', '/api/v1/artists'],
    ['PATCH', '/api/v1/artists/1'],
    ['DELETE', '/api/v1/artists/1'],
  ] as const) {
    const response = await fetch(base + path, {
      method,
      headers: method === 'POST' || method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify({ stageName: 'Mộc', kind: 'BAND', email: 'moc@example.com' }) : method === 'PATCH' ? JSON.stringify({ stageName: 'Mộc' }) : undefined,
    });
    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal((await response.json()).error.code, 'SESSION_REQUIRED');
  }
});

test('artist mutating endpoints reject foreign origins', async (context) => {
  const base = await serve(createApp(), context);
  for (const [method, path] of [
    ['POST', '/api/v1/artists'],
    ['PATCH', '/api/v1/artists/1'],
    ['DELETE', '/api/v1/artists/1'],
  ] as const) {
    const response = await fetch(base + path, {
      method,
      headers: { Origin: 'https://outside.example' },
    });
    assert.equal(response.status, 403, `${method} ${path}`);
    assert.equal((await response.json()).error.code, 'ORIGIN_REJECTED');
  }
});

test('artist list rejects invalid query parameters before storage access', async (context) => {
  const base = await serve(createApp(), context);
  const cookie = 'cafeinn_session=' + 'a'.repeat(64);
  for (const query of [
    'page=0',
    'page=1.5',
    'page=1e2',
    'page=1&page=2',
    'pageSize=51',
    'page=42949674&pageSize=50',
    'status=all',
    'kind=DUO',
    'sort=email.asc',
    'search=x&search=y',
    'unknown=1',
  ]) {
    const response = await fetch(base + '/api/v1/artists?' + query, { headers: { cookie } });
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).error.code, 'INVALID_INPUT', query);
  }
});

test('artist detail, create, update, and delete reject invalid path and body inputs before storage access', async (context) => {
  const base = await serve(createApp(), context);
  const cookie = 'cafeinn_session=' + 'a'.repeat(64);

  for (const badId of ['0', '-1', 'abc', '2147483648']) {
    for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
      const response = await fetch(base + '/api/v1/artists/' + badId, {
        method,
        headers: {
          cookie,
          ...(method === 'PATCH' ? { 'Content-Type': 'application/json' } : {}),
        },
        body: method === 'PATCH' ? JSON.stringify({ stageName: 'Mộc' }) : undefined,
      });
      assert.equal(response.status, 400, `${method} /artists/${badId}`);
      assert.equal((await response.json()).error.code, 'INVALID_INPUT');
    }
  }

  for (const body of [
    {},
    { stageName: '   ', kind: 'SOLO', email: 'a@b.com' },
    { stageName: 'Mộc', kind: 'TRIO', email: 'a@b.com' },
    { stageName: 'Mộc', kind: 'SOLO', email: 'not-an-email' },
    { stageName: 'Mộc', kind: 'SOLO', email: 'a@b.com', extraField: true },
  ]) {
    const response = await fetch(base + '/api/v1/artists', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_INPUT');
  }

  const emptyPatch = await fetch(base + '/api/v1/artists/1', {
    method: 'PATCH',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(emptyPatch.status, 400);
  assert.equal((await emptyPatch.json()).error.code, 'INVALID_INPUT');
});

test('artist normalization, search filter, DTO mapping, and history deletion guard behave per QD12', () => {
  assert.equal(normalizeArtistEmail('  BanNhac.Moc@Example.COM  '), 'bannhac.moc@example.com');
  assert.equal(normalizeOptionalText(undefined), undefined);
  assert.equal(normalizeOptionalText(null), null);
  assert.equal(normalizeOptionalText('   '), null);
  assert.equal(normalizeOptionalText(' Acoustic '), 'Acoustic');

  const codeWhere = buildArtistWhere({ search: 'NS012', status: 'ACTIVE', kind: 'BAND' });
  assert.equal(codeWhere.deletedAt, null);
  assert.equal(codeWhere.status, 'ACTIVE');
  assert.equal(codeWhere.kind, 'BAND');
  assert.ok(Array.isArray(codeWhere.OR));
  assert.ok(codeWhere.OR.some((clause) => 'id' in clause && clause.id === 12));

  assert.equal(escapeLike('100%_\\Band'), '100\\%\\_\\\\Band');
  const escapedWhere = buildArtistWhere({ search: '100%_Band' });
  assert.deepEqual(escapedWhere.OR?.[0], { stageName: { contains: '100\\%\\_Band' } });

  const unusedDto = artistDto({
    id: 1,
    stageName: 'Mộc Band',
    kind: 'BAND',
    email: 'moc@example.com',
    phone: null,
    genre: 'Acoustic',
    notes: null,
    status: 'ACTIVE',
    _count: { artistInvitations: 0, artistAssignments: 0 },
  });
  assert.equal(unusedDto.hasHistory, false);
  assert.doesNotThrow(() => assertDeletableArtist(unusedDto));

  const usedByInvitation = artistDto({
    ...unusedDto,
    _count: { artistInvitations: 1, artistAssignments: 0 },
  });
  assert.equal(usedByInvitation.hasHistory, true);
  assert.throws(
    () => assertDeletableArtist(usedByInvitation),
    (error: unknown) => error instanceof ApiError && error.status === 409 && error.code === 'ARTIST_HAS_HISTORY',
  );

  const usedByAssignment = artistDto({
    ...unusedDto,
    _count: { artistInvitations: 0, artistAssignments: 2 },
  });
  assert.equal(usedByAssignment.hasHistory, true);
  assert.throws(
    () => assertDeletableArtist(usedByAssignment),
    (error: unknown) => error instanceof ApiError && error.status === 409 && error.code === 'ARTIST_HAS_HISTORY',
  );
});

test('OpenAPI documents artist contact endpoints and query parameters', async (context) => {
  const base = await serve(createApp(), context);
  const document = await (await fetch(base + '/api-docs.json')).json();

  const collection = document.paths['/api/v1/artists'];
  assert.ok(collection?.get);
  assert.ok(collection?.post);
  const parameters = Object.fromEntries(
    collection.get.parameters.map((parameter: { name: string; schema: object }) => [parameter.name, parameter.schema]),
  );
  assert.deepEqual(Object.keys(parameters).sort(), ['kind', 'page', 'pageSize', 'search', 'sort', 'status']);
  assert.ok(collection.post.responses[201]);
  assert.ok(collection.post.responses[409]);

  const item = document.paths['/api/v1/artists/{id}'];
  assert.ok(item?.get);
  assert.ok(item?.patch);
  assert.ok(item?.delete);
  assert.ok(item.delete.responses[204]);
  assert.ok(item.delete.responses[409]);
});
