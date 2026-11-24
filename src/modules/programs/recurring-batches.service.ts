import { ApiError } from "../../common/api-error.ts";
import { audit } from "../../common/audit/audit.ts";
import { transaction } from "../../database/transaction.ts";
import { authorize } from "../auth/auth.service.ts";
import type { BatchInput, CreateBatch } from "./programs.schema.ts";
import { lockAreas, requireArea } from "./programs.repository.ts";
import {
  previewOccurrences,
  readBatch,
} from "./recurring-batches.repository.ts";
import { normalizeBatch, selectedOccurrences } from "./recurring-input.ts";

export function preview(token: string, rawInput: BatchInput) {
  return transaction(async (tx) => {
    await authorize(tx, token, "events.manage");
    const input = normalizeBatch(rawInput);
    await lockAreas(tx, [input.areaId]);
    await requireArea(tx, input.areaId);
    const occurrences = await previewOccurrences(tx, input);
    const validDates = occurrences
      .filter((row) => row.conflictProgramIds.length === 0)
      .map((row) => row.date);
    return {
      occurrences,
      candidateCount: occurrences.length,
      validCount: validDates.length,
    };
  });
}

export function create(token: string, request: CreateBatch) {
  return transaction(async (tx) => {
    const actor = await authorize(tx, token, "events.manage");
    const input = normalizeBatch(request.input);
    const selectedRows = selectedOccurrences(input, request.selectedDates);
    await lockAreas(tx, [input.areaId]);
    await requireArea(tx, input.areaId);
    const occurrences = await previewOccurrences(tx, input);
    const selected = new Set(request.selectedDates);
    const chosen = occurrences.filter((row) => selected.has(row.date));
    if (chosen.some((row) => row.conflictProgramIds.length > 0)) {
      throw new ApiError(409, "PREVIEW_STALE");
    }
    const batch = await tx.recurringBatch.create({
      data: {
        fromDate: new Date(input.fromDate),
        toDate: new Date(input.toDate),
        weekdays: input.weekdays,
        startTime: new Date(`1970-01-01T${input.startTime}:00Z`),
        endTime: new Date(`1970-01-01T${input.endTime}:00Z`),
        createdCount: chosen.length,
      },
    });
    const programIds: number[] = [];
    for (const occurrence of selectedRows) {
      const row = await tx.program.create({
        data: {
          areaId: input.areaId,
          name: input.name,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
          kind: "RECURRING",
          status: "DRAFT",
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          recurringBatchId: batch.id,
        },
      });
      programIds.push(row.id);
      await audit(tx, {
        action: "RECORD_CREATED",
        employeeId: actor.id,
        entityType: "programs",
        entityKey: { id: row.id },
        details: { recurring_batch_id: batch.id },
      });
    }
    const result = {
      batchId: batch.id,
      createdCount: programIds.length,
      programIds,
    };
    await audit(tx, {
      action: "RECURRING_GENERATED",
      employeeId: actor.id,
      entityType: "recurring_batches",
      entityKey: { id: batch.id },
      details: result,
    });
    return result;
  });
}

export function detail(token: string, id: number) {
  return transaction(async (tx) => {
    await authorize(tx, token, "events.manage");
    return readBatch(tx, id);
  });
}
