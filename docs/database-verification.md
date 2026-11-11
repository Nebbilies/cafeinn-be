# Physical database verification

Verification date: 2026-11-11. Branch: `feature/database-schema`.

Scope: local schema/client/runtime checks and an offline review of the initial migration. No database connection, introspection, migration application, reset, or seed was performed. No commit or push was performed.

## Deliverables

- `prisma/schema.prisma`: 39 models with mapped English names, explicit native types, enums, relationships, indexes, and approved metadata.
- `prisma/migrations/20261111140658_initial_schema/migration.sql`: generated baseline DDL plus reviewed SQL-only constraints, collations, and source lookup view.
- `prisma/migrations/migration_lock.toml`: MySQL provider.
- `src/database/connection-options.ts`: tested URL-to-driver-options boundary with explicit UTC settings and sanitized failures.
- `docs/database-field-catalog.md`: complete source-field and enum mapping, including approved additions.

The [approved design](database-design.md) and [implementation plan](database-implementation-plan.md) describe scope, mutation policy, future service responsibilities, and the approval record.

## Local checks completed

Runtime: Node 26.13.0 and npm 11.20.0. Existing dependency versions and lockfile were retained.

| Check | Result | Evidence and limit |
| --- | --- | --- |
| `npm run db:validate` | PASS | Prisma 7.10.1 accepts the actual 39-model schema. No database contacted. |
| `npm run db:generate` | PASS | Actual Prisma Client generated locally. This is also run by the build. |
| `npm run typecheck` | PASS | The application, configuration, tests, and actual generated client compile. |
| `npm run lint` | PASS | Existing ESLint configuration accepts the authored TypeScript. |
| `npm test` | PASS, 7 tests | Three new configuration-contract tests plus four existing HTTP tests. Uses fictitious database URLs and HTTP loopback only. |
| `npm run build` | PASS | Actual client generation and production TypeScript compilation succeed. |
| Offline Prisma empty-to-schema diff | PASS | Initial SQL emitted using `--from-empty --to-schema prisma/schema.prisma --script`; it was not applied. |
| Source/catalog/schema/DDL review | PASS, offline | Counts, original column coverage, FK endpoints, source unique keys, metadata, CHECK references, and approved differences reconciled. |
| `git diff --check` | PASS | No whitespace errors in tracked changes. |

The restricted execution environment initially denied child-process creation. The same test files passed with `--test-isolation=none`; the normal `npm test` command subsequently passed with permission to spawn its local workers. The offline schema engine also required permission to spawn. Neither rerun used a database input or broadened database authorization.

### TDD evidence

The public connection-options boundary was implemented one behavior slice at a time:

1. The first test failed before the helper existed and then exposed loss of the URL's pool setting. The implementation now preserves the fictitious connection identity and pool configuration and returns explicit UTC settings.
2. The next test exposed loss of structured TLS options and incorrect initialization handling. It now verifies certificate-verification settings and CA data survive, existing session settings survive, and UTC is the final initialization statement even if a supplied initialization statement changes the timezone.
3. The error-contract test failed on an unsanitized parser error. Malformed URLs, another scheme, a missing database, malformed structured options, and disabled certificate verification now fail with a generic error and no credential-bearing cause.

The tests use real URL parsing and the installed public driver API. They do not create a pool or mock an internal repository. They verify the returned configuration contract, not a live TLS/session result.

The adapter carries MariaDB driver 3.5.4 internally while the existing direct driver is 3.5.5. Their callback types differ. The helper's URL-based return contract excludes driver-specific `typeCast` and `logger` callback types; it does not require changing dependencies or casting through the adapter's internal types. Application type checking passes with both installed packages.

## Structural reconciliation

The supplied ERD SHA-256 is `245289be1802d145dc7cf43cface2655e237175b2e808fb1d7e2ea25a36808a6`.

| Item | Reviewed result |
| --- | --- |
| Source tables / Prisma models / SQL tables | 39 / 39 / 39 |
| Source foreign keys / SQL foreign keys | 48 / 48; parent/child endpoint multiplicities match |
| Original source fields | 246, each represented in the field catalog and SQL table |
| Physical fields | 314 |
| Added creation timestamps | 28; the other 11 translate existing `ngay_tao` |
| Total creation/update/deletion timestamps | 39 / 32 / 7 |
| Other added field | Required rental `expected_checkout_at` |
| Prisma enum definitions | 32 |
| Audit actions | 50 source page-05 actions plus two soft-delete/restore actions |
| Named SQL CHECK constraints | 12 |
| Storage engine | Explicit InnoDB on all 39 tables |
| FK actions | All 48 use Restrict for update and delete |
| Source unique keys | Retained; no `deleted_at` composite uniqueness or active-only key reuse |
| Transfer links | Rental booking and room-charge order FKs remain non-unique |
| SQL lookup view | `v_payment_allocation_orders` includes all source records without a deleted-directory filter |

Field-count reconciliation: 246 original fields + 28 creation timestamps + 32 update timestamps + seven deletion timestamps + one rental planning timestamp = 314.

The review compared source field names and original unique markers to the field catalog, catalog columns to generated SQL columns, and diagram parent/child edges to SQL foreign-key endpoints. It also checked that CHECK column references exist, constraint/index names fit MySQL identifier limits, cyclic FKs follow table creation, and foreign-key checks are not disabled. This is artifact consistency evidence, not a MySQL execution result.

### SQL-only additions reviewed

- Explicit InnoDB and exact binary comparisons for session IDs, invitation tokens, verification/password hashes, and bank references. Ordinary text remains Unicode and case/accent insensitive under the approved collation.
- Order context; quantity consistency; exclusive allocation source; direct-customer contacts; actual/expected rental times; cash-collection versus refund/bank tender; report periods/reviewer/line completeness; and JSON weekday validation.
- The JSON schema requires one to seven distinct strings from `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, and `SUN`.
- Conditional nullable CHECK branches contain explicit NULL tests. In particular, confirmed-zero report lines cannot pass with NULL, and cash collections cannot omit tendered cash.
- Source tracing uses the allocation's direct order, surcharge owner order, or rental room-charge order. A source not yet assigned to an order can still yield NULL before service confirmation; the view does not invent an owner.
- Creation of tables precedes the 48 FK additions, preserving program/schedule and order/rental cycles. Delete/update actions avoid CHECK/cascade incompatibility.

These definitions are deliberately maintained in the migration because a plain Prisma diff does not reproduce CHECKs, the view, or per-column collations.

## Checks requiring an authorized real MySQL environment

The following are **not executed**. A team migration owner must authorize and perform them on an empty compatible target before treating the SQL as deployment-verified.

1. Confirm actual MySQL version (8.0.17+ semantics), empty target, privileges, enforced CHECK support, JSON schema functions, strict SQL mode, and provider TLS configuration. MariaDB compatibility is not claimed.
2. Review the migration and apply it using the repository's migration history. Inspect native timestamp precision, keys, indexes, collations, CHECK definitions, and the view.
3. Exercise valid and invalid SQL cases through the database boundary:

| Case | Expected result |
| --- | --- |
| Weekdays `["MON", "WED", "FRI"]` | Accepted |
| Empty array, duplicate days, unknown day, number, object, or JSON null | Rejected |
| Dine-in without table, room service without rental, takeaway with a location | Rejected |
| Prepared plus cancelled quantity above ordered quantity | Rejected |
| Allocation with no source or two sources | Rejected |
| Walk-in attendance/rental without representative name or phone | Rejected |
| Expected checkout at/before actual check-in; actual checkout at/before check-in | Rejected |
| Cash collection with no tender or tender below amount | Rejected |
| Refund or bank transfer with customer cash tender | Rejected |
| Confirmed no-activity line with NULL/nonzero amount; missing-data line with an amount | Rejected |
| Checked report without reviewer/check time; inverted report dates | Rejected |
| Two rentals using the same booking and charge order | Accepted when their individual required values are valid |

4. Read the view for direct, surcharge-only, and room-only payments; use two rentals charged to the same order. Check transaction kind/status filters and distinct original-order counting. Do not add the full order total to the separately allocated room/fee sources.
5. Verify actual pooled `@@session.time_zone`, supported provider TLS settings, a timestamp round trip across Vietnam midnight, local DATE boundaries, and recurring local TIME values. The selected TIMESTAMP type ends in January 2038.
6. Mark a directory row deleted with an explicit update timestamp, confirm references/unique values remain, then restore it. Soft-delete eligibility, hidden selections/authentication, audit actions, immutable business sources, and concurrency still require the future service implementations.

## Remaining service responsibilities

No business endpoints were added. Room availability and overlap locking, event capacity, duplicate check-ins, single open shifts/orders, payment reconciliation/idempotency, refund reservations and approval, snapshot immutability, and soft-delete/restore eligibility remain the approved future service responsibilities.

The schema provides storage, relationships, uniqueness, and row-local SQL constraints. It does not make these cross-row workflows concurrency-safe on its own. Confirmation/completion report times must come from their actual audit events, not a pending payment's creation metadata.
