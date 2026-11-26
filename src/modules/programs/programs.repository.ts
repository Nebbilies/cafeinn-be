import { ApiError } from "../../common/api-error.ts";
import { pageOffset, pageResult } from "../../common/pagination.ts";
import {
  Prisma,
  type Program,
  type SpecialEvent,
} from "../../generated/prisma/client.ts";
import type { Transaction } from "../../database/transaction.ts";
import type { ProgramList } from "./programs.schema.ts";
import { holdUntil } from "./recurrence.ts";
import {
  PROGRAM_KINDS,
  PROGRAM_STATUSES,
  TIME_RESERVING_STATUSES,
} from "./constants/program.constants.ts";

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
      row.kind === PROGRAM_KINDS.SPECIAL &&
      row.status === PROGRAM_STATUSES.PUBLISHED &&
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
      status: { in: TIME_RESERVING_STATUSES },
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
  if (
    row.status !== PROGRAM_STATUSES.DRAFT ||
    row.publishedScheduleVersionId !== null
  ) {
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

type SpecialPageColumns =
  | { specialProgramId: null }
  | (Omit<
      SpecialEvent,
      "programId" | "createdAt" | "updatedAt" | "surchargePerPerson"
    > & {
      surchargePerPerson: number | bigint;
      specialProgramId: number;
      specialCreatedAt: Date;
      specialUpdatedAt: Date;
    });
type ProgramPageRow = { totalItems: bigint } & (
  | { id: null }
  | (Omit<Program, "revision"> & {
      revision: number | bigint;
    } & SpecialPageColumns)
);

export async function findProgramPage(
  tx: Pick<Transaction, "$queryRaw">,
  query: ProgramList,
) {
  const search = query.search?.replace(/[\\%_]/g, String.raw`\$&`);
  const filters: Prisma.Sql[] = [];
  if (query.areaId !== undefined)
    filters.push(Prisma.sql`p.area_id = ${query.areaId}`);
  if (query.kind) filters.push(Prisma.sql`p.kind = ${query.kind}`);
  if (query.status) filters.push(Prisma.sql`p.status = ${query.status}`);
  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      Prisma.sql`(p.name LIKE ${pattern} OR p.description LIKE ${pattern})`,
    );
  }
  if (query.from) filters.push(Prisma.sql`p.ends_at > ${new Date(query.from)}`);
  if (query.to) filters.push(Prisma.sql`p.starts_at < ${new Date(query.to)}`);
  const where = filters.length
    ? Prisma.join(filters, " AND ")
    : Prisma.sql`TRUE`;
  const [field, direction] = query.sort.split(".");
  // Only fixed SQL fragments select identifiers/direction; all filter values are bound.
  const column =
    field === "name" ? Prisma.sql`p.name` : Prisma.sql`p.starts_at`;
  const order = direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const orderBy = Prisma.sql`${column} ${order}, p.id ASC`;
  // One statement gives count, page and configuration the same ReadCommitted snapshot.
  // The totals anchor retains a row for empty/beyond-end pages without a second query.
  const rows = await tx.$queryRaw<ProgramPageRow[]>`
    WITH filtered AS (
      SELECT p.* FROM programs p WHERE ${where}
    ), paged AS (
      SELECT p.* FROM filtered p ORDER BY ${orderBy}
      LIMIT ${query.pageSize} OFFSET ${pageOffset(query)}
    )
    SELECT totals.totalItems,
      p.id, p.area_id AS areaId, p.name, p.description,
      p.cover_image_url AS coverImageUrl, p.revision, p.kind,
      p.starts_at AS startsAt, p.ends_at AS endsAt, p.status,
      p.recurring_batch_id AS recurringBatchId,
      p.published_schedule_version_id AS publishedScheduleVersionId,
      p.created_at AS createdAt, p.updated_at AS updatedAt,
      s.program_id AS specialProgramId, s.capacity_limit AS capacityLimit,
      s.surcharge_per_person AS surchargePerPerson,
      s.registration_deadline AS registrationDeadline,
      s.cancellation_deadline AS cancellationDeadline, s.hold_minutes AS holdMinutes,
      s.created_at AS specialCreatedAt, s.updated_at AS specialUpdatedAt
    FROM (SELECT COUNT(*) AS totalItems FROM filtered) totals
    LEFT JOIN paged p ON TRUE
    LEFT JOIN special_events s ON s.program_id = p.id
    ORDER BY ${orderBy}
  `;
  const items = rows.flatMap((row) => {
    if (row.id === null) return [];
    const specialEvent =
      row.specialProgramId === null
        ? null
        : {
            programId: row.specialProgramId,
            capacityLimit: row.capacityLimit,
            // Raw MySQL UNSIGNED INT values can arrive as bigint; their range is safe as number.
            surchargePerPerson: Number(row.surchargePerPerson),
            registrationDeadline: row.registrationDeadline,
            cancellationDeadline: row.cancellationDeadline,
            holdMinutes: row.holdMinutes,
            createdAt: row.specialCreatedAt,
            updatedAt: row.specialUpdatedAt,
          };
    return [
      programDto({ ...row, revision: Number(row.revision), specialEvent }),
    ];
  });
  return pageResult(items, query, Number(rows[0]?.totalItems ?? 0));
}
