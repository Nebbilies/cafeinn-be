# Rich demo seed implementation plan

Status: Design and implementation plan approved by the user on 2026-11-12. Self-reviewed against the current schema and approved constraints. Implemented on `feature/demo-seed`; database write execution remains unverified and was not performed.

Design authority: [approved seed design](seed-design.md), approved on 2026-11-12. The selected process is short Brainstorm/Design/Plan, then Implement and Verify; no separate TDD phase is required.

## Deliverable

Provide `npm run db:seed` for a coherent dataset containing exactly 150 orders over 30 Vietnam calendar days. Reuse the current 39-model Prisma schema, native Node TypeScript execution, existing UTC database adapter, and installed dependencies.

Prepare and verify the script locally. Do not apply migrations, execute the write-mode seed against any database, reset existing data, commit, push, or change the schema as part of this task. A real seed execution requires separate authorization.

Working branch: `feature/demo-seed`, created from the schema-bearing checkout after user approval. Unrelated changes are preserved.

## Files

| File | Responsibility |
| --- | --- |
| `prisma/seed.ts` | Parse seed-only arguments, load environment, generate/validate fixtures, provide dry-run or real population, print a non-sensitive summary, and always disconnect. |
| `prisma/seed/data-types.ts` | Typed scalar row groups for the current generated models. |
| `prisma/seed/demo-data.ts` | Define and construct the typed deterministic scenario graph, including derived amounts, UTC instants, report snapshots, and business audit records. |
| `prisma/seed/validate-data.ts` | Validate cross-record links, cardinalities, money, time intervals, states, and accounting invariants before persistence. |
| `prisma/seed/populate.ts` | Perform empty-target/marker checks and insert the prepared graph in one transaction, handling the two nullable FK cycles explicitly. |
| `package.json` | Add `db:seed` using the existing generation command and Node's native TypeScript runner. |
| `tsconfig.json` | Include `prisma/**/*.ts` in type checking. Keep production build inputs restricted to `src`. |
| `README.md` | Add a concise seed section without replacing or removing existing content. |

The expected package command is `npm run db:generate && node prisma/seed.ts`. Therefore `npm run db:seed -- --dry-run` generates the local client, then runs fixture validation without database access. No automatic Prisma migration/startup seed hook is introduced.

Do not add Faker, a date library, a password library, or a generic database/CRUD layer. Keep temporary generation helpers outside repository dependencies. All repository documentation and technical identifiers remain English; fictional customer/menu descriptions may be Vietnamese.

## Step 1: establish the baseline

Confirm the branch, clean/unrelated changes, current schema fields, generated client, installed runtime, and existing scripts. Use the current generated types rather than older field-catalog assumptions. In particular, report lines use `(reportId, id)` with the `ReportLineCode` enum.

Reuse `loadEnvironment`, `getPrisma`, and `disconnectDatabase`. Do not read or print real connection credentials during preparation. Keep `DATABASE_URL` as the connection source.

## Step 2: construct the scenario graph

Implement the approved fixture targets, keeping the order count fixed:

- 100 dine-in, 30 room-service, and 20 takeaway orders.
- 130 paid, 15 open, and five cancelled orders, allocated across those service types coherently.
- At least eight surcharge-only and ten room-only orders within that total.
- Approximately 10 employees, three roles, six categories, 30 menu items, three areas, 24 tables, six rooms, and eight artists.
- Bounded recurring batches and special events with reservations, arrival batches, invitations, schedule versions/slots, and actual assignments.
- Booked/direct room rentals, room transfers sharing a charge order, locked prices, and valid actual/expected times.
- Cash/bank payments, pending/reconciliation cases, cancellations, partial/full refunds, linked receipts, shift handover, and audit events.
- Costs across F/H1-H5 and report snapshots derived from the relevant periods; include checked, missing-data, confirmed-zero, and zero-activity examples.
- Inactive/soft-deleted directory fixtures whose history remains available; no live session or OTP records.

Use explicit fixture IDs within the empty target and return typed row groups using the generated Prisma scalar model types. Derive foreign keys from fixture references. Do not cast arbitrary objects through `any` or force types to hide incorrect model fields.

Use a deterministic generator and one reference date. Default to the current Vietnam date; allow `--reference-date YYYY-MM-DD` for reproducible runs. Interpret that date as the demo business-day anchor, with future programs/bookings explicitly distinguished from historical sales. Keep `DATE` and recurring `TIME` values separate from UTC instants.

Derive totals from the graph. Successful collections, completed refunds, pending refund reservations, cash balances, source fees, and reports cannot be unrelated random amounts. Keep no more than one open service order per current table/rental and one open shift. Place open orders in the current demo context rather than leaving them spread across historical closed shifts.

The password format is not yet an application authentication contract. Reuse an authentication helper if one has appeared since planning; otherwise use built-in scrypt with a documented algorithm/salt/digest format and random salts. Use the user-selected fixed demo password `cafeinn@123`, hashed separately for each employee, and the 10 usernames/role combinations in the seed design. Do not require a separate `SEED_PASSWORD` variable. Do not log it or claim existing login APIs can consume that format. In dry-run mode, use clearly non-persistable placeholder hash values and never create live credentials.

## Step 3: validate the generated dataset

Per the user’s correction, do not add test files or run test suites for this task. Keep runtime dataset validation before persistence: broken links, duplicate keys, impossible times, inconsistent source totals/refunds/shifts/reports, and invalid weekdays must fail before writes.

Use the generated Prisma types, compiler/linter, and CLI dry-run to check the prepared script. Dry-run exercises the actual fixture generator and validator without creating a database client. It does not establish live MySQL persistence, rollback, or repeat-run behavior.

## Step 4: transactional persistence and repeat runs

Use one Prisma interactive transaction with an explicitly sufficient timeout. Produce the dataset and password hashes before opening the transaction so the write transaction contains database work only.

1. Look for the versioned `DEMO_SEED_V1` marker in `system_settings` inside the transaction. A matching completed seed returns a no-op summary and does not overwrite manually modified fixture rows.
2. Without that marker, verify all application tables are empty, including settings/authentication/history tables. Refuse an occupied or incompatible target without deleting or modifying it.
3. Use serializable isolation and the unique marker to prevent two concurrent initial populations from both succeeding. A transaction conflict fails clearly; do not silently reset/retry a potentially changed target.
4. Insert parent directories, memberships/settings, shifts, bookings/programs, and their dependent records in FK order. Preserve FK enforcement.
5. Create the program before its schedule versions, then attach its published version. Create rentals with a nullable charge-order pointer, create their orders, then attach room-charge order IDs. Preserve the relationships across transferred rentals.
6. Insert source allocations, receipts, cancellations/refunds, costs, reports/lines, and matching audit records in dependency order. Any cyclic final reference is updated within this transaction.
7. Write the marker last, with dataset version, reference date, and summary counts, then commit. Any error rolls back both fixtures and marker.

Use explicit per-model inserts/createMany and small targeted updates. Do not bypass constraints, truncate tables, disable foreign keys, add a seed table, or overwrite existing rows with blanket upserts. Source payment/refund records and audit logs remain coherent and append-only in their fixture lifecycle.

A repeat run with the matching marker uses the marker's original reference date; the fact that the wall-clock date changed does not regenerate another dataset. An explicit incompatible reference date/version must be reported, not applied over existing seed data.

## Step 5: CLI and documentation

Support real population and `--dry-run`, plus an optional reference date. Parse arguments with the platform API; reject unknown/invalid values before creating a client. Dry-run must not load a database client or inspect the real database.

Write mode requires a valid `DATABASE_URL` and the compatible migrated target. The confirmed fixed demo credential removes the need for a seed-password environment input. Keep normal application startup/liveness independent of these seed-only inputs. A matching completed-marker rerun should not require changing existing password hashes.

Always disconnect in a finally block after real-mode access. Print model/scenario counts and whether the result was created, unchanged, or rejected. Error output must not include the URL, credentials, passwords, hash material, or raw connection errors containing those values.

Add the package command and README seed section. Document that the script is for demo/development data, does not implement business services, does not apply migrations, and has not been run against the team's database during preparation.

## Step 6: verification and completion

Run local schema validation, generation, typecheck, lint, build, and a deterministic package dry-run. Do not create or run automated tests, as requested. Confirm the seed TypeScript is typechecked without moving it into the production HTTP build. Reuse the installed Node 26/npm 11 runtime and existing dependencies.

Example offline check after implementation:

```sh
npm run db:seed -- --dry-run --reference-date 2026-11-12
```

No real seed execution is authorized by this plan. Record actual offline results and distinguish these remaining MySQL checks:

- A full initial insert is accepted by the actual FK/CHECK/index definitions.
- The written dataset matches its validated graph and report/source totals.
- A second run is a true no-op with no added rows or changed passwords.
- Occupied/incompatible targets are left unchanged.
- Failed/concurrent population rolls back safely and never leaves a complete marker with partial data.

Completion requires the command, typed coherent 150-order dataset, runtime dataset validation, a short README seed paragraph, and passing offline checks. Do not claim MySQL persistence/rollback/rerun evidence without an authorized live run. Do not commit, push, or update the existing schema PR unless requested.

## Author review and gate

Reviewed on 2026-11-12 against the approved seed design, current schema, and repository scripts. The plan preserves the exact order count, uses current compound keys, handles the FK cycles, keeps authentication tokens absent, and makes repeat-run behavior explicit without data destruction. The revised scope excludes test files/test runs and a separate seed guide. Runtime validation and dry-run remain distinct from real database evidence.

The demo password and account list are settled. Phase 3 user approval and branch choice remain outstanding. After both are confirmed, implement and verify the authorized local scope without repeated permission requests for routine steps.

## Verification outcome

Typecheck, lint, production build/client generation, and the package-script dry-run passed. Dry-run creates no database client. Runtime validation covers 48 foreign-key links, 57 uniqueness definitions, service context, quantities, totals, allocations, tender, rental overlaps/charges, refund sources, event capacity, publication/artist links, recurring dates, cash balances, and settlement audit presence.

No tests were added or run, as requested. No write-mode seed or migration was executed; real MySQL FK/CHECK acceptance, rollback behavior, and marker rerun behavior still require an authorized database run. No commits or pushes were made.
