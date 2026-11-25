import { ApiError } from "../../common/api-error.ts";
import { audit } from "../../common/audit/audit.ts";
import { transaction } from "../../database/transaction.ts";
import { authorize } from "../auth/auth.service.ts";
import { TIME_ANCHOR_DATE } from "../../common/constants/time.constants.ts";
import {
  EVENTS_MANAGE_PERMISSION,
  PROGRAM_KINDS,
  PROGRAM_STATUSES,
} from "./constants/program.constants.ts";
import type { BatchInput, CreateBatch } from "./programs.schema.ts";
import { lockAreas, requireArea } from "./programs.repository.ts";
import {
  previewOccurrences,
  readBatch,
} from "./recurring-batches.repository.ts";
import { selectedOccurrences } from "./recurring-input.ts";
import { normalizeBatch } from "./utils/normalize-batch.ts";

export function preview(token: string, rawInput: BatchInput) {
  return transaction(async (tx) => {
    await authorize(tx, token, EVENTS_MANAGE_PERMISSION);
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
    const actor = await authorize(tx, token, EVENTS_MANAGE_PERMISSION);
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
        startTime: new Date(`${TIME_ANCHOR_DATE}T${input.startTime}:00Z`),
        endTime: new Date(`${TIME_ANCHOR_DATE}T${input.endTime}:00Z`),
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
          kind: PROGRAM_KINDS.RECURRING,
          status: PROGRAM_STATUSES.DRAFT,
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
    await authorize(tx, token, EVENTS_MANAGE_PERMISSION);
    return readBatch(tx, id);
  });
}
