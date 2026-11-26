import { ApiError } from "../../common/api-error.ts";
import type { BatchInput } from "./programs.schema.ts";
import { expandRecurrence } from "./recurrence.ts";
import { MAX_SELECTED_DATES } from "./constants/recurrence.constants.ts";

export function selectedOccurrences(input: BatchInput, dates: string[]) {
  const selected = new Set(dates);
  const occurrences = expandRecurrence(input).filter((row) =>
    selected.has(row.date),
  );
  if (
    !dates.length ||
    dates.length > MAX_SELECTED_DATES ||
    selected.size !== dates.length ||
    occurrences.length !== selected.size
  ) {
    throw new ApiError(400, "INVALID_INPUT");
  }
  return occurrences;
}
