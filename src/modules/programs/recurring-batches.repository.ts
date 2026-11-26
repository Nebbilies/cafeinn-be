import { ApiError } from "../../common/api-error.ts";
import type { Transaction } from "../../database/transaction.ts";
import type { BatchInput } from "./programs.schema.ts";
import {
  findConflicts,
  programDto,
  programInclude,
} from "./programs.repository.ts";
import { overlaps } from "../../common/utils/time-interval.ts";
import { expandRecurrence } from "./recurrence.ts";

export async function previewOccurrences(tx: Transaction, input: BatchInput) {
  const occurrences = expandRecurrence(input);
  if (!occurrences.length) return [];
  const conflicts = await findConflicts(
    tx,
    input.areaId,
    occurrences[0].startsAt,
    occurrences.at(-1)!.endsAt,
  );
  return occurrences.map((occurrence) => ({
    date: occurrence.date,
    startsAt: occurrence.startsAt.toISOString(),
    endsAt: occurrence.endsAt.toISOString(),
    conflictProgramIds: conflicts
      .filter((row) => overlaps(row, occurrence))
      .map((row) => row.id),
  }));
}

export async function readBatch(tx: Transaction, id: number) {
  const row = await tx.recurringBatch.findUnique({
    where: { id },
    include: {
      programs: {
        include: programInclude,
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!row) throw new ApiError(404, "RECURRING_BATCH_NOT_FOUND");
  return {
    id: row.id,
    fromDate: row.fromDate.toISOString().slice(0, 10),
    toDate: row.toDate.toISOString().slice(0, 10),
    weekdays: row.weekdays,
    startTime: row.startTime.toISOString().slice(11, 16),
    endTime: row.endTime.toISOString().slice(11, 16),
    createdCount: row.createdCount,
    remainingCount: row.programs.length,
    createdAt: row.createdAt.toISOString(),
    programs: row.programs.map(programDto),
  };
}
