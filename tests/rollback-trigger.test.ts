import assert from "node:assert/strict";
import test from "node:test";
import { withRollbackTrigger } from "./support/rollback-trigger.ts";

test("trigger creation failure closes the owned connection without dropping another trigger", async () => {
  const failure = new Error("CREATE rejected");
  let queries = 0;
  let closed = 0;
  let workStarted = false;
  const connection = {
    async query() { queries++; throw failure; },
    async end() { closed++; },
  };
  await assert.rejects(withRollbackTrigger(connection, async () => { workStarted = true; }), error => error === failure);
  assert.equal(workStarted, false);
  assert.equal(queries, 1, "must not try DROP after failed CREATE");
  assert.equal(closed, 1);
});

test("trigger drop failure still closes the owned connection", async () => {
  const failure = new Error("DROP rejected");
  let queries = 0;
  let closed = 0;
  let workCompleted = false;
  const connection = {
    async query() { if (++queries === 2) throw failure; },
    async end() { closed++; },
  };
  await assert.rejects(withRollbackTrigger(connection, async () => { workCompleted = true; }), error => error === failure);
  assert.equal(workCompleted, true);
  assert.equal(queries, 2);
  assert.equal(closed, 1);
});

test("failed rollback assertion still removes its trigger and closes the connection", async () => {
  const failure = new Error("assertion failed");
  let queries = 0;
  let closed = 0;
  const connection = {
    async query() { queries++; },
    async end() { closed++; },
  };
  await assert.rejects(withRollbackTrigger(connection, async () => { throw failure; }), error => error === failure);
  assert.equal(queries, 2);
  assert.equal(closed, 1);
});
