# Rich demo seed design

Status: Design and implementation plan approved by the user on 2026-11-12. Self-reviewed against the current schema and approved constraints. Implemented on `feature/demo-seed`; database write execution remains unverified and was not performed.

## Scope

Create a coherent development/demo dataset for the current Prisma/MySQL schema. The user requested approximately 150 orders rather than 300. The script will be callable through `npm run db:seed` and will not run automatically during startup, migration, build, or tests.

Script preparation does not authorize running it against the shared database. This task will not alter schema/migrations, apply migrations, introduce business endpoints, or commit/push unless separately requested.

The schema and generated Prisma types are the implementation authority. In particular, the current profit-report line key is `(reportId, id)`, where `id` is `ReportLineCode`; do not assume a field named `code` from older discussion documents.

## Dataset size

Counts below are the proposed fixture targets. Dependent transaction/allocation/audit counts are derived from the actual scenarios rather than independently randomized.

| Data | Target |
| --- | --- |
| Orders | Exactly 150 |
| Service types | 100 dine-in, 30 study-room, 20 takeaway |
| Order states | 130 paid, 15 open, 5 cancelled |
| Sales history | 30 local calendar days ending at the reference date |
| Employees | 10, with three roles and some combined-role memberships |
| Menu | Six categories and approximately 30 food/drink items |
| Space | Three service areas, 24 dining tables, six study rooms |
| Artists | Eight solo artists/bands with distinct contacts |
| Programs | Approximately 12-16 special/recurring programs, including future bookings |
| Event bookings | Approximately 35, with corresponding attendance/check-in scenarios |
| Room bookings/rentals | Approximately 35 bookings; rentals support the 30 room orders and transfers |
| Cashier shifts | Two closed shifts per historical day and one current open shift |
| Expenses | All six source groups F and H1-H5 |
| Profit reports | Complete checked, provisional with missing data, and a genuinely zero-activity period |

Include inactive, unavailable, maintenance, and soft-deleted directory fixtures. Deleted/inactive directories must not be used for new active service; historical references remain intact. Session and verification-code tables stay empty: demo data must not create usable sessions or OTPs.

Use fictional Vietnamese-facing names and menu descriptions with reserved `.example` contact domains. Technical names and source codes remain those of the English schema.

## Business scenarios

- Normal dine-in, takeaway, and room orders, with varied quantities, preparation states, notes, and price snapshots.
- At least eight surcharge-only orders and ten room-only orders, included within the 150 total rather than added afterward.
- Room service with item charges; direct and advance-booked arrivals; extended rentals; two transfer examples that retain the same charge order across multiple rentals.
- Special-event reservations that are held, partially arrived, arrived, cancelled, or no-show; multiple arrival batches and direct attendance. Recurring events remain free of attendance/check-in/surcharge admission records.
- Cash and bank-transfer collections, pending transfer confirmation, and reconciliation-required transactions. Successful receipts are linked once to their transactions.
- Item cancellations and refund requests in pending, approved, rejected, failed, and completed states. Only completed refunds produce completed refund transactions and reduce collected cash/report amounts.
- Orders created in one shift and collected in another, with a consistent shift predecessor chain, opening adjustments, expected balances, counted cash, and a documented discrepancy example.
- Report lines preserving explicit missing/available/confirmed-zero states and the correct reviewer/check time requirements. The zero-activity report uses a period without seeded sales, not a period whose real sales are hidden.
- Business audit events with matching entity keys, actors, and actual occurrence times, including confirmations, completed refunds, room movements, and report creation/checking.

## Consistency rules

Build a single scenario graph and derive its monetary/time values. Do not independently randomize order totals, allocations, fees, refunds, and reports.

- Each order has the required service context; item preparation plus cancellation never exceeds ordered quantity.
- Order totals equal net item charges plus the distinct source fees/rental charges assigned to that order.
- Every allocation has exactly one source. Successful collection allocations match the collected components without collecting the same source twice.
- Refund requests refer to original collection allocations. Completed/refund-reserved amounts never exceed the remaining refundable amount. Refund transaction allocations, when present, retain the original source and are filtered by transaction kind.
- Cash tender is sufficient for cash collections and NULL for bank transactions/refunds. Cash-shift totals use successful cash collections and completed cash refunds only.
- Rental times and room bookings do not overlap improperly. Expected checkout follows check-in. Each rental keeps its own locked rate, minimum duration, rounding, and charge.
- Recurring batch weekdays are a distinct nonempty JSON array of allowed codes. Generated programs match the pattern/date range and the stored generated count.
- Event capacity, held places, actual arrivals, and per-arrival surcharges remain coherent. No departure-count feature is introduced.
- Program publication references that program's finalized/published schedule version; artist assignments agree with invitation responses and time intervals.
- Every checked report is reproducible from its source period and seeded expense entries. Missing inputs stay NULL; confirmed no activity is zero.

Interpret operational instants in UTC and generate business schedules/calendar boundaries in `Asia/Ho_Chi_Minh`. Preserve the selected TIMESTAMP range and integer-VND arithmetic.

## Determinism and repeat runs

Use fixed index-based scenario patterns and one reference date per dataset. Default the reference date to the current Vietnam date, allow an explicit date for reproducibility, and persist the chosen date/version in the seed marker. Re-running does not shift an existing dataset forward to a different date.

Proposed initial population policy:

1. First run requires an empty application dataset. Check this before writing; do not clear existing data or disable foreign-key checks.
2. Write the entire fixture graph and a versioned marker in `system_settings` in one transaction, in dependency order. Break program/schedule and order/rental cycles through their nullable pointers, then attach the final links.
3. A completed matching marker makes a repeated run a no-op with a brief summary. It does not overwrite manual edits or create another 150 orders.
4. A nonempty database without the expected marker, or an incompatible marker, produces an actionable refusal. No reset or destructive force option is included.
5. Failed population rolls back both fixtures and marker; no partial dataset is presented as complete.

This policy targets a freshly migrated demo/development database. Supporting an arbitrary populated database would require a separately designed ownership/merge strategy.

## Accounts and permissions

Seed the three existing role names and a documented permission-code map, using the specification's capability groups rather than claiming currently unimplemented endpoints exist. Employee role combinations should support future UI testing.

Passwords must be hashed, never stored as plaintext or printed by the script. Reuse a real authentication hashing helper if one exists by implementation time. The current repository has no authentication service or password format contract; otherwise use Node's built-in scrypt with a documented demo hash format. The user selected the fixed demo password `cafeinn@123`; no seed-password environment input is required. That provides stored demo identities, not a claim that login endpoints are implemented. Do not add a password-library dependency solely for seeding.

## Demo employee accounts

The user selected `cafeinn@123` as the shared demo password. Store a separately salted hash for each employee; do not store plaintext passwords in the database. These accounts are planned seed fixtures, not accounts already created on a database.

| Username | Roles | State |
| --- | --- | --- |
| admin | ADMIN | Active |
| event01 | EVENT_STAFF | Active |
| event02 | EVENT_STAFF | Active |
| sales01 | SALES_STAFF | Active |
| sales02 | SALES_STAFF | Active |
| sales03 | SALES_STAFF | Active |
| sales04 | SALES_STAFF | Inactive |
| sales05 | SALES_STAFF | Soft-deleted |
| event.sales | EVENT_STAFF, SALES_STAFF | Active |
| admin.sales | ADMIN, SALES_STAFF | Active |

Inactive/deleted employees can appear in historical data, but cannot be selected for new active operations. Authentication endpoints are not implemented by this seed task.

## Verification

Per the user’s correction, no test files or test-suite runs are required. Validate the actual generated graph before persistence and run schema validation, typecheck, lint, build, and a no-database dry-run. Type checking against the generated client verifies current fields and compound keys.

Document seed usage in one short README addition. Do not create a separate seed guide or replace existing README content.

Without separate permission to execute a seed against a real compatible database, report write/rollback/rerun behavior as unverified on MySQL. Do not silently use the shared database to obtain that evidence.

## Author review

Reviewed on 2026-11-12 against the current schema and user-requested scale. The design keeps exactly 150 orders, includes source-only orders and exceptional flows, uses the existing 39-model schema without inventing a seed table, and distinguishes offline fixture validation from live persistence evidence. The empty-first-run/no-op policy avoids both duplicate runs and destructive resets.

The user approved Phase 2 on 2026-11-12. The separate Phase 3 implementation plan defines files, package command, test boundaries, and execution order before code is written.
