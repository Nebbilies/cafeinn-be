import { audit } from "../../common/audit/audit.ts";
import { transaction } from "../../database/transaction.ts";
import { authorize } from "../auth/auth.service.ts";
import {
  completeProgram,
  type PatchProgram,
  type ProgramInput,
  type ProgramList,
} from "./programs.schema.ts";
import {
  findProgram,
  findProgramPage,
  lockAreas,
  programDto,
  programInclude,
  requireEditable,
} from "./programs.repository.ts";
import {
  assertProgramAvailability,
  lockProgramContext,
} from "./programs.public.ts";

export function programData(input: ProgramInput) {
  return {
    areaId: input.areaId,
    name: input.name,
    description: input.description,
    coverImageUrl: input.coverImageUrl ?? null,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
  };
}

function specialData(event: NonNullable<ProgramInput["specialEvent"]>) {
  return {
    ...event,
    registrationDeadline: new Date(event.registrationDeadline),
    cancellationDeadline: new Date(event.cancellationDeadline),
  };
}

export function list(token: string, query: ProgramList) {
  return transaction(async (tx) => {
    await authorize(tx, token, "events.manage");
    return findProgramPage(tx, query);
  });
}

export function detail(token: string, id: number) {
  return transaction(async (tx) => {
    await authorize(tx, token, "events.manage");
    return programDto(await findProgram(tx, id));
  });
}

export function create(token: string, input: ProgramInput) {
  return transaction(async (tx) => {
    const actor = await authorize(tx, token, "events.manage");
    await lockAreas(tx, [input.areaId]);
    const data = programData(input);
    await assertProgramAvailability(tx, data);
    const row = await tx.program.create({
      data: {
        ...data,
        kind: input.kind,
        status: "DRAFT",
        ...(input.specialEvent
          ? { specialEvent: { create: specialData(input.specialEvent) } }
          : {}),
      },
      include: programInclude,
    });
    const result = programDto(row);
    await audit(tx, {
      action: "RECORD_CREATED",
      employeeId: actor.id,
      entityType: "programs",
      entityKey: { id: row.id },
      details: { after: result },
    });
    return result;
  });
}

export function update(token: string, id: number, patch: PatchProgram) {
  return transaction(async (tx) => {
    const actor = await authorize(tx, token, "events.manage");
    const before = await lockProgramContext(tx, id, patch.areaId);
    await requireEditable(tx, before, patch.revision);
    const dto = programDto(before);
    const input = completeProgram.parse({
      areaId: before.areaId,
      name: before.name,
      description: before.description,
      coverImageUrl: before.coverImageUrl,
      kind: before.kind,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      ...(dto.specialEvent
        ? {
            specialEvent: {
              capacityLimit: dto.specialEvent.capacityLimit,
              surchargePerPerson: dto.specialEvent.surchargePerPerson,
              registrationDeadline: dto.specialEvent.registrationDeadline,
              cancellationDeadline: dto.specialEvent.cancellationDeadline,
              holdMinutes: dto.specialEvent.holdMinutes,
            },
          }
        : {}),
      ...Object.fromEntries(
        Object.entries(patch).filter(([key]) => key !== "revision"),
      ),
    });
    const data = programData(input);
    await assertProgramAvailability(tx, data, id);
    if (input.specialEvent)
      await tx.specialEvent.update({
        where: { programId: id },
        data: specialData(input.specialEvent),
      });
    const after = await tx.program.update({
      where: { id },
      data: { ...data, revision: { increment: 1 } },
      include: programInclude,
    });
    const result = programDto(after);
    await audit(tx, {
      action: "RECORD_UPDATED",
      employeeId: actor.id,
      entityType: "programs",
      entityKey: { id },
      details: { before: dto, after: result },
    });
    return result;
  });
}

export function remove(token: string, id: number, revision: number) {
  return transaction(async (tx) => {
    const actor = await authorize(tx, token, "events.manage");
    const row = await lockProgramContext(tx, id);
    await requireEditable(tx, row, revision);
    if (row.specialEvent)
      await tx.specialEvent.delete({ where: { programId: id } });
    await tx.program.delete({ where: { id } });
    await audit(tx, {
      action: "RECORD_DELETED",
      employeeId: actor.id,
      entityType: "programs",
      entityKey: { id },
      details: { before: programDto(row) },
    });
  });
}
