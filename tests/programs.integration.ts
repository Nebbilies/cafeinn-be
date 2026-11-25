import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.ts";
import { serve } from "./support/http-fixture.ts";
import { disconnectDatabase, getPrisma } from "../src/database/prisma.ts";
import { hashPassword } from "../src/modules/auth/auth-password.ts";
import { lockProgramContext } from "../src/modules/programs/programs.public.ts";
import mariadb from "mariadb";
import { createDatabaseOptions } from "../src/database/connection-options.ts";
import { programTestDatabaseUrl } from "./support/program-test-database.ts";
import { withRollbackTrigger } from "./support/rollback-trigger.ts";
import { findProgramPage } from "../src/modules/programs/programs.repository.ts";
import { listPrograms } from "../src/modules/programs/programs.schema.ts";

// Explicit runner only; never executed by the ordinary offline *.test.ts suite.
const target = programTestDatabaseUrl(process.env.PROGRAM_TEST_DATABASE_URL);
process.env.DATABASE_URL = target;

test("program contracts, transactions and concurrent writes on isolated MySQL", async (context) => {
  const db = getPrisma();
  context.after(disconnectDatabase);
  // Runner requires a fresh target and never clears arbitrary preexisting data.
  assert.equal(
    await db.employee.count(),
    0,
    "Integration target must be freshly migrated and empty",
  );
  assert.equal(await db.program.count(), 0);
  const permission = await db.permission.create({
    data: { code: "events.manage" },
  });
  const eventRole = await db.role.create({
    data: {
      name: "EVENT_STAFF",
      rolePermissions: { create: { permissionId: permission.id } },
    },
  });
  const adminRole = await db.role.create({ data: { name: "ADMIN" } });
  const password = "test-Program-123";
  const passwordHash = await hashPassword(password);
  for (const [username, roleId] of [
    ["event1", eventRole.id],
    ["event2", eventRole.id],
    ["admin", adminRole.id],
  ] as const) {
    await db.employee.create({
      data: {
        username,
        fullName: username,
        email: `${username}@example.test`,
        passwordHash,
        status: "ACTIVE",
        employeeRoles: { create: { roleId } },
      },
    });
  }
  const area = await db.serviceArea.create({
    data: {
      name: "Program integration acoustic",
      kind: "ACOUSTIC",
      status: "ACTIVE",
    },
  });
  const other = await db.serviceArea.create({
    data: {
      name: "Program integration other",
      kind: "ACOUSTIC",
      status: "ACTIVE",
    },
  });
  const base = await serve(createApp(), context);
  async function login(identifier: string) {
    const response = await fetch(base + "/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie")!.split(";")[0];
  }
  const [cookie, secondCookie, adminCookie] = await Promise.all([
    login("event1"),
    login("event2"),
    login("admin"),
  ]);
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    session = cookie,
  ) {
    return fetch(base + "/api/v1" + path, {
      method,
      headers: { cookie: session, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  const input = (day: string, extra = {}) => ({
    areaId: area.id,
    name: "Test music",
    description: "Required public content",
    kind: "SPECIAL",
    startsAt: `${day}T19:00:00+07:00`,
    endsAt: `${day}T21:00:00+07:00`,
    specialEvent: {
      capacityLimit: 1000,
      surchargePerPerson: 0,
      registrationDeadline: `${day}T19:00:00+07:00`,
      cancellationDeadline: `${day}T18:00:00+07:00`,
    },
    ...extra,
  });
  const batch = (day: string, extra = {}) => ({
    areaId: area.id,
    name: "Test weekly",
    description: "Free public music",
    fromDate: day,
    toDate: day,
    weekdays: ["FRI", "SAT", "SUN", "MON", "TUE", "WED", "THU"],
    startTime: "19:00",
    endTime: "21:00",
    ...extra,
  });
  async function preview(input: ReturnType<typeof batch>) {
    const response = await request("/recurring-batches/preview", "POST", input);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(
      Object.keys(body).sort((left, right) => left.localeCompare(right)),
      ["candidateCount", "occurrences", "validCount"],
    );
    return body;
  }

  await context.test(
    "live auth, free special, capacity, revision and physical deletion",
    async () => {
      assert.equal(
        (await request("/programs", "GET", undefined, adminCookie)).status,
        403,
      );
      const created = await request(
        "/programs",
        "POST",
        input("2026-12-01", {
          coverImageUrl: "https://example.test/cover.png",
        }),
      );
      assert.equal(created.status, 201);
      const row = await created.json();
      assert.equal(row.specialEvent.surchargePerPerson, 0);
      assert.equal(row.specialEvent.capacityLimit, 1000);
      assert.equal(row.specialEvent.holdUntil, "2026-12-01T12:30:00.000Z");
      assert.equal(row.coverImageUrl, "https://example.test/cover.png");
      const auditKey = {
        entityType: "programs",
        entityKey: { path: "$.id", equals: row.id },
      };
      const createdAudit = await db.auditLog.findFirstOrThrow({
        where: { ...auditKey, action: "RECORD_CREATED" },
      });
      assert.deepEqual(createdAudit.details, { after: row });
      const edited = await request("/programs/" + row.id, "PATCH", {
        revision: row.revision,
        name: "Changed",
        coverImageUrl: null,
      });
      assert.equal(edited.status, 200);
      const updated = await edited.json();
      assert.equal(updated.revision, 2);
      assert.equal(updated.coverImageUrl, null);
      const updatedAudit = await db.auditLog.findFirstOrThrow({
        where: { ...auditKey, action: "RECORD_UPDATED" },
      });
      assert.deepEqual(updatedAudit.details, { before: row, after: updated });
      assert.equal(
        (
          await request("/programs/" + row.id, "PATCH", {
            revision: 1,
            name: "Stale",
          })
        ).status,
        409,
      );
      assert.equal(
        (await request("/programs/" + row.id, "DELETE", { revision: 2 }))
          .status,
        204,
      );
      assert.equal(
        await db.specialEvent.count({ where: { programId: row.id } }),
        0,
      );
      assert.equal(
        await db.auditLog.count({
          where: {
            action: "RECORD_DELETED",
            entityType: "programs",
            entityKey: { path: "$.id", equals: row.id },
          },
        }),
        1,
      );
      const deletedAudit = await db.auditLog.findFirstOrThrow({
        where: { ...auditKey, action: "RECORD_DELETED" },
      });
      assert.deepEqual(deletedAudit.details, { before: updated });
    },
  );

  await context.test(
    "concurrent empty-area overlap, adjacency, separate area and cancellation",
    async () => {
      const results = await Promise.all([
        request("/programs", "POST", input("2026-12-02")),
        request("/programs", "POST", input("2026-12-02"), secondCookie),
      ]);
      assert.deepEqual(
        results.map((row) => row.status).sort((left, right) => left - right),
        [201, 409],
      );
      const winner = await results.find((row) => row.status === 201)!.json();
      assert.equal(
        (
          await request(
            "/programs",
            "POST",
            input("2026-12-02", { areaId: other.id }),
          )
        ).status,
        201,
      );
      const adjacent = input("2026-12-02");
      adjacent.startsAt = "2026-12-02T21:00:00+07:00";
      adjacent.endsAt = "2026-12-02T22:00:00+07:00";
      assert.equal((await request("/programs", "POST", adjacent)).status, 201);
      // Future lifecycle writers use the exported lock protocol.
      await db.$transaction(async (tx) => {
        await lockProgramContext(tx, winner.id);
        await tx.program.update({
          where: { id: winner.id },
          data: { status: "CANCELLED" },
        });
      });
      assert.equal(
        (await request("/programs", "POST", input("2026-12-02"))).status,
        201,
      );
    },
  );

  await context.test(
    "preview excludes conflicts; repeated submissions conflict until the drafts release time",
    async () => {
      await request("/programs", "POST", input("2026-12-04"));
      const rule = batch("2026-12-04", { toDate: "2026-12-06" });
      const reviewed = await preview(rule);
      assert.equal(reviewed.candidateCount, 3);
      assert.equal(reviewed.validCount, 2);
      const body = { input: rule, selectedDates: ["2026-12-06"] };
      const response = await request("/recurring-batches", "POST", body);
      assert.equal(response.status, 201);
      const result = await response.json();
      assert.equal(result.createdCount, 1);
      const child = await db.program.findUniqueOrThrow({
        where: { id: result.programIds[0] },
      });
      assert.equal(child.kind, "RECURRING");
      assert.equal(child.status, "DRAFT");
      assert.equal(
        await db.specialEvent.count({ where: { programId: child.id } }),
        0,
      );
      const before = {
        batches: await db.recurringBatch.count(),
        programs: await db.program.count(),
      };
      const repeated = await request("/recurring-batches", "POST", body);
      assert.equal(repeated.status, 409);
      assert.equal((await repeated.json()).error.code, "PREVIEW_STALE");
      assert.deepEqual(
        {
          batches: await db.recurringBatch.count(),
          programs: await db.program.count(),
        },
        before,
      );
      assert.equal(
        (await request("/programs/" + child.id, "DELETE", { revision: 1 }))
          .status,
        204,
      );
      const batchDetail = await (
        await request("/recurring-batches/" + result.batchId)
      ).json();
      assert.equal(batchDetail.createdCount, 1);
      assert.equal(batchDetail.remainingCount, 0);
      // Without durable replay history, a submission after deletion is a new operation.
      const recreated = await request("/recurring-batches", "POST", body);
      assert.equal(recreated.status, 201);
      assert.notEqual((await recreated.json()).batchId, result.batchId);
    },
  );

  await context.test(
    "stale selected dates, concurrent batches and create versus batch never partially commit",
    async () => {
      const rule = batch("2026-12-08");
      await preview(rule);
      await request("/programs", "POST", input("2026-12-08"));
      const body = { input: rule, selectedDates: ["2026-12-08"] };
      const before = await db.recurringBatch.count();
      const stale = await request("/recurring-batches", "POST", body);
      assert.equal(stale.status, 409);
      assert.equal((await stale.json()).error.code, "PREVIEW_STALE");
      assert.equal(await db.recurringBatch.count(), before);
      const race = batch("2026-12-09");
      await preview(race);
      const secondResponse = await request(
        "/recurring-batches/preview",
        "POST",
        race,
        secondCookie,
      );
      assert.equal(secondResponse.status, 200);
      const [a, b] = await Promise.all([
        request("/recurring-batches", "POST", {
          input: race,
          selectedDates: ["2026-12-09"],
        }),
        request(
          "/recurring-batches",
          "POST",
          { input: race, selectedDates: ["2026-12-09"] },
          secondCookie,
        ),
      ]);
      assert.deepEqual(
        [a.status, b.status].sort((left, right) => left - right),
        [201, 409],
      );
      const mixed = batch("2026-12-10");
      await preview(mixed);
      const pair = await Promise.all([
        request("/recurring-batches", "POST", {
          input: mixed,
          selectedDates: ["2026-12-10"],
        }),
        request("/programs", "POST", input("2026-12-10"), secondCookie),
      ]);
      assert.deepEqual(
        pair.map((row) => row.status).sort((left, right) => left - right),
        [201, 409],
      );
    },
  );

  await context.test(
    "mixed valid and stale selected dates leave no partial batch, programs or audits",
    async () => {
      const validDate = "2026-12-22";
      const conflictingDate = "2026-12-23";
      const rule = batch(validDate, { toDate: conflictingDate });
      const reviewed = await preview(rule);
      assert.equal(reviewed.candidateCount, 2);
      assert.equal(reviewed.validCount, 2);
      const blockerResponse = await request(
        "/programs",
        "POST",
        input(conflictingDate),
        secondCookie,
      );
      assert.equal(blockerResponse.status, 201);
      const blocker = await blockerResponse.json();
      const before = {
        batches: await db.recurringBatch.count(),
        programs: await db.program.count(),
        audits: await db.auditLog.count(),
      };
      // The valid date is first so an incremental writer cannot hide a partial commit.
      const stale = await request("/recurring-batches", "POST", {
        input: rule,
        selectedDates: [validDate, conflictingDate],
      });
      assert.equal(stale.status, 409);
      assert.equal((await stale.json()).error.code, "PREVIEW_STALE");
      assert.deepEqual(
        {
          batches: await db.recurringBatch.count(),
          programs: await db.program.count(),
          audits: await db.auditLog.count(),
        },
        before,
      );
      assert.ok(await db.program.findUnique({ where: { id: blocker.id } }));

      const accepted = await request("/recurring-batches", "POST", {
        input: rule,
        selectedDates: [validDate],
      });
      assert.equal(accepted.status, 201);
      const result = await accepted.json();
      assert.equal(result.createdCount, 1);
      assert.equal(result.programIds.length, 1);
      const createdBatch = await db.recurringBatch.findUniqueOrThrow({
        where: { id: result.batchId },
      });
      assert.equal(createdBatch.createdCount, 1);
      const children = await db.program.findMany({
        where: { recurringBatchId: result.batchId },
      });
      assert.deepEqual(
        children.map((row) => row.id),
        result.programIds,
      );
      assert.equal(
        children[0]!.startsAt.toISOString(),
        new Date(`${validDate}T19:00:00+07:00`).toISOString(),
      );
      assert.equal(children[0]!.kind, "RECURRING");
      assert.deepEqual(
        {
          batches: await db.recurringBatch.count(),
          programs: await db.program.count(),
          audits: await db.auditLog.count(),
        },
        {
          batches: before.batches + 1,
          programs: before.programs + 1,
          audits: before.audits + 2,
        },
      );
    },
  );

  await context.test(
    "out-of-rule dates fail without writes; creation does not require a prior preview",
    async () => {
      const rule = batch("2026-12-15", { weekdays: ["TUE"] });
      const before = {
        batches: await db.recurringBatch.count(),
        programs: await db.program.count(),
      };
      const response = await request("/recurring-batches", "POST", {
        input: rule,
        selectedDates: ["2026-12-16"],
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, "INVALID_INPUT");
      const wrongWeekday = await request("/recurring-batches", "POST", {
        input: { ...rule, toDate: "2026-12-16" },
        selectedDates: ["2026-12-16"],
      });
      assert.equal(wrongWeekday.status, 400);
      assert.deepEqual(
        {
          batches: await db.recurringBatch.count(),
          programs: await db.program.count(),
        },
        before,
      );
    },
  );

  await context.test(
    "database failure rolls back batch, children and audits",
    async () => {
      const rule = batch("2026-12-11");
      const body = { input: rule, selectedDates: ["2026-12-11"] };
      await preview(rule);
      const before = {
        batches: await db.recurringBatch.count(),
        programs: await db.program.count(),
        audits: await db.auditLog.count(),
      };
      let transactionError: unknown;
      const originalTransaction = db.$transaction;
      // Observe the real server transaction failure; do not replace SQL or expose it over HTTP.
      db.$transaction = (async (
        ...args: Parameters<typeof db.$transaction>
      ) => {
        try {
          return await originalTransaction.apply(db, args);
        } catch (error) {
          transactionError = error;
          throw error;
        }
      }) as typeof db.$transaction;
      try {
        // MySQL CREATE TRIGGER needs text-query DDL, on the disposable target only.
        const connection = await mariadb.createConnection(
          createDatabaseOptions(target),
        );
        await withRollbackTrigger(connection, async () => {
          const failed = await request("/recurring-batches", "POST", body);
          assert.equal(failed.status, 500);
          assert.deepEqual(await failed.json(), {
            error: {
              code: "INTERNAL_ERROR",
              message: "An unexpected error occurred.",
            },
          });
          assert.ok(transactionError instanceof Error);
          assert.match(
            transactionError.message,
            /program_test_rollback: RECURRING_GENERATED/,
          );
        });
      } finally {
        db.$transaction = originalTransaction;
      }
      assert.deepEqual(
        {
          batches: await db.recurringBatch.count(),
          programs: await db.program.count(),
          audits: await db.auditLog.count(),
        },
        before,
      );
      const retried = await request("/recurring-batches", "POST", body);
      assert.equal(retried.status, 201);
      const result = await retried.json();
      assert.equal(result.createdCount, 1);
      assert.equal(result.programIds.length, 1);
      assert.deepEqual(
        {
          batches: await db.recurringBatch.count(),
          programs: await db.program.count(),
          audits: await db.auditLog.count(),
        },
        {
          batches: before.batches + 1,
          programs: before.programs + 1,
          audits: before.audits + 2,
        },
      );
    },
  );

  await context.test(
    "simultaneous duplicate creates and stale edits have one effective result",
    async () => {
      const rule = batch("2026-12-14"); // Direct creation is validated without a prior preview.
      const body = { input: rule, selectedDates: ["2026-12-14"] };
      const unauthorized = await request(
        "/recurring-batches",
        "POST",
        body,
        adminCookie,
      );
      assert.equal(unauthorized.status, 403);
      const responses = await Promise.all([
        request("/recurring-batches", "POST", body),
        request("/recurring-batches", "POST", body),
      ]);
      assert.deepEqual(
        responses.map((row) => row.status).sort((left, right) => left - right),
        [201, 409],
      );
      const created = await responses.find((row) => row.status === 201)!.json();
      const id = created.programIds[0];
      const edits = await Promise.all([
        request("/programs/" + id, "PATCH", {
          revision: 1,
          name: "Revision A",
        }),
        request(
          "/programs/" + id,
          "PATCH",
          { revision: 1, name: "Revision B" },
          secondCookie,
        ),
      ]);
      assert.deepEqual(
        edits.map((row) => row.status).sort((left, right) => left - right),
        [200, 409],
      );
      assert.equal(
        (await db.program.findUniqueOrThrow({ where: { id } })).revision,
        2,
      );
    },
  );

  await context.test(
    "listing preserves literal search, filters, DTOs, stable sorting and empty-page totals",
    async () => {
      const name = "literal%_\\tune";
      const firstResponse = await request(
        "/programs",
        "POST",
        input("2026-12-18", {
          name,
          coverImageUrl: "https://example.test/list-cover.png",
        }),
      );
      assert.equal(firstResponse.status, 201);
      const first = await firstResponse.json();
      const secondResponse = await request(
        "/programs",
        "POST",
        input("2026-12-19", { name }),
      );
      assert.equal(secondResponse.status, 201);
      const second = await secondResponse.json();
      assert.equal(
        (
          await request(
            "/programs",
            "POST",
            input("2026-12-20", { name, areaId: other.id }),
          )
        ).status,
        201,
      );
      assert.equal(
        (
          await request(
            "/programs",
            "POST",
            input("2026-12-21", { name: "literalXYZtune" }),
          )
        ).status,
        201,
      );
      const baseQuery = {
        search: name,
        areaId: String(area.id),
        kind: "SPECIAL",
        status: "DRAFT",
        sort: "name.desc",
      };
      async function page(extra: Record<string, string> = {}) {
        const response = await request(
          "/programs?" + new URLSearchParams({ ...baseQuery, ...extra }),
        );
        assert.equal(response.status, 200);
        return response.json();
      }
      const firstPage = await page({ pageSize: "1" });
      assert.deepEqual(firstPage.items, [first]);
      assert.deepEqual(firstPage.pagination, {
        page: 1,
        pageSize: 1,
        totalItems: 2,
        totalPages: 2,
      });
      assert.deepEqual((await page({ page: "2", pageSize: "1" })).items, [
        second,
      ]);
      assert.deepEqual(
        (await page({ sort: "startsAt.desc" })).items.map(
          (item: { id: number }) => item.id,
        ),
        [second.id, first.id],
      );
      assert.deepEqual(
        (
          await page({
            from: "2026-12-18T20:00:00+07:00",
            to: "2026-12-18T20:30:00+07:00",
          })
        ).items,
        [first],
      );
      const empty = await page({
        from: "2026-12-18T21:00:00+07:00",
        to: "2026-12-19T19:00:00+07:00",
      });
      assert.deepEqual(empty.items, []);
      assert.equal(empty.pagination.totalItems, 0);
      const beyond = await page({ page: "3", pageSize: "1" });
      assert.deepEqual(beyond.items, []);
      assert.equal(beyond.pagination.totalItems, 2);
      assert.equal(
        (await page({ kind: "RECURRING" })).pagination.totalItems,
        0,
      );
      assert.equal(
        (await page({ status: "CANCELLED" })).pagination.totalItems,
        0,
      );
      assert.equal(
        (await page({ search: "' OR 1=1 --" })).pagination.totalItems,
        0,
      );
    },
  );

  await context.test(
    "listing count and items retain one snapshot across a concurrent deletion",
    async () => {
      const response = await request(
        "/programs",
        "POST",
        input("2026-12-17", { name: "snapshot-reader-fixture" }),
      );
      assert.equal(response.status, 201);
      const row = await response.json();
      let readingPage = false;
      let deleted = false;
      // Instrument real SQL completion, not its results: another actor commits the delete
      // after the first page read. The old count/findMany implementation returns a mismatch.
      const reader = db.$extends({
        query: {
          async $allOperations({ model, operation, args, query }) {
            const result = await query(args);
            if (
              readingPage &&
              !deleted &&
              ((model === "Program" && operation === "count") ||
                operation === "$queryRaw")
            ) {
              deleted = true;
              const removed = await request(
                "/programs/" + row.id,
                "DELETE",
                { revision: 1 },
                secondCookie,
              );
              assert.equal(removed.status, 204);
              await removed.text();
            }
            return result;
          },
        },
      });
      const page = await reader.$transaction(
        async (tx) => {
          readingPage = true;
          return findProgramPage(
            tx,
            listPrograms.parse({
              search: "snapshot-reader-fixture",
              areaId: String(area.id),
            }),
          );
        },
        { isolationLevel: "ReadCommitted", timeout: 15000 },
      );
      assert.equal(
        deleted,
        true,
        "the second actor must commit during the instrumented page read",
      );
      assert.equal(page.pagination.totalItems, 1);
      assert.deepEqual(
        page.items.map((item) => item.id),
        [row.id],
      );
      assert.equal(
        await db.program.findUnique({ where: { id: row.id } }),
        null,
      );
    },
  );

  await context.test(
    "draft dependencies and published state block even metadata edits/deletes",
    async () => {
      const created = await (
        await request("/programs", "POST", input("2026-12-12"))
      ).json();
      await db.$transaction(async (tx) => {
        await lockProgramContext(tx, created.id);
        await tx.scheduleVersion.create({
          data: { programId: created.id, version: 1, status: "DRAFT" },
        });
      });
      for (const method of ["PATCH", "DELETE"]) {
        const response = await request(
          "/programs/" + created.id,
          method,
          method === "PATCH"
            ? { revision: 1, name: "Forbidden" }
            : { revision: 1 },
        );
        assert.equal(response.status, 409);
        assert.equal(
          (await response.json()).error.code,
          "PROGRAM_CHANGE_REQUIRES_COORDINATION",
        );
      }
      const published = await (
        await request("/programs", "POST", input("2026-12-13"))
      ).json();
      await db.program.update({
        where: { id: published.id },
        data: { status: "PUBLISHED" },
      });
      assert.equal(
        (
          await request("/programs/" + published.id, "PATCH", {
            revision: 1,
            name: "No",
          })
        ).status,
        409,
      );
      const page = await (
        await request("/programs?page=999&pageSize=1")
      ).json();
      assert.deepEqual(page.items, []);
      assert.ok(page.pagination.totalItems > 0);
    },
  );
});
