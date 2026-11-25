import { z } from "zod";
import {
  paginatedResponse,
  paginationParameters,
} from "../common/pagination.ts";
import {
  batchInput,
  createBatch,
  createProgram,
  deleteProgram,
  patchProgram,
  programListParameters,
} from "../modules/programs/programs.schema.ts";

const timestamp = z.iso.datetime({ offset: true });
const special = z.object({
  capacityLimit: z.int().min(1).max(65535),
  surchargePerPerson: z.int().min(0).max(4294967295),
  registrationDeadline: timestamp,
  cancellationDeadline: timestamp,
  holdMinutes: z.int().min(1).max(65535),
  holdUntil: timestamp,
});
const program = z.object({
  id: z.int(),
  areaId: z.int(),
  name: z.string(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  revision: z.int().positive(),
  kind: z.enum(["SPECIAL", "RECURRING"]),
  startsAt: timestamp,
  endsAt: timestamp,
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
  recurringBatchId: z.int().nullable(),
  publishedScheduleVersionId: z.int().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  specialEvent: special.nullable(),
  bookingAllowed: z
    .boolean()
    .describe(
      "Type/lifecycle/time eligibility only; not a reservation or remaining-capacity guarantee.",
    ),
});
const batchCreated = z.object({
  batchId: z.int(),
  createdCount: z.int(),
  programIds: z.array(z.int()),
});
const preview = z.object({
  occurrences: z.array(
    z.object({
      date: z.iso.date(),
      startsAt: timestamp,
      endsAt: timestamp,
      conflictProgramIds: z.array(z.int()),
    }),
  ),
  candidateCount: z.int(),
  validCount: z.int(),
});
const batch = z.object({
  id: z.int(),
  fromDate: z.iso.date(),
  toDate: z.iso.date(),
  weekdays: z.array(z.string()),
  startTime: z.string(),
  endTime: z.string(),
  createdCount: z.int(),
  remainingCount: z.int(),
  createdAt: timestamp,
  programs: z.array(program),
});
const error = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
function content(schema: z.ZodType, io: "input" | "output") {
  return {
    "application/json": {
      schema: z.toJSONSchema(schema, { target: "openapi-3.0", io }),
    },
  };
}
function operation(
  summary: string,
  description: string,
  options: {
    input?: z.ZodType;
    output?: z.ZodType;
    status?: number;
    id?: boolean;
  } = {},
) {
  const responses: Record<number, unknown> = {
    [options.status ?? 200]: {
      description: summary,
      ...(options.output ? { content: content(options.output, "output") } : {}),
    },
  };
  const errors: Record<number, string> = {
    400: "INVALID_INPUT: malformed/disallowed cover URL, instant precision above three fractional-second digits, strict input, same Vietnam date, independent deadlines <= start, or bounded selection validation failed.",
    401: "SESSION_REQUIRED: missing, expired or ineligible staff session.",
    403: "FORBIDDEN (events.manage required) or ORIGIN_REJECTED.",
    404: "PROGRAM_NOT_FOUND, AREA_NOT_FOUND or RECURRING_BATCH_NOT_FOUND.",
    409: "PROGRAM_TIME_CONFLICT, STALE_PROGRAM, PROGRAM_CHANGE_REQUIRES_COORDINATION, or PREVIEW_STALE.",
    422: "AREA_UNAVAILABLE: not an active, non-deleted acoustic area.",
    500: "Sanitized INTERNAL_ERROR; no internal connection or query details.",
  };
  for (const [status, description] of Object.entries(errors))
    responses[Number(status)] = { description, content: content(error, "output") };
  return {
    tags: ["Programs"],
    summary,
    description,
    security: [{ staffCookie: [] }],
    responses,
    ...(options.id
      ? {
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer", minimum: 1, maximum: 2147483647 },
            },
          ],
        }
      : {}),
    ...(options.input
      ? { requestBody: { required: true, content: content(options.input, "input") } }
      : {}),
  };
}
const intervalRules =
  "Requires events.manage. DRAFT and PUBLISHED reserve their acoustic area; CANCELLED releases it. Intervals are half-open, adjacency is valid, and both types stay within one Asia/Ho_Chi_Minh date. ISO instants require an offset and at most three fractional-second digits; whole seconds are accepted. Public content is required; coverImageUrl is optional and never fetched/uploaded by this API.";

export const programPaths = {
  "/api/v1/programs": {
    get: {
      ...operation(
        "List staff programs",
        "Filtered totals, page items and special-event configuration share one database snapshot. Page beyond end returns empty items with the filtered total. from/to select intersecting intervals, not start-date containment. Stable ID tie-breaker.",
        { output: paginatedResponse(program) },
      ),
      parameters: Object.entries({
        ...paginationParameters,
        ...programListParameters,
        areaId: z.int().positive().max(2147483647).optional(),
      }).map(([name, schema]) => ({
        in: "query",
        name,
        required: false,
        schema: z.toJSONSchema(schema, { target: "openapi-3.0", io: "input" }),
      })),
    },
    post: operation(
      "Create a special draft",
      intervalRules +
        " Capacity is independent of seats; surcharge 0 is free. Registration/self-cancellation deadlines independently do not exceed start; hold defaults to 30 minutes and is capped by end.",
      { input: createProgram, output: program, status: 201 },
    ),
  },
  "/api/v1/programs/{id}": {
    get: operation(
      "Read staff program details",
      "Includes legacy nullable descriptions. bookingAllowed reports lifecycle/time eligibility only; booking must still enforce capacity and contact rules.",
      { id: true, output: program },
    ),
    patch: operation(
      "Edit an unused draft",
      intervalRules +
        " Revision is required. At least one editable field is required. specialEvent, when supplied, replaces the complete configuration. Effective description must be nonempty. Any invitation/history, schedule, booking or attendance requires a coordinated flow; published/cancelled programs cannot be edited here.",
      { id: true, input: patchProgram, output: program },
    ),
    delete: operation(
      "Delete an unused draft",
      "Requires JSON body { revision }. Only a never-published dependency-free DRAFT can be physically removed; intrinsic SpecialEvent configuration is removed, audit remains. Batch createdCount remains the original generation count.",
      { id: true, input: deleteProgram, status: 204 },
    ),
  },
  "/api/v1/recurring-batches/preview": {
    post: operation(
      "Preview recurring candidates",
      intervalRules +
        " Range is inclusive, at most 366 days. Distinct weekdays; HH:mm start < end. Lists conflicts without creating domain rows or reserving dates. Advisory only: creation recomputes candidates and conflicts. No preview token or separate secret. Session activity can refresh.",
      { input: batchInput, output: preview },
    ),
  },
  "/api/v1/recurring-batches": {
    post: operation(
      "Create selected recurring drafts",
      "Requires input and 1-100 distinct selectedDates belonging to that recurrence rule. Out-of-rule dates return INVALID_INPUT. Recomputes eligibility under area lock and creates the selected set atomically; any selected conflict causes PREVIEW_STALE with no domain writes. No proof of a prior preview is required. Empty selection is rejected without writes. No booking/check-in/surcharge configuration. No durable request replay: resubmitting while the created drafts still reserve those intervals returns PREVIEW_STALE. After their deletion/cancellation/time change, a new submission can create a new batch.",
      { input: createBatch, output: batchCreated, status: 201 },
    ),
  },
  "/api/v1/recurring-batches/{id}": {
    get: operation(
      "Read recurring batch and surviving drafts",
      "createdCount is immutable original generation count; remainingCount counts current programs, including independently edited/published/cancelled records. Deleted drafts are absent.",
      { id: true, output: batch },
    ),
  },
};
