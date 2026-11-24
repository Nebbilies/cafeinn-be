import { ApiError } from "../../common/api-error.ts";
import type { BatchInput } from "./programs.schema.ts";
import { expandRecurrence, weekdays } from "./recurrence.ts";

export function normalizeBatch(input: BatchInput): BatchInput {
  return {
    areaId: input.areaId,
    name: input.name,
    description: input.description,
    coverImageUrl: input.coverImageUrl ?? null,
    fromDate: input.fromDate,
    toDate: input.toDate,
    weekdays: weekdays.filter((day) => input.weekdays.includes(day)),
    startTime: input.startTime,
    endTime: input.endTime,
  };
}

export function selectedOccurrences(input: BatchInput, dates: string[]) {
  const selected = new Set(dates);
  const occurrences = expandRecurrence(input).filter((row) =>
    selected.has(row.date),
  );
  if (
    !dates.length ||
    dates.length > 100 ||
    selected.size !== dates.length ||
    occurrences.length !== selected.size
  ) {
    throw new ApiError(400, "INVALID_INPUT");
  }
  return occurrences;
}
