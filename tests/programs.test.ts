import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.ts";
import { serve } from "./support/http-fixture.ts";
import {
  batchInput,
  completeProgram,
  createBatch,
  createProgram,
  instant,
  listPrograms,
  patchProgram,
} from "../src/modules/programs/programs.schema.ts";
import {
  expandRecurrence,
  holdUntil,
} from "../src/modules/programs/recurrence.ts";
import { overlaps, validInterval } from "../src/common/utils/time-interval.ts";
import { selectedOccurrences } from "../src/modules/programs/recurring-input.ts";

const special = {
  areaId: 2,
  name: "Acoustic evening",
  description: "Live acoustic music",
  kind: "SPECIAL" as const,
  startsAt: "2026-11-27T19:30:00+07:00",
  endsAt: "2026-11-27T21:30:00+07:00",
  specialEvent: {
    capacityLimit: 1000,
    surchargePerPerson: 0,
    registrationDeadline: "2026-11-27T19:30:00+07:00",
    cancellationDeadline: "2026-11-27T18:00:00+07:00",
  },
};
const batch = batchInput.parse({
  areaId: 2,
  name: "Weekly",
  description: "Free acoustic music",
  fromDate: "2026-11-27",
  toDate: "2026-12-06",
  weekdays: ["FRI", "SAT", "SUN"],
  startTime: "19:30",
  endTime: "21:30",
});

test("same-day means Vietnam calendar date, independent of input and UTC offsets", () => {
  assert.equal(
    validInterval(
      new Date("2026-11-27T23:00:00Z"),
      new Date("2026-11-28T01:00:00Z"),
    ),
    true,
  );
  assert.equal(
    validInterval(
      new Date("2026-11-27T16:30:00Z"),
      new Date("2026-11-27T17:00:00Z"),
    ),
    false,
  );
  assert.equal(
    validInterval(new Date(special.startsAt), new Date(special.startsAt)),
    false,
  );
  assert.equal(
    createProgram.safeParse({ ...special, endsAt: "2026-11-28T00:00:00+07:00" })
      .success,
    false,
  );
});

test("special capacity is independent of seats; free surcharge and independent cutoffs accepted", () => {
  assert.equal(createProgram.parse(special).specialEvent?.holdMinutes, 30);
  assert.equal(
    createProgram.safeParse({
      ...special,
      specialEvent: {
        ...special.specialEvent,
        cancellationDeadline: special.startsAt,
        registrationDeadline: "2026-11-27T18:00:00+07:00",
      },
    }).success,
    true,
  );
  assert.equal(
    createProgram.safeParse({
      ...special,
      specialEvent: {
        ...special.specialEvent,
        registrationDeadline: "2026-11-27T19:31:00+07:00",
      },
    }).success,
    false,
  );
  for (const capacityLimit of [0, -1, 65536, 2.5])
    assert.equal(
      createProgram.safeParse({
        ...special,
        specialEvent: { ...special.specialEvent, capacityLimit },
      }).success,
      false,
    );
  assert.equal(
    holdUntil(
      new Date(special.startsAt),
      new Date("2026-11-27T19:40:00+07:00"),
      30,
    ).toISOString(),
    "2026-11-27T12:40:00.000Z",
  );
});

test("program instants preserve millisecond precision and equal deadlines", async (context) => {
  for (const offset of ["Z", "+07:00", "-05:00"]) {
    for (const fraction of ["", ".1", ".12", ".123"]) {
      const startsAt = `2026-11-27T12:00:00${fraction}${offset}`;
      assert.equal(instant.safeParse(startsAt).success, true);
      assert.equal(
        createProgram.safeParse({
          ...special,
          startsAt,
          endsAt: `2026-11-27T13:00:00${offset}`,
          specialEvent: {
            ...special.specialEvent,
            registrationDeadline: startsAt,
            cancellationDeadline: startsAt,
          },
        }).success,
        true,
      );
    }
    for (const fraction of [".0001", ".0009", ".123456", ".0000"]) {
      assert.equal(
        instant.safeParse(`2026-11-27T12:00:00${fraction}${offset}`).success,
        false,
      );
    }
  }
  const truncatedDeadline = {
    ...special,
    startsAt: "2026-11-27T12:00:00.0001Z",
    specialEvent: {
      ...special.specialEvent,
      registrationDeadline: "2026-11-27T12:00:00.0009Z",
    },
  };
  assert.equal(createProgram.safeParse(truncatedDeadline).success, false);
  const base = await serve(createApp(), context);
  const invalidInstant = "2026-11-27T12:00:00.0001Z";
  for (const request of [
    { path: "/programs", method: "POST", body: truncatedDeadline },
    {
      path: "/programs",
      method: "POST",
      body: { ...special, endsAt: invalidInstant },
    },
    {
      path: "/programs",
      method: "POST",
      body: {
        ...special,
        specialEvent: {
          ...special.specialEvent,
          cancellationDeadline: invalidInstant,
        },
      },
    },
    {
      path: "/programs/1",
      method: "PATCH",
      body: { revision: 1, startsAt: invalidInstant },
    },
    {
      path: "/programs?" + new URLSearchParams({ from: invalidInstant }),
      method: "GET",
    },
    {
      path: "/programs?" + new URLSearchParams({ to: invalidInstant }),
      method: "GET",
    },
  ]) {
    const response = await fetch(base + "/api/v1" + request.path, {
      method: request.method,
      headers: {
        "content-type": "application/json",
        cookie: "cafeinn_session=" + "a".repeat(64),
      },
      ...("body" in request ? { body: JSON.stringify(request.body) } : {}),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_INPUT");
  }
});

test("strict content/type/edit validation preserves state ownership", () => {
  for (const description of ["", "   "])
    assert.equal(
      createProgram.safeParse({ ...special, description }).success,
      false,
    );
  for (const coverImageUrl of [
    "file:///tmp/a",
    "https://user:pass@example.com/a",
  ]) {
    assert.equal(
      createProgram.safeParse({ ...special, coverImageUrl }).success,
      false,
    );
  }
  assert.equal(
    createProgram.safeParse({ ...special, status: "PUBLISHED" }).success,
    false,
  );
  assert.equal(patchProgram.safeParse({ revision: 1 }).success, false);
  assert.equal(
    patchProgram.safeParse({ revision: 1, kind: "RECURRING" }).success,
    false,
  );
  assert.equal(
    completeProgram.safeParse({ ...special, kind: "RECURRING" }).success,
    false,
  );
  assert.equal(
    completeProgram.safeParse({
      ...special,
      specialEvent: undefined,
      kind: "RECURRING",
    }).success,
    true,
  );
});

test("recurrence expands exact selected weekdays and leap days; adjacency does not overlap", () => {
  assert.deepEqual(
    expandRecurrence(batch).map((row) => row.date),
    [
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ],
  );
  assert.deepEqual(
    expandRecurrence({
      ...batch,
      fromDate: "2028-02-28",
      toDate: "2028-03-01",
      weekdays: ["TUE"],
    }).map((row) => row.date),
    ["2028-02-29"],
  );
  assert.equal(
    expandRecurrence(batch)[0].startsAt.toISOString(),
    "2026-11-27T12:30:00.000Z",
  );
  const a = {
    startsAt: new Date(special.startsAt),
    endsAt: new Date(special.endsAt),
  };
  assert.equal(
    overlaps(a, {
      startsAt: a.endsAt,
      endsAt: new Date(a.endsAt.getTime() + 60000),
    }),
    false,
  );
  assert.equal(
    overlaps(a, {
      startsAt: new Date(a.endsAt.getTime() - 1),
      endsAt: a.endsAt,
    }),
    true,
  );
  for (const input of [
    { ...batch, weekdays: ["MON", "MON"] },
    { ...batch, endTime: "01:00" },
    { ...batch, toDate: "2028-01-01" },
    { ...batch, fromDate: "2026-02-30" },
  ]) {
    assert.equal(batchInput.safeParse(input).success, false);
  }
  assert.equal(
    batchInput.safeParse({
      ...batch,
      fromDate: "2038-01-19",
      toDate: "2038-01-19",
      startTime: "08:00",
      endTime: "09:00",
    }).success,
    true,
  );
  assert.equal(
    batchInput.safeParse({
      ...batch,
      fromDate: "2038-01-19",
      toDate: "2038-01-19",
    }).success,
    false,
  );
});

test("creation recomputes selection membership without a preview token or request key", () => {
  const dates = ["2026-11-29", "2026-12-04"];
  assert.deepEqual(
    selectedOccurrences(batch, dates).map((row) => row.date),
    dates,
  );
  for (const selected of [
    [],
    ["2026-12-07"],
    ["2026-11-30"],
    [dates[0], dates[0]],
  ]) {
    assert.throws(() => selectedOccurrences(batch, selected), {
      code: "INVALID_INPUT",
    });
  }
  assert.equal(
    createBatch.safeParse({ input: batch, selectedDates: dates }).success,
    true,
  );
  assert.equal(
    createBatch.safeParse({
      input: batch,
      selectedDates: dates,
      requestKey: "removed-field",
    }).success,
    false,
  );
  assert.equal(
    createBatch.safeParse({ input: batch, selectedDates: [] }).success,
    false,
  );
});

test("program HTTP boundary protects both paths without database access", async (context) => {
  const base = await serve(createApp(), context);
  for (const path of ["/programs", "/programs/1", "/recurring-batches/1"]) {
    const response = await fetch(base + "/api/v1" + path);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "SESSION_REQUIRED");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  for (const path of ["/programs", "/recurring-batches/preview"]) {
    const denied = await fetch(base + "/api/v1" + path, {
      method: "POST",
      headers: { origin: "https://foreign.example" },
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "ORIGIN_REJECTED");
  }
  const response = await fetch(base + "/api/v1/programs", {
    method: "POST",
    headers: {
      cookie: "cafeinn_session=" + "a".repeat(64),
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...special, description: "" }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "INVALID_INPUT");
  assert.equal(listPrograms.safeParse({ areaId: "1e2" }).success, false);
});

test("malformed or disallowed cover URLs return 400 across program and batch routes", async (context) => {
  const base = await serve(createApp(), context);
  for (const coverImageUrl of [
    "https://example.test/cover.png",
    "http://example.test/cover.png",
    null,
    undefined,
  ]) {
    assert.equal(
      createProgram.safeParse({ ...special, coverImageUrl }).success,
      true,
    );
    assert.equal(
      batchInput.safeParse({ ...batch, coverImageUrl }).success,
      true,
    );
  }
  for (const coverImageUrl of [
    "not-a-url",
    "http://",
    "https://[::1",
    "",
    "/cover.png",
    "file:///tmp/cover.png",
    "https://user:pass@example.test/cover.png",
  ]) {
    const requests = [
      {
        path: "/programs",
        method: "POST",
        body: { ...special, coverImageUrl },
      },
      {
        path: "/programs/1",
        method: "PATCH",
        body: { revision: 1, coverImageUrl },
      },
      {
        path: "/recurring-batches/preview",
        method: "POST",
        body: { ...batch, coverImageUrl },
      },
      {
        path: "/recurring-batches",
        method: "POST",
        body: {
          input: { ...batch, coverImageUrl },
          selectedDates: ["2026-11-29"],
        },
      },
    ];
    for (const request of requests) {
      const response = await fetch(base + "/api/v1" + request.path, {
        method: request.method,
        headers: {
          "content-type": "application/json",
          cookie: "cafeinn_session=" + "a".repeat(64),
        },
        body: JSON.stringify(request.body),
      });
      assert.equal(
        response.status,
        400,
        `${request.method} ${request.path}: ${coverImageUrl}`,
      );
      assert.deepEqual(await response.json(), {
        error: { code: "INVALID_INPUT", message: "INVALID_INPUT" },
      });
    }
  }
});

test("OpenAPI exposes protected program contracts and shared pagination", async (context) => {
  const base = await serve(createApp(), context);
  const document = await (await fetch(base + "/api-docs.json")).json();
  const collection = document.paths["/api/v1/programs"];
  assert.deepEqual(collection.post.security, [{ staffCookie: [] }]);
  assert.ok(
    collection.post.responses[201].content["application/json"].schema.properties
      .revision,
  );
  assert.ok(document.paths["/api/v1/programs/{id}"].delete.requestBody);
  assert.equal(
    document.paths["/api/v1/recurring-batches"].post.responses[200],
    undefined,
  );
  assert.ok(document.paths["/api/v1/recurring-batches"].post.responses[201]);
  const recurring = document.paths["/api/v1/recurring-batches"];
  assert.deepEqual(
    recurring.post.requestBody.content[
      "application/json"
    ].schema.required.sort(),
    ["input", "selectedDates"],
  );
  assert.equal(recurring.post.responses[503], undefined);
  const responseSchema =
    document.paths["/api/v1/recurring-batches/preview"].post.responses[200]
      .content["application/json"].schema;
  assert.deepEqual(responseSchema.required.sort(), [
    "candidateCount",
    "occurrences",
    "validCount",
  ]);
  assert.deepEqual(
    collection.get.responses[200].content[
      "application/json"
    ].schema.required.sort(),
    ["items", "pagination"],
  );
});

test("program OpenAPI closes response objects while keeping defaulted inputs optional", async (context) => {
  const base = await serve(createApp(), context);
  const response = await fetch(base + "/api-docs.json");
  assert.equal(response.status, 200);
  const document = await response.json();
  function assertClosedObjects(value: unknown) {
    if (!value || typeof value !== "object") return;
    if ("type" in value && value.type === "object") {
      assert.ok("additionalProperties" in value);
      assert.equal(value.additionalProperties, false);
    }
    for (const nested of Object.values(value)) assertClosedObjects(nested);
  }
  const endpoints = [
    ["/api/v1/programs", ["get", "post"]],
    ["/api/v1/programs/{id}", ["get", "patch", "delete"]],
    ["/api/v1/recurring-batches/preview", ["post"]],
    ["/api/v1/recurring-batches", ["post"]],
    ["/api/v1/recurring-batches/{id}", ["get"]],
  ] as const;
  for (const [path, methods] of endpoints) {
    for (const method of methods) {
      const operation = document.paths[path][method];
      for (const status of Object.keys(operation.responses)) {
        const entry = operation.responses[status];
        if (status === "204") {
          assert.equal(entry.content, undefined);
        } else {
          assert.ok(entry.content?.["application/json"]?.schema);
          assertClosedObjects(entry.content["application/json"].schema);
        }
      }
    }
  }
  const programs = document.paths["/api/v1/programs"];
  const specialInput =
    programs.post.requestBody.content["application/json"].schema.properties
      .specialEvent;
  assert.equal(specialInput.properties.holdMinutes.default, 30);
  assert.equal(specialInput.required.includes("holdMinutes"), false);
  const specialOutput =
    programs.post.responses[201].content["application/json"].schema.properties
      .specialEvent;
  assert.ok(specialOutput.required.includes("holdMinutes"));
  for (const [name, defaultValue] of [
    ["page", 1],
    ["pageSize", 10],
    ["sort", "startsAt.asc"],
  ] as const) {
    const parameter = programs.get.parameters.find(
      (item: { name: string }) => item.name === name,
    );
    assert.equal(parameter.required, false);
    assert.equal(parameter.schema.default, defaultValue);
  }
});
