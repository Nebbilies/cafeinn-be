import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.ts";
import { serve } from "./support/http-fixture.ts";
import { disconnectDatabase, getPrisma } from "../src/database/prisma.ts";
import { hashPassword } from "../src/modules/auth/auth-password.ts";
import { lockProgramContext } from "../src/modules/programs/programs.public.ts";
import mariadb from "mariadb";
import { createDatabaseOptions } from "../src/database/connection-options.ts";

// Explicit runner only; never executed by the ordinary offline *.test.ts suite.
const target = process.env.PROGRAM_TEST_DATABASE_URL;
if (!target)
  throw new Error(
    "PROGRAM_TEST_DATABASE_URL must select an isolated migrated local test database.",
  );
const url = new URL(target);
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  !/^\/cafeinn_program_test_[a-z0-9_]+$/.test(url.pathname)
) {
  throw new Error("Refusing a non-local or non-test database.");
}
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
    assert.deepEqual(Object.keys(body).sort(), [
      "candidateCount",
      "occurrences",
      "validCount",
    ]);
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
      const edited = await request("/programs/" + row.id, "PATCH", {
        revision: row.revision,
        name: "Changed",
      });
      assert.equal(edited.status, 200);
      assert.equal((await edited.json()).revision, 2);
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
    },
  );

  await context.test(
    "concurrent empty-area overlap, adjacency, separate area and cancellation",
    async () => {
      const results = await Promise.all([
        request("/programs", "POST", input("2026-12-02")),
        request("/programs", "POST", input("2026-12-02"), secondCookie),
      ]);
      assert.deepEqual(results.map((row) => row.status).sort(), [201, 409]);
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
      assert.deepEqual([a.status, b.status].sort(), [201, 409]);
      const mixed = batch("2026-12-10");
      await preview(mixed);
      const pair = await Promise.all([
        request("/recurring-batches", "POST", {
          input: mixed,
          selectedDates: ["2026-12-10"],
        }),
        request("/programs", "POST", input("2026-12-10"), secondCookie),
      ]);
      assert.deepEqual(pair.map((row) => row.status).sort(), [201, 409]);
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
      await preview(rule);
      const before = {
        batches: await db.recurringBatch.count(),
        programs: await db.program.count(),
        audits: await db.auditLog.count(),
      };
      // MySQL CREATE TRIGGER is not available in prepared statements; use the existing driver for test DDL only.
      const connection = await mariadb.createConnection(
        createDatabaseOptions(target!),
      );
      await connection.query(
        "CREATE TRIGGER program_test_rollback BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action = 'RECURRING_GENERATED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test-only failure'; END IF; END",
      );
      try {
        assert.equal(
          (
            await request("/recurring-batches", "POST", {
              input: rule,
              selectedDates: ["2026-12-11"],
            })
          ).status,
          500,
        );
      } finally {
        try {
          await connection.query("DROP TRIGGER program_test_rollback");
        } finally {
          await connection.end();
        }
      }
      assert.deepEqual(
        {
          batches: await db.recurringBatch.count(),
          programs: await db.program.count(),
          audits: await db.auditLog.count(),
        },
        before,
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
      assert.deepEqual(responses.map((row) => row.status).sort(), [201, 409]);
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
      assert.deepEqual(edits.map((row) => row.status).sort(), [200, 409]);
      assert.equal(
        (await db.program.findUniqueOrThrow({ where: { id } })).revision,
        2,
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
