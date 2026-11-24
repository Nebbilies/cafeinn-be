import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.ts';
import { serve } from './support/http-fixture.ts';

test('OpenAPI documents the live health response without database configuration', async (context) => {
  const baseUrl = await serve(createApp(), context);
  const response = await fetch(baseUrl + '/api-docs.json');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  const document = await response.json();
  assert.equal(document.openapi, '3.0.3');
  assert.equal(document.info.title, 'CafeInn API');
  assert.deepEqual(document.servers, [{ url: '/' }]);

  const health = await fetch(baseUrl + '/api/v1/health');
  const documentedResponse = document.paths['/api/v1/health'].get.responses[health.status];
  const content = documentedResponse.content['application/json'];
  const body = await health.json();
  assert.deepEqual(content.example, body);
  assert.deepEqual(content.schema.required.sort(), Object.keys(body).sort());
  for (const [key, value] of Object.entries(body)) {
    assert.ok(content.schema.properties[key].enum.includes(value));
  }
});

test('OpenAPI describes the employee list query and pagination response', async (context) => {
  const baseUrl = await serve(createApp(), context);
  const document = await (await fetch(baseUrl + '/api-docs.json')).json();
  const operation = document.paths['/api/v1/employees'].get;
  const parameters = Object.fromEntries(operation.parameters?.map(
    (parameter: { name: string; schema: object }) => [parameter.name, parameter.schema],
  ) ?? []);
  assert.deepEqual(Object.keys(parameters).sort(), ['page', 'pageSize', 'search', 'sort', 'status']);
  assert.equal(parameters.page.default, 1);
  assert.equal(parameters.pageSize.default, 10);
  assert.equal(parameters.pageSize.maximum, 50);
  const response = operation.responses[200].content['application/json'].schema;
  assert.deepEqual(response.required.sort(), ['items', 'pagination']);
  assert.deepEqual(response.properties.pagination.required.sort(), ['page', 'pageSize', 'totalItems', 'totalPages']);
  assert.ok(operation.responses[400]);
});

test('Swagger UI redirects, serves local assets, and loads the OpenAPI endpoint', async (context) => {
  const baseUrl = await serve(createApp(), context);
  const redirect = await fetch(baseUrl + '/api-docs', { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), '/api-docs/');
  await redirect.text();

  const page = await fetch(baseUrl + '/api-docs/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  const html = await page.text();
  assert.match(html, /<title>CafeInn API docs<\/title>/);
  const policy = page.headers.get('content-security-policy') ?? '';
  assert.match(policy, /script-src 'self'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);

  const assetPaths = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)];
  assert.ok(assetPaths.length > 0);
  for (const [, path] of assetPaths) {
    const asset = await fetch(new URL(path, baseUrl + '/api-docs/'));
    assert.equal(asset.status, 200, path);
    assert.doesNotMatch(asset.headers.get('content-type') ?? '', /text\/html/);
    const body = await asset.text();
    if (path === './swagger-ui-init.js') {
      assert.match(body, /"url": "\/api-docs.json"/);
      assert.match(body, /"validatorUrl": null/);
    }
  }

  const health = await fetch(baseUrl + '/api/v1/health');
  await health.text();
  assert.match(health.headers.get('content-security-policy') ?? '', /upgrade-insecure-requests/);
});
