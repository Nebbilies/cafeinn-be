import { ApiError } from "../../common/api-error.ts";
import { pageOffset, pageResult } from "../../common/pagination.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import type { Transaction } from "../../database/transaction.ts";
import type { ProgramList } from "./programs.schema.ts";
import { holdUntil } from "./recurrence.ts";

export const programInclude = { specialEvent: true } as const;
export type StoredProgram = Prisma.ProgramGetPayload<{
  include: typeof programInclude;
}>;

export function programDto(row: StoredProgram) {
  return {
    id: row.id,
    areaId: row.areaId,
    name: row.name,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    revision: row.revision,
    kind: row.kind,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    recurringBatchId: row.recurringBatchId,
    publishedScheduleVersionId: row.publishedScheduleVersionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    specialEvent: row.specialEvent
      ? {
          capacityLimit: row.specialEvent.capacityLimit,
          surchargePerPerson: row.specialEvent.surchargePerPerson,
          registrationDeadline:
            row.specialEvent.registrationDeadline.toISOString(),
          cancellationDeadline:
            row.specialEvent.cancellationDeadline.toISOString(),
          holdMinutes: row.specialEvent.holdMinutes,
          holdUntil: holdUntil(
            row.startsAt,
            row.endsAt,
            row.specialEvent.holdMinutes,
          ).toISOString(),
        }
      : null,
    bookingAllowed:
      row.kind === "SPECIAL" &&
      row.status === "PUBLISHED" &&
      !!row.specialEvent &&
      row.specialEvent.registrationDeadline > new Date() &&
      row.startsAt > new Date(),
  };
}

export async function lockAreas(tx: Transaction, ids: number[]) {
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    await tx.$queryRaw`SELECT id FROM service_areas WHERE id = ${id} FOR UPDATE`;
  }
}

export async function requireArea(tx: Transaction, id: number) {
  const area = await tx.serviceArea.findUnique({ where: { id } });
  if (!area) throw new ApiError(404, "AREA_NOT_FOUND");
  if (area.deletedAt || area.status !== "ACTIVE" || area.kind !== "ACOUSTIC") {
    throw new ApiError(422, "AREA_UNAVAILABLE");
  }
}

export async function lockProgram(tx: Transaction, id: number) {
  await tx.$queryRaw`SELECT id FROM programs WHERE id = ${id} FOR UPDATE`;
  return findProgram(tx, id);
}

export async function findProgram(tx: Transaction, id: number) {
  const row = await tx.program.findUnique({
    where: { id },
    include: programInclude,
  });
  if (!row) throw new ApiError(404, "PROGRAM_NOT_FOUND");
  return row;
}

export function findConflicts(
  tx: Transaction,
  areaId: number,
  startsAt: Date,
  endsAt: Date,
  exceptId?: number,
) {
  return tx.program.findMany({
    where: {
      areaId,
      status: { in: ["DRAFT", "PUBLISHED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true, name: true, startsAt: true, endsAt: true },
    orderBy: { id: "asc" },
  });
}

export async function requireEditable(
  tx: Transaction,
  row: StoredProgram,
  revision: number,
) {
  if (row.status !== "DRAFT" || row.publishedScheduleVersionId !== null) {
    throw new ApiError(409, "PROGRAM_CHANGE_REQUIRES_COORDINATION");
  }
  if (row.revision !== revision) throw new ApiError(409, "STALE_PROGRAM");
  const counts = await Promise.all([
    tx.artistInvitation.count({ where: { programId: row.id } }),
    tx.scheduleVersion.count({ where: { programId: row.id } }),
    tx.eventBooking.count({ where: { specialEventId: row.id } }),
    tx.eventAttendance.count({ where: { specialEventId: row.id } }),
    tx.auditLog.count({
      where: {
        action: "PROGRAM_PUBLISHED",
        OR: [
          { entityKey: { path: "$.id", equals: row.id } },
          { entityKey: { path: "$.program_id", equals: row.id } },
        ],
      },
    }),
  ]);
  if (counts.some(Boolean))
    throw new ApiError(409, "PROGRAM_CHANGE_REQUIRES_COORDINATION");
}

export async function findProgramPage(tx: Transaction, query: ProgramList) {
  const search = query.search?.replace(/[\\%_]/g, "\\$&");
  const where: Prisma.ProgramWhereInput = {
    areaId: query.areaId,
    kind: query.kind,
    status: query.status,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
    ...(query.from ? { endsAt: { gt: new Date(query.from) } } : {}),
    ...(query.to ? { startsAt: { lt: new Date(query.to) } } : {}),
  };
  const [field, direction] = query.sort.split(".");
  const orderBy: Prisma.ProgramOrderByWithRelationInput =
    field === "name"
      ? { name: direction === "asc" ? "asc" : "desc" }
      : { startsAt: direction === "asc" ? "asc" : "desc" };
  const total = await tx.program.count({ where });
  const rows = await tx.program.findMany({
    where,
    orderBy: [orderBy, { id: "asc" }],
    skip: pageOffset(query),
    take: query.pageSize,
    include: programInclude,
  });
  return pageResult(rows.map(programDto), query, total);
}
