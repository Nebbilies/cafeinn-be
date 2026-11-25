import { z } from "zod";
import { paginationQuery } from "../../common/pagination.ts";
import { validInterval, weekdays } from "./recurrence.ts";

export const programId = z.coerce.number().int().positive().max(2147483647);
const bodyId = z.int().positive().max(2147483647);
export const instant = z.iso.datetime({ offset: true }).refine((value) => {
  const time = Date.parse(value);
  return time >= 1000 && time <= Date.parse("2038-01-19T03:14:07.000Z");
}, "Instant is outside the supported MySQL timestamp range.");
export const calendarDate = z.iso
  .date()
  .refine((value) => value >= "1970-01-01" && value <= "2038-01-19");
const localTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const content = {
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(16000),
  coverImageUrl: z
    .url()
    .max(2048)
    .refine((value) => {
      const url = URL.parse(value);
      return (
        url !== null &&
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    })
    .nullable()
    .optional(),
};
export const specialConfiguration = z
  .object({
    capacityLimit: z.int().min(1).max(65535),
    surchargePerPerson: z.int().min(0).max(4294967295),
    registrationDeadline: instant,
    cancellationDeadline: instant,
    holdMinutes: z.int().min(1).max(65535).default(30),
  })
  .strict();

const programFields = z
  .object({
    ...content,
    areaId: bodyId,
    kind: z.enum(["SPECIAL", "RECURRING"]),
    startsAt: instant,
    endsAt: instant,
    specialEvent: specialConfiguration.optional(),
  })
  .strict();
export function programRules(input: z.infer<typeof programFields>) {
  return (
    validInterval(new Date(input.startsAt), new Date(input.endsAt)) &&
    (input.kind === "SPECIAL"
      ? !!input.specialEvent &&
        new Date(input.specialEvent.registrationDeadline) <=
          new Date(input.startsAt) &&
        new Date(input.specialEvent.cancellationDeadline) <=
          new Date(input.startsAt)
      : input.specialEvent === undefined)
  );
}
// Direct creation is intentionally special-only; recurring creation uses a reviewed batch.
export const createProgram = programFields
  .extend({ kind: z.literal("SPECIAL") })
  .refine(programRules);
export const completeProgram = programFields.refine(programRules);
export const patchProgram = programFields
  .omit({ kind: true })
  .partial()
  .extend({
    revision: z.int().positive().max(4294967294),
  })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "revision"));
export const deleteProgram = z
  .object({ revision: z.int().positive().max(4294967294) })
  .strict();

export const batchInput = z
  .object({
    ...content,
    areaId: bodyId,
    fromDate: calendarDate,
    toDate: calendarDate,
    weekdays: z
      .array(z.enum(weekdays))
      .min(1)
      .max(7)
      .refine((values) => new Set(values).size === values.length),
    startTime: localTime,
    endTime: localTime,
  })
  .strict()
  .refine(
    (value) =>
      value.startTime < value.endTime &&
      value.fromDate <= value.toDate &&
      (Date.parse(value.toDate) - Date.parse(value.fromDate)) / 86400000 <
        366 &&
      instant.safeParse(`${value.fromDate}T${value.startTime}:00+07:00`)
        .success &&
      instant.safeParse(`${value.toDate}T${value.endTime}:00+07:00`).success,
  );
export const createBatch = z
  .object({
    input: batchInput,
    selectedDates: z
      .array(calendarDate)
      .min(1)
      .max(100)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();

export const programListParameters = {
  search: z.string().trim().max(150).optional(),
  kind: z.enum(["SPECIAL", "RECURRING"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  areaId: z
    .preprocess(
      (value) =>
        typeof value === "string" && /^\d+$/.test(value)
          ? Number(value)
          : value,
      bodyId,
    )
    .optional(),
  from: instant.optional(),
  to: instant.optional(),
  sort: z
    .enum(["startsAt.asc", "startsAt.desc", "name.asc", "name.desc"])
    .default("startsAt.asc"),
};
export const listPrograms = paginationQuery
  .safeExtend(programListParameters)
  .strict()
  .refine(
    (value) =>
      !value.from || !value.to || Date.parse(value.from) < Date.parse(value.to),
  );
export type BatchInput = z.infer<typeof batchInput>;
export type CreateBatch = z.infer<typeof createBatch>;
export type ProgramInput = z.infer<typeof completeProgram>;
export type PatchProgram = z.infer<typeof patchProgram>;
export type ProgramList = z.infer<typeof listPrograms>;
