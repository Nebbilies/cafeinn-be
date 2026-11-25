# Program management

The staff slice implements special drafts, recurring preview/generation, program list/detail and guarded draft edits/deletion. Invitations, schedule publication, bookings/check-in and coordinated lifecycle changes remain separate capabilities.

## Setup and migration

Review `prisma/migrations/202611240003_program_management/migration.sql` with the existing migration history. It adds nullable `programs.cover_image_url`, unsigned `programs.revision` (default 1). Apply through the migration owner's normal process, then regenerate the client. Implementation tests applied SQL only to temporary isolated local schemas; the existing demo/shared database was not migrated.

Recurring preview/create use the existing staff session and events.manage permission. No separate secret or signed preview is required. Preview is an advisory UI step; the API does not persist evidence that a caller previously viewed it. Creation independently recomputes rule membership and current availability in its transaction.

Legacy nullable descriptions remain readable; creates and editable updates require nonempty effective content. Optional `coverImageUrl` accepts absolute HTTP(S) without embedded credentials, at most 2,048 characters. This API never fetches, uploads or hosts images.

## HTTP

All routes require `cafeinn_session` and `events.manage`; ADMIN-only has no bypass. Staff origin checks and private/no-store headers cover both paths. Complete schemas/statuses/security are at `/api-docs.json` and `/api-docs/`.

OpenAPI success/error schemas describe output objects with `additionalProperties: false`, including nested DTOs. Request bodies and query parameters use input schemas so fields with server defaults remain optional (for example, `holdMinutes`, `page`, `pageSize` and `sort`). A 204 response has no content schema.

| Method/path | Contract |
| --- | --- |
| `GET /api/v1/programs` | Shared pagination, search/kind/status/areaId/from/to filters, allowlisted stable sort |
| `GET /api/v1/programs/:id` | Direct DTO including revision/configuration |
| `POST /api/v1/programs` | SPECIAL draft; 201 |
| `PATCH /api/v1/programs/:id` | Eligible draft plus current revision; increments revision |
| `DELETE /api/v1/programs/:id` | JSON body `{ "revision": 1 }`; eligible physical deletion; 204 |
| `POST /api/v1/recurring-batches/preview` | Candidate conflicts and counts; no reservation or server-side preview state |
| `POST /api/v1/recurring-batches` | Selected drafts atomically; 201 on creation, 409 on selected conflicts |
| `GET /api/v1/recurring-batches/:id` | Original createdCount, remainingCount and surviving programs |

Special creation takes `areaId`, `name`, required `description`, optional `coverImageUrl`, `kind: SPECIAL`, offset-bearing `startsAt`/`endsAt` and `specialEvent`. Configuration contains `capacityLimit`, `surchargePerPerson`, `registrationDeadline`, `cancellationDeadline`, optional `holdMinutes` (default 30). Capacity is independent of seats; 0 surcharge means free. Cutoffs independently do not exceed start. Effective hold expiry is `min(start + holdMinutes, end)`.

Both kinds stay within one Vietnam calendar date. DRAFT/PUBLISHED reserve their acoustic area using half-open intervals; adjacency/different-area concurrency are valid. CANCELLED releases time. Detail `bookingAllowed` reports type/lifecycle/time only, not available capacity or a reservation guarantee.

Preview takes `areaId`, `name`, required `description`, optional `coverImageUrl`, inclusive `fromDate`/`toDate`, distinct `weekdays` (`MON`-`SUN`), `startTime`/`endTime` (`HH:mm`, start before end). At most 366 calendar days. Conflicts are shown and excluded from eligible dates; users can deselect more.

Creation takes `{ input, selectedDates }`: choose 1-100 distinct dates belonging to the supplied recurrence rule. The server recomputes candidate dates; out-of-range/wrong-weekday selections return `400 INVALID_INPUT`. Current selected conflicts return `409 PREVIEW_STALE` without writes. Empty selection fails validation. No token, requestKey or prior-preview proof is required; those former request fields are removed.

No durable replay/receipt store is used. Concurrent duplicate submissions cannot both reserve the same area intervals: one succeeds and the other returns 409. Repeating while created drafts retain those intervals also returns 409, not the original result. After deletion/cancellation/time changes release the intervals, another submission may create new records. Reload current data after an uncertain network outcome. Batch, selected drafts, count and audits still commit/roll back together.

## Ownership and transactions

Authorization uses the existing ReadCommitted, 15-second transaction. Lock actor employee, then areas by ascending ID, then program. Area-row mutexes cover empty-scope conflicts. `Program.revision` protects stale edits.

Program listing reads the filtered count, page and special-event configuration in one parameterized SQL statement, giving them one ReadCommitted snapshot even during concurrent changes. The totals anchor preserves filtered totals on empty or beyond-end pages. Sort identifiers/directions come from fixed allowlisted fragments, with ascending ID as the tie-breaker; filter values remain bound. Raw unsigned integers are normalized to the existing numeric DTO contract. Authorization and write transaction isolation remain unchanged.

Other modules must call `lockProgramContext(tx, programId)` from `programs.public.ts` within their existing transaction before adding invitations, schedules or bookings. Lifecycle writers must preserve area/program ordering and validate availability when relevant; area status/deletion writers share the area lock. Public operations do not open nested transactions. These guarantees do not cover arbitrary writers ignoring the protocol.

Only never-published dependency-free drafts can be edited/deleted. Even expired invitations or draft schedule versions block direct mutation; published/cancelled cases require coordinated flow. Delete intrinsic SpecialEvent configuration and Program together, preserving audit. Do not cascade external history. Keep original batch createdCount; remainingCount counts surviving programs; never automatically delete batch provenance.

Database scope is deliberately limited: no separate request/preview table. The only Program additions are the selected cover URL and revision columns. Do not introduce replacement storage in settings/audit solely to restore an unrequested replay guarantee.

## Verification

See the [verification record](program-verification.md) for actual recorded commands, scenario coverage, results and limits. Saving the report did not rerun tests or access a database.

Run offline checks with existing scripts. `npm test` remains database-independent. `npm run test:programs:db` requires `PROGRAM_TEST_DATABASE_URL` selecting a fresh migrated loopback schema named `cafeinn_program_test_*`; it refuses demo/shared names, non-MySQL schemes, fragments and any query string. The test guard validates the target before either Prisma or the trigger connection can open. Runtime provider/TLS query configuration is unchanged. Arrange explicit disposable-schema creation/migration/cleanup, never reset `cafeinn_dev`. Trigger privileges are required for rollback fault injection. The suite does not migrate or clear arbitrary targets automatically.

During implementation, all four migrations were executed on new temporary local MySQL schemas. Real HTTP/cookie tests covered permissions, special creation/edit/delete, overlap/adjacency/separate areas/cancellation, recurring selection/repeated-conflict behavior, stale previews, batch/batch and special/batch races, forced rollback and dependency guards. Temporary schemas were removed. This is local evidence, not shared deployment verification or proof of unimplemented module writers.
