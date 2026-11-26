import { z } from "zod";
import { paginationQuery } from "../../common/pagination.ts";
import { validInterval } from "../../common/utils/time-interval.ts";
import { weekdays } from "../../common/constants/weekdays.constants.ts";
import {
  LOCAL_TIME_PATTERN,
  MILLISECONDS_PER_DAY,
  VIETNAM_OFFSET,
} from "../../common/constants/time.constants.ts";
import {
  EXCESS_TIMESTAMP_PRECISION_PATTERN,
  MAX_SUPPORTED_DATE,
  MAX_SUPPORTED_TIMESTAMP_MS,
  MIN_SUPPORTED_DATE,
  MIN_SUPPORTED_TIMESTAMP_MS,
} from "../../common/constants/date-time-limits.constants.ts";
import {
  MAX_RECURRENCE_DAYS,
  MAX_SELECTED_DATES,
} from "./constants/recurrence.constants.ts";
import {
  DEFAULT_HOLD_MINUTES,
  MAX_AREA_ID,
  MAX_CAPACITY_LIMIT,
  MAX_COVER_IMAGE_URL_LENGTH,
  MAX_HOLD_MINUTES,
  MAX_MUTATION_REVISION,
  MAX_PROGRAM_DESCRIPTION_LENGTH,
  MAX_PROGRAM_ID,
  MAX_PROGRAM_NAME_LENGTH,
  MAX_PROGRAM_SEARCH_LENGTH,
  MAX_SURCHARGE_PER_PERSON,
  MIN_CAPACITY_LIMIT,
  MIN_HOLD_MINUTES,
  MIN_SURCHARGE_PER_PERSON,
} from "./constants/program-limits.constants.ts";
import {
  COVER_IMAGE_PROTOCOLS,
  DEFAULT_PROGRAM_SORT,
  PROGRAM_KINDS,
  PROGRAM_SORT_OPTIONS,
  PROGRAM_STATUSES,
} from "./constants/program.constants.ts";
import { ID_STRING_PATTERN } from "./constants/program-validation.constants.ts";

export const programId = z.coerce.number().int().positive().max(MAX_PROGRAM_ID);
const bodyId = z.int().positive().max(MAX_AREA_ID);
export const instant = z.iso
  .datetime({ offset: true })
  .refine(
    (value) => !EXCESS_TIMESTAMP_PRECISION_PATTERN.test(value),
    "Instant supports at most three fractional-second digits.",
  )
  .refine((value) => {
    const time = Date.parse(value);
    return (
      time >= MIN_SUPPORTED_TIMESTAMP_MS && time <= MAX_SUPPORTED_TIMESTAMP_MS
    );
  }, "Instant is outside the supported MySQL timestamp range.");
export const calendarDate = z.iso
  .date()
  .refine(
    (value) => value >= MIN_SUPPORTED_DATE && value <= MAX_SUPPORTED_DATE,
  );
const localTime = z.string().regex(LOCAL_TIME_PATTERN);
const content = {
  name: z.string().trim().min(1).max(MAX_PROGRAM_NAME_LENGTH),
  description: z.string().trim().min(1).max(MAX_PROGRAM_DESCRIPTION_LENGTH),
  coverImageUrl: z
    .url()
    .max(MAX_COVER_IMAGE_URL_LENGTH)
    .refine((value) => {
      const url = URL.parse(value);
      return (
        url !== null &&
        COVER_IMAGE_PROTOCOLS.includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    })
    .nullable()
    .optional(),
};
export const specialConfiguration = z
  .object({
    capacityLimit: z.int().min(MIN_CAPACITY_LIMIT).max(MAX_CAPACITY_LIMIT),
    surchargePerPerson: z
      .int()
      .min(MIN_SURCHARGE_PER_PERSON)
      .max(MAX_SURCHARGE_PER_PERSON),
    registrationDeadline: instant,
    cancellationDeadline: instant,
    holdMinutes: z
      .int()
      .min(MIN_HOLD_MINUTES)
      .max(MAX_HOLD_MINUTES)
      .default(DEFAULT_HOLD_MINUTES),
  })
  .strict();

const programFields = z
  .object({
    ...content,
    areaId: bodyId,
    kind: z.enum(PROGRAM_KINDS),
    startsAt: instant,
    endsAt: instant,
    specialEvent: specialConfiguration.optional(),
  })
  .strict();
export function programRules(input: z.infer<typeof programFields>) {
  return (
    validInterval(new Date(input.startsAt), new Date(input.endsAt)) &&
    (input.kind === PROGRAM_KINDS.SPECIAL
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
  .extend({ kind: z.literal(PROGRAM_KINDS.SPECIAL) })
  .refine(programRules);
export const completeProgram = programFields.refine(programRules);
export const patchProgram = programFields
  .omit({ kind: true })
  .partial()
  .extend({
    revision: z.int().positive().max(MAX_MUTATION_REVISION),
  })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "revision"));
export const deleteProgram = z
  .object({ revision: z.int().positive().max(MAX_MUTATION_REVISION) })
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
      .max(weekdays.length)
      .refine((values) => new Set(values).size === values.length),
    startTime: localTime,
    endTime: localTime,
  })
  .strict()
  .refine(
    (value) =>
      value.startTime < value.endTime &&
      value.fromDate <= value.toDate &&
      (Date.parse(value.toDate) - Date.parse(value.fromDate)) /
        MILLISECONDS_PER_DAY <
        MAX_RECURRENCE_DAYS &&
      instant.safeParse(
        `${value.fromDate}T${value.startTime}:00${VIETNAM_OFFSET}`,
      ).success &&
      instant.safeParse(`${value.toDate}T${value.endTime}:00${VIETNAM_OFFSET}`)
        .success,
  );
export const createBatch = z
  .object({
    input: batchInput,
    selectedDates: z
      .array(calendarDate)
      .min(1)
      .max(MAX_SELECTED_DATES)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();

export const programListParameters = {
  search: z.string().trim().max(MAX_PROGRAM_SEARCH_LENGTH).optional(),
  kind: z.enum(PROGRAM_KINDS).optional(),
  status: z.enum(PROGRAM_STATUSES).optional(),
  areaId: z
    .preprocess(
      (value) =>
        typeof value === "string" && ID_STRING_PATTERN.test(value)
          ? Number(value)
          : value,
      bodyId,
    )
    .optional(),
  from: instant.optional(),
  to: instant.optional(),
  sort: z.enum(PROGRAM_SORT_OPTIONS).default(DEFAULT_PROGRAM_SORT),
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
