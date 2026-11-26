# Program management verification record

Recorded: 2026-11-24. Scope: the implemented BL-048 slice after removal of preview signing and the separate recurring-request table.

This report preserves results from tool executions earlier in this conversation. It is a summary of observed output, not an archived raw log or a new test run. Saving this report did not execute tests, connect to MySQL, apply migrations or change data. Recheck the working tree and rerun relevant checks after later implementation changes.

Implementation and test sources:

- [Program API guide](program-management.md)
- [Offline program tests](../tests/programs.test.ts)
- [MySQL integration tests](../tests/programs.integration.ts)
- [Package scripts](../package.json)
- [Program migration](../prisma/migrations/202611240003_program_management/migration.sql)

## Verified contract baseline

Creation accepts `{ input, selectedDates }`. There is no preview signing secret, token, expiry, requestKey, payload fingerprint or durable replay table. Staff cookie authentication and `events.manage` remain required.

The schema retains 39 business models. The program migration only adds `cover_image_url` and `revision` to `programs`. DRAFT/PUBLISHED reserve their acoustic area; CANCELLED releases it. Both kinds stay within one Vietnam calendar date. Eligible unused drafts can be edited/deleted; dependent/published cases require coordination.

## Commands and observed results

The observed environment used Node 26.13.0 and npm 11.20.0 on Windows. `npm.cmd` was used because PowerShell blocked `npm.ps1`; execution policy was not changed. An earlier local connection reported MySQL 9.6.0; that version query was not repeated as part of the final program-test run.

| Command/check                                               | Recorded result                  | Evidence limit                                                                   |
| ----------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `npm.cmd run db:validate`                                   | PASS                             | Prisma accepts the local schema; no DB execution proved by this command          |
| `npm.cmd run db:generate`                                   | PASS                             | Current client generated; also included in build                                 |
| `npm.cmd run typecheck`                                     | PASS                             | Source, config, seed and test types checked                                      |
| `npm.cmd run lint`                                          | PASS                             | Existing ESLint configuration                                                    |
| `npm.cmd test`                                              | PASS: 23 tests, 0 failures       | Entire offline suite, including 7 program tests; not 23 program-only tests       |
| `npm.cmd run build`                                         | PASS                             | Client generation and production TypeScript compilation                          |
| `node prisma/seed.ts --dry-run --reference-date 2026-11-24` | PASS: 150 orders                 | Fixture validation only; output explicitly stated no DB client was created       |
| `node --test tests/programs.integration.ts`                 | PASS: 9 Node results, 0 failures | One parent plus 8 MySQL scenarios; run with isolated `PROGRAM_TEST_DATABASE_URL` |
| `git diff --check`                                          | PASS                             | Tracked diff whitespace; does not execute behavior                               |

`npm run test:programs:db` is the package alias for the same integration runner. The actual recorded integration invocation used Node directly from a temporary-schema orchestration script; it was not a separate package-script run.

## Offline program coverage: 7 tests

| Scenario                          | Assertions exercised                                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vietnam-day interval              | Local day is derived from instants, independently of supplied offsets/UTC date boundaries; equal start/end and crossing next-day midnight rejected                                       |
| Special configuration             | Seat-independent capacity, explicit free surcharge, independent registration/self-cancel cutoffs, default hold and short-event hold cap; invalid capacity/deadline rejected              |
| Strict content/type/edit boundary | Required nonempty description, permitted cover URL schemes/no credentials, no client lifecycle changes, no revision-only empty patch, type-specific configuration                        |
| Calendar and overlap              | Six candidate example, selected weekdays, leap day, UTC conversion, adjacency versus actual overlap, duplicate weekdays, overnight/range/invalid-date rejection and MySQL timestamp edge |
| Selected-date membership          | Valid subset accepted; empty, duplicate, out-of-range and wrong-weekday selections rejected; no token/key required; removed requestKey rejected by strict schema                         |
| HTTP boundary                     | Anonymous staff paths return 401/no-store; foreign-origin mutations return 403; invalid content returns 400 before storage access; invalid numeric query rejected                        |
| OpenAPI                           | Existing cookie security, program revision/deletion contract, shared pagination, create body requires input/selectedDates only; no replay 200 or missing-preview-key 503 response        |

The other 16 passing offline tests cover existing auth boundaries, connection-options parsing, error sanitization, health/CORS, shared pagination and Swagger. Their presence does not prove successful live recovery email or every authorization state.

## Isolated real-MySQL coverage: 8 scenarios

Tests used the real HTTP app, real Prisma/driver transactions and separate event-staff sessions. They did not use an in-memory database mock.

| Scenario                               | Recorded outcome                                                                                                                                                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth and special draft lifecycle       | Real staff cookie login worked; ADMIN-only program access returned 403; free special with capacity 1,000 and cover URL created; revision incremented; stale edit returned 409; eligible deletion removed intrinsic configuration and retained audit                               |
| Concurrent conflicting special creates | Simultaneous requests from two event staff produced one 201/one 409 in an initially empty scope; adjacent interval and another acoustic area accepted; cancellation released the old interval                                                                                     |
| Preview/selection/repeated submission  | Three candidates with one conflict produced two eligible dates; one selected recurring draft created without SpecialEvent configuration; repeat returned 409 without extra rows; deletion preserved batch createdCount; submitting again after deletion created a different batch |
| Stale selection and mixed races        | A new conflict after preview caused 409/no batch; concurrent batch/batch and special/batch requests each produced one 201/one 409                                                                                                                                                 |
| Invalid selected dates                 | Out-of-range and wrong-weekday dates returned 400; batch/program counts remained unchanged                                                                                                                                                                                        |
| Forced rollback                        | A test-only audit trigger failed at RECURRING_GENERATED; API returned sanitized 500 and batch/program/audit counts all matched their pre-request values                                                                                                                           |
| Duplicate create and revision races    | Simultaneous identical submissions produced one 201/one 409; concurrent edits using the same revision produced one 200/one 409, ending at revision 2; direct valid creation worked without prior preview                                                                          |
| Dependency/publication guards          | An existing draft schedule version blocked metadata edit/deletion with 409; PUBLISHED blocked edit; page beyond the end returned empty items with actual totals                                                                                                                   |

The initial rollback setup attempted CREATE TRIGGER through Prisma's prepared statement protocol and failed with MySQL code 1295. Test setup was corrected to use the installed MariaDB driver's text-query DDL on the isolated schema. The final rollback scenario passed. This correction did not change production business rules.

## Database setup and cleanup actually performed

For each recorded DB run, a temporary orchestration script:

1. Loaded credentials locally without printing them and refused a non-loopback host.
2. Generated a unique `cafeinn_program_test_<random>` schema name, validated its prefix/characters and created that new schema.
3. Executed all four migration SQL files in order against that schema only. This exercised SQL artifacts directly; it was not a `prisma migrate deploy` execution or verification of `_prisma_migrations` bookkeeping.
4. Passed its URL through `PROGRAM_TEST_DATABASE_URL` to the integration runner. The runner also checks the loopback host/test-name prefix and verifies empty employee/program data. The orchestration-created schema was fresh.
5. Closed connections and dropped only the schema created by that orchestration run.

The final runtime schema inspection reported **39 business tables** and **`removedRequestTablePresent: false`**. Temporary schemas were removed. No existing demo/shared database was migrated, reset, seeded or subjected to DROP TABLE. No credentials, cookies or connection URLs are included in this record.

The orchestration script was executed through the tool session and is not a committed setup script. The integration suite does not create/migrate/delete an arbitrary target automatically. A future run needs an explicitly arranged fresh local test schema and trigger privileges; do not point it at `cafeinn_dev`.

## HTTP smoke evidence

An earlier compiled-server smoke run during this implementation recorded health, OpenAPI JSON and Swagger UI returning 200, and anonymous program/batch reads returning 401. That smoke run preceded the later token/request-table simplifications. After simplification, the final build and source-app HTTP/OpenAPI suites passed, but the separate compiled-server smoke was not repeated. Do not describe the older smoke as a fresh check of the final API request shape.

## Not established by these checks

- Migration application, TLS/provider behavior or deployment readiness on the existing demo/shared environment.
- Correctness of invitation, booking, publication, cancellation/notification or coordinated-change workflows, which are not implemented in this slice.
- Participation of future writers in the shared area/program locking protocol.
- A durable exactly-once/replay guarantee. Once intervals are freed by deletion/cancellation/time changes, the same input may create a new operation.
- Complete dependency coverage for every invitation/booking state: the DB guard scenario exercised a schedule dependency and published state, not every possible reference combination.
- Load/latency testing, exhaustive deadlock exploration, all auth expiry/revocation cases, browser end-to-end behavior or accessibility.
- Image availability/content validation or upload; the cover field stores a validated URL only.

## Safe rerun entry points

Run the standard offline scripts after a relevant change. For database verification, first arrange an authorized fresh migrated loopback schema named `cafeinn_program_test_*`, then set `PROGRAM_TEST_DATABASE_URL` securely and run `npm.cmd run test:programs:db`. The suite writes fixture data and creates/drops a rollback-test trigger; its target is not reusable without a separately controlled disposable-schema lifecycle. Never reset demo/shared data to make the tests pass.
