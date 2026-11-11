# Physical database implementation plan

Status: Phase 3 approved by the user on 2026-11-11. The user also approved branch `feature/database-schema`; implementation follows this plan.

Design authority: [approved database design](database-design.md), approved by the user on 2026-11-11, including English naming, JSON weekdays, MySQL/UTC timestamps, metadata coverage, and the seven-table soft-delete policy.

## Outcome and boundaries

Implement the approved physical design in this backend repository: 39 Prisma models, the 48 original foreign keys, an initial SQL migration for an empty MySQL application database, and a field catalog/runbook. Preserve the existing database-independent HTTP scaffold.

Preparation and verification are local/offline. Applying a migration, connecting to the team's database, introspecting it, seeding data, resetting a database, and committing/pushing are not authorized. Do not add business APIs, soft-delete/restore endpoints, new accounting features, or transaction workflows in this task.

The source ERD fingerprint and approved differences are recorded in the design. The implementation must be self-contained in this repository and must not depend at runtime, build time, or in tests on the neighboring frontend/docs directories. Do not edit the supplied drawio file.

The baseline branch was `main`. The user selected implementation branch `feature/database-schema`, which was created with the existing design/plan documents retained. No commit is included.

## File changes

| File | Change and purpose |
| --- | --- |
| `prisma/schema.prisma` | Retain the existing generator/datasource configuration; add the approved models, translated enums, explicit native types, mapped names, relations, keys, and indexes. |
| `prisma/migrations/migration_lock.toml` | Add the MySQL provider lock for the new migration history. |
| `prisma/migrations/<utc_timestamp>_initial_schema/migration.sql` | Generate initial DDL offline; review and add named CHECK constraints, exact opaque-identifier collations, and the original-order lookup view. Use the actual generation time for the directory name. |
| `src/database/connection-options.ts` | Add a small side-effect-free conversion from the canonical database URL to driver options that preserve connection/TLS settings and enforce UTC conversion/session settings. |
| `src/database/prisma.ts` | Use the connection-options function when lazily constructing the existing adapter/client. Preserve lifecycle and disconnect behavior. |
| `tests/database-connection-options.test.ts` | Test the connection-options public contract with fictitious URLs, no real database, and no credential-bearing errors. |
| `docs/database-field-catalog.md` | Record every source field's English SQL/Prisma name, type, default, nullability, key/relationship, and approved physical difference. Record enum and audit-action translations. |
| `docs/database-verification.md` | Record exact local verification results, migration review coverage, and the separately authorized MySQL verification checklist. |
| `README.md` | Replace the obsolete empty-schema explanation; link the schema/design/catalog and describe generation, UTC, migration ownership, soft-delete limits, and supported MySQL requirements. |
| `docs/database-design.md` | Keep the approved decisions and approval record current. Add factual implementation notes only when they do not change the agreed design. |

`package.json` already contains the required validate/generate/build/typecheck/lint/test scripts. Reuse them. Keep dependency versions and the lockfile unchanged. Retain the existing non-routable CLI placeholder in `prisma.config.ts` for offline work. Do not introduce a second host/user/password configuration or a mandatory local database.

Generated Prisma files and `dist` outputs remain ignored build artifacts, not authored deliverables. Temporary extraction or DDL-generation helpers must not become dependencies of the independently cloned repository.

## Test boundaries to approve with this plan

These boundaries identify what will be tested before any new tests are written. Approval of this plan confirms them.

| Boundary | What it proves | What it does not prove |
| --- | --- | --- |
| Exported connection-options function, given a fictitious canonical MySQL URL | Credentials/connection options are parsed without unsafe loss; UTC conversion and session settings are explicit; malformed input produces a sanitized error. | Successful TLS negotiation, authentication, or timezone behavior on a live pooled connection. |
| Existing HTTP app through its loopback HTTP tests | Health, CORS, not-found responses, and safe error responses still work without database access. | New business APIs, authorization, or database readiness. |
| Prisma schema through the installed validator/generator and TypeScript compiler | The model/relationship/native-type declarations are accepted and the generated client compiles with the existing application. | MySQL execution of manual SQL constraints/views or correctness under concurrent business writes. |
| Initial migration's SQL contract, reviewed offline; exercised later only on an authorized empty MySQL database | Offline review covers the approved SQL definitions; a later database run can establish real constraint/view behavior. | Offline review alone cannot establish execution success or service transaction guarantees. |

Do not add tests that only count model names or mirror generated SQL text. Use the field catalog and source review for structural accounting. Do not mock internal application layers or build a fake database that claims to prove real MySQL behavior.

## Step 1: establish the local baseline

1. Recheck Git status, the approved design, existing dependency versions, and the user-selected branch. Preserve unrelated changes.
2. Use the already installed Node 26.13 runtime and a compatible npm 11 runtime. The shell's Volta default can select an older Node, so confirm the actual runtime before interpreting a failure.
3. Reuse existing generated output or regenerate the current client locally as needed. Run the existing tests and checks to distinguish baseline failures from this task's changes.
4. Do not read real connection secrets or use a configured remote URL to perform a database operation. Validation, generation, and empty-to-schema diff use local schema inputs only.

## Step 2: implement the UTC connection boundary with simple TDD

Work one behavior at a time: write a failing test, confirm the failure concerns the missing behavior, implement only enough to pass, then move to the next behavior. Do not write a large suite against an imagined implementation first.

The function will accept the canonical MySQL connection URL and return the adapter's supported driver options without creating a client, pool, socket, or database connection. The file split exists because this operation has an independently useful, testable boundary; do not add a generic database abstraction.

Behavior slices:

1. A valid fictitious URL yields the intended host, port, database, and decoded credentials while enforcing UTC for both date conversion and each connection's session.
2. Supported TLS and connection options survive parsing. URL-supplied timezone options cannot override the approved UTC convention. Test known literal expectations, not values recomputed by the same parser under test.
3. Malformed URLs or unsupported schemes are rejected without including the original URL, password, or credential-bearing parser error/cause in the public error.

Reuse the existing URL validation and the driver's public parsing/options API where it preserves the required configuration. In the installed driver, the public parser accepts `mariadb://` rather than the canonical `mysql://`; if used, change only the protocol of a local URL copy before parsing. The canonical configuration remains `DATABASE_URL=mysql://...`. Do not broadly rename query parameters or discard TLS options to make parsing succeed.

Configure the supported driver timezone and UTC session variables explicitly. Preserve other supported session settings without permitting them to replace `time_zone = '+00:00'`. Account for any initialization SQL that could override the UTC session convention. If a provider-specific option is unsupported or ambiguous, report that fact rather than silently weakening transport security.

Integrate the helper with lazy Prisma initialization after its contract tests pass. Leave the HTTP app's liveness path independent of the database. Test outputs must never contain real credentials.

## Step 3: build the field catalog and Prisma model

Implement in manageable groups, updating the catalog alongside the schema:

1. Identity, roles/permissions, sessions/codes, audit, and settings.
2. Menu, areas/tables, rooms, and reservations.
3. Programs, recurrence batches, schedule versions/slots, artists/invitations/assignments, and event attendance/check-ins.
4. Room rentals, orders/items, surcharges, payments/allocations, receipts, cancellations/refunds, and shifts.
5. Expenses and profit-report metadata/lines.

Use all 39 approved table/model mappings. Preserve each source field and its meaning except for explicitly approved changes. Translate source enums and JSON entity/key identifiers consistently; preserve report codes A, B, C, D, F, and H1-H5. Enumerate the ERD page 05 audit actions plus `RECORD_SOFT_DELETED` and `RECORD_RESTORED`.

Required accounting in the catalog:

- 39 tables/models and 48 source foreign keys, with optionality retained.
- Original primary keys, composite/shared keys, and unique constraints.
- Source string lengths, integer widths/signedness, and nullable snapshots.
- Creation metadata in 39 tables, update metadata in 32, and deletion metadata in the seven approved directory tables.
- `updated_at` exclusions: audit logs, receipts, check-ins, payment allocations, item-cancellation requests, employee-role links, and role-permission links.
- JSON weekdays, required rental expected checkout, signed opening cash adjustment, explicit timestamp native types, UUID storage, enum translations, and the two new audit actions.

Use `DateTime` with `Timestamp(3)` for instants; plain `DateTime` is not an equivalent physical declaration. Keep local `DATE` and `TIME` semantics. Preserve the chosen timestamp range ending in January 2038.

Use `@default(now())` where creation/update metadata needs a database creation default and `@updatedAt` for the 32 mutable model fields. Business event/deadline fields remain explicit. `deleted_at` is nullable with no automatic update attribute. Keep `BIGINT` audit IDs and integer VND amounts as designed.

Preserve both distinct order/rental relations using explicit Prisma relation names. Keep `room_charge_order_id` and `room_booking_id` non-unique on rentals. Preserve the program/published-version cycle and the shift predecessor self-reference.

Set business foreign-key delete/update behavior to Restrict, including foreign-key columns used in CHECK expressions. Add only documented-read indexes and foreign-key indexes not already covered by a suitable leading key. Do not introduce new business tables, a generic source-ID relation, or a separate cash ledger.

Run the local schema validator while resolving declarations. Intermediate generation is appropriate when the actual schema is needed to verify application typing. It must not require access to a database.

## Step 4: generate and complete the initial SQL migration

After the schema validates, create the migration directory and generate baseline SQL with the installed Prisma 7.10.1 command shape:

```text
prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/<utc_timestamp>_initial_schema/migration.sql
```

Invoke the repository-installed CLI with the selected runtime. This is an empty-to-local-schema diff, not a migration application. Do not use `migrate dev`, `db push`, `db pull`, reset, seed, shadow-database inputs, or a datasource-to-schema diff as a substitute.

Create the MySQL migration lock file. Add reviewed SQL-only definitions to the initial migration, after the required tables exist. Create all tables before attaching cyclic foreign keys; do not turn off foreign-key checks to bypass definition ordering.

Named CHECK definitions must cover:

- Order service context and item quantity consistency.
- Exactly one payment-allocation source.
- Required name/phone for direct event attendance and direct room rental.
- Expected checkout after actual check-in; actual checkout, when present, after actual check-in.
- Non-null sufficient cash tender only for cash collections; NULL customer tender for bank transactions and refunds.
- Valid report dates, reviewer/time for checked reports, and explicit available/zero/missing line semantics.
- JSON weekdays as a nonempty array of no more than seven distinct permitted weekday strings, using an inline JSON schema.

Use explicit NULL branches so a CHECK does not accidentally accept a missing required value through SQL UNKNOWN. Keep constraint names unique across the schema and within identifier limits. Review the interaction of CHECKs with foreign-key actions.

Add the source lookup view `v_payment_allocation_orders`. Verify with the catalog that direct item-money, surcharge, and rental allocations resolve the correct original order and remain separate sources. Include transaction kind/status for consumer filtering. Do not change source ownership through the view.

Preserve source uniqueness after soft deletion. Do not add `deleted_at` to unique indexes, drop existing unique constraints, or implement active-only identity reuse. Opaque token/code comparisons get the agreed exact collation where needed; retain ordinary Unicode text support.

Once manual SQL has been added, review any subsequent regeneration rather than overwriting the migration wholesale. The Prisma schema alone does not reproduce the CHECK/view/collation additions.

## Step 5: document the operational contract

Update the README and field catalog so a backend-only checkout is usable. Explain:

- Existing generation/build commands, the migration file location, and the requirement for an empty MySQL target with the designed features.
- UTC driver and session settings, local reporting/calendar semantics, and the TIMESTAMP range limit.
- The difference between immutable audit history and row creation/update metadata; raw-SQL writers must maintain update metadata explicitly.
- Soft-delete scope, reserved unique keys, restoration without automatically reactivating business status, and historical reads retaining deleted directory references.
- Physical foreign-key protection versus service-owned soft-delete eligibility and concurrency rules.
- The separate owner-controlled review/application step for the shared database.

Document future verification through the SQL database boundary without pretending the current task implements business services. Keep the documentation in English and use placeholders only for connection examples.

## Step 6: verify and record the evidence

### Local checks in this task

Run the existing commands using the selected Node/npm runtime:

```text
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

The build already runs client generation; avoid repeating the suite without an intervening change or unresolved concern. Generation before type checking is needed when the model changes. Group checks sensibly so redundant generation is minimized while each required script is accounted for.

Review the initial SQL and field catalog against the independently supplied ERD and approved physical differences. Record model/field/key coverage, source tracing, all timestamp counts and exclusions, weekday validation, tender/NULL conditions, non-unique transfer links, Restrict actions, and the soft-delete key policy. Check generated SQL identifier lengths and table/foreign-key creation order.

Inspect the final Git diff/status for unintended files or changes. Keep generated outputs ignored. Record actual results and limitations in `docs/database-verification.md`. Do not write static tests that pass merely because the implementation contains its own expected strings.

### Real-MySQL checks requiring separate authorization

The verification document will include this checklist, marked not executed unless a suitable database is later authorized:

1. Confirm target version, SQL mode, TLS setup, empty schema, and required CHECK/JSON features.
2. Apply the initial migration and inspect native types, foreign keys, unique keys, CHECKs, indexes, and the view.
3. Attempt invalid weekday arrays, service contexts, multiple/no allocation sources, missing walk-in contacts, impossible rental times, invalid cash tender, and contradictory report-line states; verify rejection. Include valid counterparts.
4. Store multiple rentals under the same booking and charge order to exercise the room-transfer fix. Verify original-order lookup for direct, fee-only, and room-only allocations, including one order with multiple rental charges.
5. Check actual UTC session settings and timestamp round trips on pooled connections, including a Vietnam date boundary. Date-only and recurring-time semantics must remain distinct.
6. Mark a directory record deleted and restore it without deleting dependent history or releasing its unique identifiers. Endpoint visibility/authentication/dependency behavior remains a later service verification task.

No offline success establishes these real-database results. A database run also does not prove booking/payment/refund concurrency before the relevant services and transactions exist.

## Completion criteria

- The approved schema and all necessary SQL additions are present and reviewable in this repository.
- The field catalog accounts for all original fields/relationships and approved differences.
- The public UTC connection contract tests and existing HTTP tests pass; local validation, generation, typing, lint, and build pass.
- Creation/update/deletion metadata coverage and the source unique-key policy match the approved design.
- No shared database operation, dependency addition, seed, business endpoint, commit, or push has been performed.
- The verification report states exactly which evidence is local and which MySQL/service checks remain unexecuted.

If a material incompatibility is discovered during implementation, report its effect before changing an approved design decision. Fix routine implementation errors within the approved scope; do not expand the task to make unrelated checks pass.

## Author review and approval gate

Author review completed on 2026-11-11. The plan was checked against the approved design and the actual repository files/scripts.

- The change list covers Prisma, manual SQL, UTC adapter configuration, useful contract tests, and standalone backend documentation.
- The approved 39/48 structural baseline, 39/32/7 metadata coverage, JSON weekdays, room transfer/expected checkout, signed cash adjustment, and reserved unique keys are preserved.
- Tests are limited to the declared boundaries; TDD uses one behavior slice at a time. Real database and service-concurrency checks are not claimed as offline coverage.
- Existing runtime/dependencies/scripts are reused. Proposed production changes are not made while preparing this plan.
- The user approved Phase 3 and branch `feature/database-schema` on 2026-11-11. Proceed through Simple TDD, Implement, and Verify under this plan, without requesting approval again for already authorized local steps.

The author review concerns plan consistency. The subsequent user approval authorizes the stated local implementation and checks. It is not evidence that a migration has executed on a database.
