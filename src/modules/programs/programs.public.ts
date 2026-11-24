import { ApiError } from "../../common/api-error.ts";
import type { Transaction } from "../../database/transaction.ts";
import {
  findConflicts,
  findProgram,
  lockAreas,
  lockProgram,
  requireArea,
} from "./programs.repository.ts";

/** Call after authorizing the actor. Hold these locks until the caller's transaction commits.
 * All invitation/schedule/booking writers must lock the program through this operation
 * before inserting dependencies. Lifecycle writers must also keep area-before-program order.
 */
export async function lockProgramContext(
  tx: Transaction,
  id: number,
  destinationAreaId?: number,
) {
  const snapshot = await findProgram(tx, id);
  await lockAreas(tx, [snapshot.areaId, destinationAreaId ?? snapshot.areaId]);
  const current = await lockProgram(tx, id);
  if (current.areaId !== snapshot.areaId)
    throw new ApiError(409, "STALE_PROGRAM");
  return current;
}

export async function assertProgramAvailability(
  tx: Transaction,
  input: { areaId: number; startsAt: Date; endsAt: Date },
  exceptId?: number,
) {
  // Caller must already hold the scope area lock. This is not a stand-alone check/write protocol.
  await requireArea(tx, input.areaId);
  if (
    (
      await findConflicts(
        tx,
        input.areaId,
        input.startsAt,
        input.endsAt,
        exceptId,
      )
    ).length
  ) {
    throw new ApiError(409, "PROGRAM_TIME_CONFLICT");
  }
}
