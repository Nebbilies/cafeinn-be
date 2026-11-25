import type { BatchInput } from "../programs.schema.ts";
import { weekdays } from "../../../common/constants/weekdays.constants.ts";

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
