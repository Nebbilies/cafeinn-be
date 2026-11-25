import { ProgramStatus } from "../../../generated/prisma/enums.ts";

export {
  ProgramKind as PROGRAM_KINDS,
  ProgramStatus as PROGRAM_STATUSES,
} from "../../../generated/prisma/enums.ts";

export const TIME_RESERVING_STATUSES = [ProgramStatus.DRAFT, ProgramStatus.PUBLISHED];
export const PROGRAM_SORT_OPTIONS = [
  "startsAt.asc", "startsAt.desc", "name.asc", "name.desc",
] as const;
export const DEFAULT_PROGRAM_SORT = "startsAt.asc";
export const COVER_IMAGE_PROTOCOLS = ["https:", "http:"];
export const EVENTS_MANAGE_PERMISSION = "events.manage";
