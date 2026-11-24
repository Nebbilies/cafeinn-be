import { Router } from "express";
import * as controller from "./programs.controller.ts";

export const programsRoutes = Router();
programsRoutes.get("/", controller.list);
programsRoutes.get("/:id", controller.detail);
programsRoutes.post("/", controller.create);
programsRoutes.patch("/:id", controller.update);
programsRoutes.delete("/:id", controller.remove);

export const recurringBatchRoutes = Router();
recurringBatchRoutes.post("/preview", controller.previewBatch);
recurringBatchRoutes.post("/", controller.createRecurringBatch);
recurringBatchRoutes.get("/:id", controller.batchDetail);
