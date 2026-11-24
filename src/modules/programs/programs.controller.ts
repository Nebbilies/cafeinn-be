import type { Request, Response } from "express";
import { requireToken } from "../auth/auth-cookie.ts";
import {
  createBatch,
  batchInput,
  createProgram,
  deleteProgram,
  listPrograms,
  patchProgram,
  programId,
} from "./programs.schema.ts";
import * as programs from "./programs.service.ts";
import * as batches from "./recurring-batches.service.ts";

export async function list(req: Request, res: Response) {
  res.json(
    await programs.list(requireToken(req), listPrograms.parse(req.query)),
  );
}
export async function detail(req: Request, res: Response) {
  res.json(
    await programs.detail(requireToken(req), programId.parse(req.params.id)),
  );
}
export async function create(req: Request, res: Response) {
  res
    .status(201)
    .json(
      await programs.create(requireToken(req), createProgram.parse(req.body)),
    );
}
export async function update(req: Request, res: Response) {
  res.json(
    await programs.update(
      requireToken(req),
      programId.parse(req.params.id),
      patchProgram.parse(req.body),
    ),
  );
}
export async function remove(req: Request, res: Response) {
  await programs.remove(
    requireToken(req),
    programId.parse(req.params.id),
    deleteProgram.parse(req.body).revision,
  );
  res.sendStatus(204);
}
export async function previewBatch(req: Request, res: Response) {
  res.json(
    await batches.preview(requireToken(req), batchInput.parse(req.body)),
  );
}
export async function createRecurringBatch(req: Request, res: Response) {
  const output = await batches.create(
    requireToken(req),
    createBatch.parse(req.body),
  );
  res.status(201).json(output);
}
export async function batchDetail(req: Request, res: Response) {
  res.json(
    await batches.detail(requireToken(req), programId.parse(req.params.id)),
  );
}
