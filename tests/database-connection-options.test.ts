import assert from 'node:assert/strict';
import test from 'node:test';
import { createDatabaseOptions } from '../src/database/connection-options.ts';

test('canonical MySQL URL preserves connection identity and configures UTC', () => {
  const options = createDatabaseOptions(
    'mysql://cashier:p%40ss%3Aword@database.example.invalid:3307/cafeinn?connectionLimit=4',
  );
  assert.equal(options.host, 'database.example.invalid');
  assert.equal(options.port, 3307);
  assert.equal(options.database, 'cafeinn');
  assert.equal(options.user, 'cashier');
  assert.equal(options.password, 'p@ss:word');
  assert.equal(options.connectionLimit, 4);
  assert.equal(options.timezone, '+00:00');
  assert.deepEqual(options.sessionVariables, { time_zone: '+00:00' });
});

test('TLS settings survive and initialization cannot replace the UTC session', () => {
  const url = new URL('mysql://reader:example@database.example.invalid/cafeinn');
  url.searchParams.set('ssl', JSON.stringify({ rejectUnauthorized: true, ca: 'fixture-ca' }));
  url.searchParams.set('sessionVariables', JSON.stringify({ time_zone: '+07:00', sql_safe_updates: 1 }));
  url.searchParams.set('timezone', '+07:00');
  url.searchParams.set('initSql', 'SET SESSION time_zone = "+07:00"');
  const options = createDatabaseOptions(url.toString());
  assert.deepEqual(options.ssl, { rejectUnauthorized: true, ca: 'fixture-ca' });
  assert.equal(options.timezone, '+00:00');
  assert.deepEqual(options.sessionVariables, { time_zone: '+00:00', sql_safe_updates: 1 });
  assert.deepEqual(options.initSql, [
    'SET SESSION time_zone = "+07:00"',
    "SET SESSION time_zone = '+00:00'",
  ]);
});

test('invalid configuration fails without exposing the connection URL or credentials', () => {
  for (const value of [
    'not-a-url-with-private-password',
    'postgresql://employee:private-password@database.example.invalid/cafeinn',
    'mysql://employee:private-password@database.example.invalid/',
    'mysql://employee:private-password@database.example.invalid/cafeinn?ssl=%7Bbad',
    'mysql://employee:private-password@database.example.invalid/cafeinn?ssl=%7B%22rejectUnauthorized%22%3Afalse%7D',
  ]) {
    assert.throws(() => createDatabaseOptions(value), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Invalid database connection configuration.');
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});
