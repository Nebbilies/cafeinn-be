import assert from "node:assert/strict";
import test from "node:test";
import { programTestDatabaseUrl } from "./support/program-test-database.ts";
import { createDatabaseOptions } from "../src/database/connection-options.ts";

test("test database guard preserves permitted destinations without opening connections", () => {
  for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
    const url = `mysql://USER:PASSWORD@${host}:3307/cafeinn_program_test_fixture`;
    const validated = programTestDatabaseUrl(url);
    assert.equal(validated, url);
    const options = createDatabaseOptions(validated);
    assert.equal(options.database, "cafeinn_program_test_fixture");
    assert.equal(options.port, 3307);
    assert.equal(options.host, host === "[::1]" ? "::1" : host);
  }
});

test("test database guard rejects all query options and unsafe destinations", () => {
  const base = "mysql://USER:PASSWORD@127.0.0.1/cafeinn_program_test_fixture";
  const queryStrings = [
    "host=database.example.invalid&database=other",
    "database=cafeinn_dev", "%68ost=database.example.invalid",
    "socketPath=%2Ftmp%2Fmysql.sock", "initSql=USE%20other", "ssl=true",
  ];
  for (const query of queryStrings) {
    assert.throws(() => programTestDatabaseUrl(`${base}?${query}`), /Refusing/);
  }
  for (const value of [
    "mysql://USER:PASSWORD@database.example.invalid/cafeinn_program_test_fixture",
    "mysql://USER:PASSWORD@127.0.0.1/cafeinn_dev",
    "mysql://USER:PASSWORD@127.0.0.1/cafeinn_program_test_",
    base + "#fragment", base.replace("mysql:", "https:"), "not-a-url",
  ]) assert.throws(() => programTestDatabaseUrl(value), /Refusing/);
  assert.throws(() => programTestDatabaseUrl(undefined), /PROGRAM_TEST_DATABASE_URL/);
});

test("test database rejection does not expose credentials or retain parser errors", () => {
  assert.throws(() => programTestDatabaseUrl("mysql://USER:private-test-password@invalid/cafeinn_dev"), error => {
    assert.ok(error instanceof Error);
    assert.doesNotMatch(error.message, /private-test-password|mysql:\/\//);
    assert.equal(error.cause, undefined);
    return true;
  });
});
