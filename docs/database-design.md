# Physical database design proposal

Status: Phase 2 approved by the user on 2026-11-11, including the timestamp coverage and seven-table soft-delete revision. Implementation requires approval of the separate Phase 3 plan.

## Purpose and baseline

Create the initial physical schema for CafeInn's existing Prisma/MySQL backend. The application serves one cafe, with food and beverage sales, acoustic events, study-room rentals, and cashier shifts.

The supplied final `ERD.drawio` is the structural baseline: 39 tables and 48 foreign keys. Its SHA-256 is `245289be1802d145dc7cf43cface2655e237175b2e808fb1d7e2ea25a36808a6`. The review also used the revised progress report 1 business specification and the decisions recorded below. This document contains the design decisions needed by an independent backend checkout; implementation and runtime must not depend on a neighboring documentation or frontend repository.

The current backend uses Prisma CLI, Client, and MariaDB adapter 7.10.1, the MariaDB Node.js driver 3.5.5, and a MySQL datasource. `prisma/schema.prisma` currently has no business models. There is no existing migration history in this repository.

## Agreed scope and decisions

| Subject | Agreed design |
| --- | --- |
| Database and ORM | Retain MySQL and the installed Prisma stack. |
| Destination | Prepare an initial migration for an empty application database/schema. |
| Authorization | Prepare local files for review. Applying migrations to the shared database is a separate action. |
| Names | English table, column, model, field, and enum names. |
| Soft delete | Add nullable `deleted_at` to employees, artists, menu categories/items, service areas, dining tables, and study rooms. |
| Recurring weekdays | A JSON array containing selected weekdays; no weekday child table. |
| Rental planning | Add an expected checkout instant to each room rental, including walk-ins and rentals created by room transfers. |
| Event departures | Do not add the proposed departed-guest count or a departure workflow in this task. |
| Cash adjustment | The opening cash adjustment is signed; it can add or remove cash relative to the previous shift's counted cash. |
| Time instants | MySQL `TIMESTAMP(3)`, with UTC database connections. |
| Business calendar | Reporting dates and recurring local dates/times use `Asia/Ho_Chi_Minh`. |
| Migration extras | SQL retains constraints and the original-order lookup view that Prisma schema language cannot fully express. |

The deliverable is a Prisma schema, reviewed initial SQL migration, a field catalog, and setup/verification documentation. Business APIs, authentication flows, recurring-event generation services, soft-delete/restore endpoints, seed data, database provisioning, and applying the migration are outside this task. The schema and documentation define the soft-delete contract for future services. Existing scaffold behavior must continue to work without a database connection.

The source drawio file is a review input. This task will document approved physical differences rather than silently overwrite that file.

## Options considered

### Recurring weekdays

The user selected JSON after considering native MySQL `SET`, a child table, seven Boolean columns, a bitmask, and an RRULE string.

Use `recurring_batches.weekdays`, represented by a Prisma `Json` field. The array contains one to seven distinct strings chosen from `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, and `SUN`. Example: `["MON", "WED", "FRI"]`.

This remains batch-generation configuration. The batch produces individual draft programs, which can subsequently be edited, cancelled, and published independently. It does not become a continuously synchronized recurrence engine.

A named SQL `CHECK` will use an inline JSON schema with `JSON_SCHEMA_VALID` to enforce array type, allowed values, length, and uniqueness. The eventual input boundary must enforce the same conditions. No unsafe cast from arbitrary JSON to a trusted weekday list is part of the design. Canonical Monday-to-Sunday ordering is an application convention, not a second stored representation.

The SQL requirement is MySQL 8.0.17 or later, including enforced CHECK constraints and JSON schema validation. This is a compatibility floor, not a recommendation to install an old release. The team's actual server version has not been verified and must be checked before application. A MariaDB driver does not make MariaDB the target database.

### Time storage

The user selected MySQL timestamps after clarification that MySQL has no `TIMESTAMP WITH TIME ZONE` type. Retain that choice. Do not migrate the project to PostgreSQL or substitute `DATETIME` without a new decision.

MySQL `TIMESTAMP` stores an instant through UTC conversion; it does not preserve the originally supplied time-zone name. Prisma uses `DateTime` with the native `Timestamp(3)` annotation for these fields.

**Range limitation:** MySQL timestamps cover approximately 1970 through 19 January 2038. This applies to both operational instants and scheduled program/booking instants in this proposal. A requirement for later scheduled dates would require reconsidering the selected physical type before implementation or in a subsequent migration.

## Naming and table catalog

Use plural `snake_case` SQL table names, `snake_case` SQL column names, singular `PascalCase` Prisma model names, and `camelCase` Prisma field names. Use Prisma `@map` and `@@map` for the two naming conventions. Translate symbolic enum values to English uppercase identifiers while preserving each source state and its meaning.

Surrogate primary keys become `id`. Foreign keys name the referenced entity and their role, for example `employee_id`, `created_in_shift_id`, and `room_charge_order_id`. Shared primary keys and composite primary keys remain shared/composite; they do not receive artificial surrogate keys.

| ERD table | SQL table | Prisma model |
| --- | --- | --- |
| NHAN_VIEN | employees | Employee |
| VAI_TRO | roles | Role |
| QUYEN | permissions | Permission |
| NHAN_VIEN_VAI_TRO | employee_roles | EmployeeRole |
| VAI_TRO_QUYEN | role_permissions | RolePermission |
| PHIEN_DANG_NHAP | auth_sessions | AuthSession |
| MA_XAC_THUC | verification_codes | VerificationCode |
| NHAT_KY | audit_logs | AuditLog |
| CAU_HINH_HE_THONG | system_settings | SystemSetting |
| DANH_MUC | menu_categories | MenuCategory |
| MON | menu_items | MenuItem |
| KHU_VUC | service_areas | ServiceArea |
| BAN | dining_tables | DiningTable |
| PHONG_HOC | study_rooms | StudyRoom |
| DAT_PHONG | room_bookings | RoomBooking |
| DAT_CHO_SU_KIEN | event_bookings | EventBooking |
| CHUONG_TRINH | programs | Program |
| SU_KIEN_DAC_BIET | special_events | SpecialEvent |
| DOT_TAO_DINH_KY | recurring_batches | RecurringBatch |
| PHIEN_BAN_LICH | schedule_versions | ScheduleVersion |
| MOC_CHUONG_TRINH | schedule_slots | ScheduleSlot |
| HO_SO_NGHE_SI | artists | Artist |
| LOI_MOI | artist_invitations | ArtistInvitation |
| PHAN_CONG | artist_assignments | ArtistAssignment |
| LUOT_THAM_GIA | event_attendances | EventAttendance |
| DOT_CHECK_IN | event_check_ins | EventCheckIn |
| KHOAN_PHU_THU | event_surcharges | EventSurcharge |
| LUOT_THUE_PHONG | room_rentals | RoomRental |
| DON_HANG | orders | Order |
| CHI_TIET_DON | order_items | OrderItem |
| GIAO_DICH | payment_transactions | PaymentTransaction |
| PHAN_BO_THU | payment_allocations | PaymentAllocation |
| BIEN_LAI | receipts | Receipt |
| YEU_CAU_HUY | item_cancellation_requests | ItemCancellationRequest |
| YEU_CAU_HOAN | refund_requests | RefundRequest |
| CA_QUAY | cashier_shifts | CashierShift |
| KHOAN_CHI_PHI | expense_entries | ExpenseEntry |
| BAO_CAO_LOI_NHUAN | profit_reports | ProfitReport |
| CHI_TIEU_BAO_CAO | profit_report_lines | ProfitReportLine |

Examples of column names to use consistently:

| Source meaning | SQL column | Prisma field |
| --- | --- | --- |
| ngay_tao | created_at | createdAt |
| gio_nhan / gio_tra on a rental | checked_in_at / checked_out_at | checkedInAt / checkedOutAt |
| Added expected rental checkout | expected_checkout_at | expectedCheckoutAt |
| gio_nhan_du_kien / gio_tra_du_kien on a booking | expected_checkin_at / expected_checkout_at | expectedCheckinAt / expectedCheckoutAt |
| Room rental's ma_don_tien_phong | room_charge_order_id | roomChargeOrderId |
| Order's ma_luot_thue | room_rental_id | roomRentalId |
| Cash shift's tien_bo_sung | opening_cash_adjustment | openingCashAdjustment |
| Transaction's tien_khach_dua | cash_tendered | cashTendered |
| Batch's cac_thu | weekdays | weekdays |
| Audit's khoa_doi_tuong | entity_key | entityKey |
| Audit's chi_tiet | details | details |

The implementation plan will identify the field catalog artifact. Implementation must account for every baseline field, nullable marker, primary key, unique key, and foreign key. English translation is not permission to merge business states or remove source relationships.

## Physical types and conventions

### Keys and text

- Preserve integer key widths, unsigned counters, composite keys, shared keys, and nullability from the baseline except for the approved differences below.
- `auth_sessions.id` uses an application-generated UUID stored as `CHAR(36)`. This is the physical MySQL representation of the ERD UUID, not a new business key.
- Preserve source `VARCHAR` and `CHAR` lengths, `TEXT`, and JSON columns. Do not accept Prisma's default string length where the ERD specifies another length.
- Retain the audit-log `BIGINT` key. Future HTTP boundaries must serialize a BigInt identifier explicitly rather than pass a native BigInt to JSON serialization.
- Use InnoDB and `utf8mb4`. Use the existing Prisma migration convention `utf8mb4_unicode_ci` for ordinary text. Use case-sensitive binary comparison for opaque token/code identifiers where equality must be exact. Email and login normalization must be handled consistently with their unique indexes when authentication is implemented.
- Preserve source uniqueness, including employee email/login, menu-category name, room/table code, artist email, invitation tokens, bank transaction reference, one receipt per transaction, and the composite membership keys.
- Translate the three role values to `ADMIN`, `EVENT_STAFF`, and `SALES_STAFF`; `SALES_STAFF` still covers the source cashier/service/preparation responsibilities. This does not add or seed any roles in this task.
- Use source auto-increment defaults for surrogate integer IDs and an application UUID default for session IDs. Creation/audit timestamps can default to `CURRENT_TIMESTAMP(3)`; deadlines, scheduled times, and later business events are supplied explicitly. Prepared/cancelled counters and the opening cash adjustment start at zero. Do not introduce zero defaults for prices, transaction amounts, report amounts, or required customer input to hide missing data.

### Money and counters

- Money remains integer VND, with the ERD's unsigned integer columns and price snapshots. Do not use floating-point database fields or convert amounts to thousands of VND.
- `opening_cash_adjustment` is signed `INT`. Opening cash remains the preceding shift's counted cash plus this adjustment. Do not add a new cash-movement ledger.
- A signed adjustment must not make opening cash negative; this is checked by the shift-opening transaction because the preceding balance is in another row.
- Existing `INT UNSIGNED` monetary fields retain their maximum of 4,294,967,295 VND per stored value, including report line values. Do not silently widen only selected fields. A future requirement above that limit needs a consistent schema and API number policy.
- Preserve nullable amount semantics. A missing report amount is not a confirmed zero.

### Time and calendar values

- Replace baseline `DATETIME` instants with `TIMESTAMP(3)`. Do not add implicit `ON UPDATE CURRENT_TIMESTAMP` behavior to business timestamps.
- Keep baseline `DATE` columns as dates: batch boundaries, expense occurrence dates, and report boundaries are local calendar dates.
- Keep baseline `TIME` columns as local wall-clock values for recurring batch start/end times. A recurring time such as 19:00 is interpreted in `Asia/Ho_Chi_Minh`, not as a free-standing UTC instant.
- Configure both driver conversion and every pooled database session for UTC. A driver parsing option alone is not proof that `@@session.time_zone` is UTC.
- Continue deriving connection credentials and transport settings from the single `DATABASE_URL`. Preserve provider TLS settings and certificate verification while adding UTC settings. Do not introduce duplicate connection variables.
- An instant crossing the HTTP boundary must have a `Z` suffix or explicit numeric offset. Date-only and time-only values need their own contracts when those APIs are implemented; they must not accidentally shift a day through JavaScript Date conversion.
- Reporting periods are inclusive local date ranges. Translate them to a start instant and an exclusive start-of-next-day end instant for timestamp queries.

### Record timestamps and soft delete

The user approved soft delete for these seven tables and subsequently approved the complete revised proposal, including creation/update timestamp coverage. These columns are approved physical additions, not a claim that they all already appear in the source ERD.

| Table | created_at | updated_at | deleted_at |
| --- | --- | --- | --- |
| employees | Required | Required | Nullable |
| artists | Required | Required | Nullable |
| menu_categories | Required | Required | Nullable |
| menu_items | Required | Required | Nullable |
| service_areas | Required | Required | Nullable |
| dining_tables | Required | Required | Nullable |
| study_rooms | Required | Required | Nullable |

Approved timestamp coverage across the 39 tables:

- `created_at`: all 39 tables. Eleven source tables already contain `ngay_tao`, which is renamed rather than duplicated; add the metadata field to the remaining 28. Preserve separately named business instants such as shift opening or rental check-in.
- `updated_at`: 32 mutable tables. Exclude `audit_logs`, `receipts`, `event_check_ins`, `payment_allocations`, `item_cancellation_requests`, `employee_roles`, and `role_permissions`. Their records represent append-only facts or membership links; a permitted membership change removes/adds a link, and a permitted correction of an immutable fact has its own business/audit operation. This exclusion is the approved mutation policy for this design.
- `deleted_at`: only the seven tables above. Use nullable `TIMESTAMP(3)` with a NULL default and no automatic update behavior.

Creation/update metadata is distinct from audit history. It records when a row was created and last changed, but not who changed it or which values changed. Preserve the existing audit log and all original business instants.

Use Prisma-managed update timestamps for the 32 mutable models. Initialize the value at creation and update it when the row changes, including a soft delete or restore. `@updatedAt` is an ORM behavior, not a MySQL trigger: future raw-SQL writes must explicitly maintain `updated_at` in the same statement. Do not enable automatic updates on unrelated business timestamps. Migration constraints and the read-only source lookup view do not themselves perform such writes.

#### Soft-delete behavior

- `deleted_at IS NULL` identifies a record that has not been soft-deleted. Set the timestamp to soft-delete a record; clearing it is a restore. Preserve the primary key and all dependent business records.
- Normal directory, availability, and new-operation lookups exclude deleted records. Historical order, payment, rental, event, and audit reads can still resolve them. Do not apply a global relation filter that makes historical references disappear.
- Deleted employees cannot authenticate or initiate new operations. A deleted item, artist, area, table, or room cannot be selected for a new operation. Existing business statuses remain meaningful independently of deletion.
- Restore clears only the deletion marker and records the action. It does not automatically change an employee's employment status, reopen a room under maintenance, put an unavailable item on sale, or override the corresponding business rules.
- Do not cascade soft deletes to child directories or transactions. A directory deletion that would leave an unresolved active dependency must first follow that module's handling rules. For example, do not hide a menu category with selectable live items or a room with unresolved ongoing/future usage without resolving those dependencies.
- Existing foreign-key `Restrict` actions remain in place. They protect against physical deletion; they do not automatically prevent soft deletion, which is an UPDATE. Future services must check soft-delete eligibility transactionally with the change.
- A record's deletion and restoration are recorded through the existing audit mechanism. Give them explicit named actions and timestamp changes in their payloads; do not emit the existing hard-deletion action for a row that remains present. The implementation plan will enumerate the two audit action additions, `RECORD_SOFT_DELETED` and `RECORD_RESTORED`, and their translated entity/key fields. No additional audit table or departure workflow is needed.

#### Uniqueness and restoration policy

Retain existing unique constraints across both live and deleted rows. A soft-deleted employee's email/login, artist email, menu-category name, room code, and table code remain reserved. Reuse the original record through an authorized restore or explicit correction instead of silently creating a second identity with the same unique key. The user approved this policy with the revised proposal.

This policy preserves the ERD's unique-key semantics and straightforward restoration. It does not require generated active-only key columns or a different unique index. In particular, do not change the constraints mechanically to `UNIQUE(value, deleted_at)`: MySQL permits multiple NULLs in unique indexes, so that shape would not enforce unique values among live rows.

If the team later requires reusing a deleted record's unique value, that is a separate policy change requiring active-only uniqueness and restoration conflict handling. Do not remove existing unique constraints to make an insert or restore succeed.

## Relationships and source tracing

### Orders and rentals

- An order has zero or more order items. Fee-only and room-only orders remain valid.
- Keep both distinct order/rental relationships: the rental currently associated with service on an order, and the order that owns each rental's room charge. Give the Prisma relationships distinct names.
- `room_rentals.room_charge_order_id` remains nullable and non-unique. One order can own multiple rental charges after a room transfer.
- `room_rentals.room_booking_id` remains nullable and non-unique. A room transfer may create multiple rentals under one booking.
- Add required `room_rentals.expected_checkout_at`, strictly later than `checked_in_at`. Set it when creating every rental. An advance booking supplies the initial planned value if it still forms a valid interval; an expired planned end must be resolved before rental creation. A walk-in or transfer supplies its own value. A subsequent extension updates this value and logs its old/new values. Actual checkout remains a separate nullable instant.
- A transfer ends the old rental and creates a new rental, retaining individual room, actual times, price snapshots, and charge amounts. The room-movement audit payload retains old/new rental IDs and the shared order ID.
- A currently occupied room is not made vacant by payment or passage of the expected checkout time. Do not introduce a separate readiness state beyond the agreed scope.

### Payment sources and refunds

- Preserve `payment_allocations` with exactly one of `order_id`, `event_surcharge_id`, or `room_rental_id`. Use real foreign keys and an exclusive-source SQL CHECK; do not replace them with an unconstrained generic entity ID.
- The direct order allocation represents the item-money source. Fee and room allocations represent their respective sources. An order's total may contain all three components; summation must not count the full order total again alongside separate fee/room allocations.
- A surcharge's owning order and a rental charge's owning order supply the original order for indirect allocations, including cash collections and orders without items.
- Create `v_payment_allocation_orders` in the initial SQL migration. It returns the allocation ID, transaction ID, source kind, original order ID, and allocated amount using left joins and `COALESCE(order_id, surcharge.order_id, rental.room_charge_order_id)`. Keep transaction kind/status available for consumers to filter collection versus refund results correctly.
- The view does not repair unassigned source records or enforce business transitions. Assign the owning order before confirming a collection, then retain that source link for historical lookups and refunds.
- Preserve refund requests linked to original allocations, the reviewer, and the resulting refund transaction. Approval and execution remain distinct states.
- A transaction's `created_at` records creation of the request/document. It must not be used as a substitute for a later bank-confirmation or refund-completion instant. Operational collection/refund reports use the corresponding confirmation/completion audit actions under the baseline design. Adding directly indexed settlement timestamps would be a separately documented schema change, not an implicit reinterpretation of `created_at`.

### Schedule publication and audit history

- Preserve the program/special-event shared primary key and the distinction between schedule finalization and publication.
- Preserve the cycle between a program's published schedule version and schedule versions belonging to that program. Add foreign keys after the required tables exist; do not weaken the relationships or disable foreign-key checking to avoid creation ordering.
- Preserve the order/rental cycle in the same way. Business writes can create the initially nullable side and then attach the dependent record within a transaction.
- Keep audit actor optional. Entity type, entity-key JSON, and action-specific details preserve history without adding foreign keys from audit targets to every business table.
- Use the action catalog and payload meanings supplied on ERD page 05, including `ROOM_MOVED`, `ROOM_EXTENDED`, surcharge assignment, and report actions. Translate entity/key identifiers consistently in JSON as part of the field catalog.
- Audit logs are append-only at the application boundary. Without triggers or database grants applied by an administrator, the schema alone does not enforce append-only behavior.

## Constraints, indexes, and mutation policy

Use Prisma schema language for tables, native types, enums, keys, foreign keys, uniqueness, and indexes. Add named SQL CHECK constraints and the lookup view explicitly to the migration. MySQL can accept a CHECK expression that evaluates to UNKNOWN, so nullable branches must be intentional.

| Constraint | Physical behavior |
| --- | --- |
| Order service context | Dine-in requires a table and no rental; room service requires a rental and no table; takeaway has neither. |
| Order-item quantities | Prepared plus cancelled quantity must not exceed ordered quantity. |
| Allocation source | Exactly one source foreign key is non-null. |
| Walk-in contacts | An attendance/rental without a booking must have both representative name and phone. |
| Rental times | Expected checkout must follow actual check-in. Actual checkout, if present, must follow actual check-in, preserving the ERD condition. |
| Payment tender | A cash collection requires non-null `cash_tendered` at least equal to the amount. Bank transactions and refunds require `cash_tendered IS NULL`. Express these branches explicitly rather than rely on NULL making the source CHECK pass. |
| Profit-report period | Start date must not follow end date. |
| Checked report | A checked report requires the reviewer and checked-at instant. |
| Report-line completeness | Available data requires an amount; confirmed no activity requires an explicit zero; missing data requires NULL. |
| Recurring weekdays | A non-null JSON array of one to seven distinct allowed weekday strings. |

The tender rule is a physical clarification of the source CHECK: `payment_transactions` also stores refunds, so its cash-tender condition must apply to cash collections rather than demand customer tender for a payout.

Use `Restrict` for delete and update actions on business foreign keys. IDs are immutable; referenced business history is retained. Remove memberships explicitly when the corresponding use case permits it. Deleting expired sessions or verification codes does not require cascading through business history. In particular, do not inherit Prisma's update-cascade default on foreign-key columns also used in CHECK constraints. SQL emission must be reviewed against MySQL's CHECK/foreign-key restrictions before the migration can be considered executable.

Preserve all 48 baseline foreign keys and their optionality. Declare foreign-key indexes explicitly where not covered by an existing leading primary/unique/index key. Add a small set of indexes for the documented reads: room/date booking lookup, attendance by event, pending orders by shift/status, transactions by successful-state/time and shift, expenses by occurrence date, audit entities/actions by time, and expired authentication records. Do not speculate about indexes for unimplemented search screens.

### Rules owned by future service transactions

These rules are part of the business design, but a local schema validation cannot prove them:

- Atomic room availability checks and booking/rental creation or extension.
- Event capacity and duplicate check-in handling.
- One open cashier shift and one open service order for the relevant table/rental.
- Consistent program ownership of the published schedule version and invitation/assignment context.
- Consistent ownership of fee and rental sources, including immutable original-order links after collection.
- Payment/webhook idempotency, exact bank reconciliation, and allocation totals matching the transaction.
- Refund approval, reservation of refundable amounts, and at-most-once execution.
- Exactly one recognition of each source charge; report versions remaining unchanged after checking.
- Soft-delete eligibility, excluded directory records in new operations/authentication, explicit restoration, and dependency handling without hiding historical sources.

Services must use a shared transaction context and appropriate locking/idempotency when those workflows are built. This schema task must not claim to implement those workflows or their concurrency guarantees.

## Profit report snapshots

Retain report metadata and the line-level snapshot representation from the final ERD. Persist the source codes A, B, C, D, F, and H1 through H5 without translating those business report codes. Derived E, G, H, I, and J remain calculated, including undefined margin when E is zero.

Each line retains its available/missing/confirmed-zero status. Reports can preserve missing-data notes and the reviewer/check time. Changing source data does not mutate an already checked snapshot. New versions are created through the later reporting service. Do not expand this task into inventory, ingredient costing, VAT, or a new accounting subsystem.

## Migration and verification approach

The initial migration is a reviewed SQL artifact, not a database operation performed during preparation. Generate baseline DDL from the Prisma schema using the installed CLI's offline diff from an empty schema; then retain explicit CHECK/view SQL in the migration. Include a MySQL migration lock file. Do not use `migrate dev --create-only` as an assumed offline command: development migration workflows can require database/shadow access.

Use explicit names for important constraints and short, stable identifiers within MySQL limits. CHECK names must be unique across the schema. Review table ordering, cyclic foreign keys, source uniqueness, nullable behavior, enum translations, and timestamp annotations against the field catalog.

The verification plan will distinguish:

1. Local checks: Prisma schema validation, client generation, TypeScript, lint, build, and the existing HTTP tests. These can run without shared DB credentials.
2. Migration review: compare the schema, generated DDL, manual SQL additions, and ERD field catalog. Verify the approved 39 creation timestamps, 32 update timestamps, seven nullable deletion timestamps, and unchanged unique constraints. A diff generated from the Prisma schema cannot independently prove CHECK/view coverage.
3. Database checks, only in a separately authorized environment: apply the migration to an empty MySQL database, test meaningful valid/invalid inserts, verify view source tracing and UTC sessions, inspect constraints/indexes, and confirm that marking a directory row deleted preserves its dependent history and reserved unique keys. No successful local tool output substitutes for this evidence. Endpoint-level visibility and restoration checks belong to the later service implementation.

Retain the current lazy database initialization and database-independent liveness. Use the already installed compatible Node 26 runtime for repository commands. Add no dependencies for this task unless a specific capability is proved missing.

## Approval boundary and known limits

Approval of this proposal allows preparation of a separate Phase 3 implementation plan. Implementation starts only after that plan is approved. No commit, migration application, seeding, reset, or shared database access is authorized by approving this design.

The shared server version/provider, actual SQL-mode behavior, actual schema emptiness, TLS setup, CHECK execution, and connection/session timezone have not been observed on a database. They remain deployment checks, not claimed facts. This proposal targets MySQL 8.0.17+ semantics and the user-selected TIMESTAMP range.

## Author review

Author review completed on 2026-11-11. The proposal was checked against the supplied ERD and the agreed discussion decisions.

- All 39 source tables have distinct English SQL/model mappings.
- The two room-transfer foreign keys remain non-unique, preserving multiple rentals under one order/booking.
- The approved additional expected checkout, signed cash adjustment, JSON weekdays, and MySQL/UTC timestamp choice are explicit.
- The declined departure-count addition is excluded.
- The seven-table soft-delete scope is explicit. Approved metadata coverage is 39 creation timestamps and 32 update timestamps; unique-key reservation and restore/dependency behavior are defined.
- All baseline relationships are retained; SQL-only features and nullable-CHECK behavior have a defined verification path.
- Framework approval gates, local-only preparation, repository independence, and the lack of real database verification are explicit.

The author review concerns design consistency. The user subsequently approved Phase 2 on 2026-11-11. Neither review establishes that the future migration has executed successfully.

## Technical references

- [Prisma v7 MySQL connector](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql)
- [Prisma v7 JSON fields](https://www.prisma.io/docs/orm/v7/prisma-client/special-fields-and-types/working-with-json-fields)
- [Prisma migrations for unsupported database features](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/unsupported-database-features)
- [MySQL CHECK constraints and NULL/foreign-key restrictions](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)
- [MySQL JSON schema validation](https://dev.mysql.com/doc/refman/8.4/en/json-validation-functions.html)
- [MySQL timestamp range and timezone conversion](https://dev.mysql.com/doc/refman/8.4/en/datetime.html)
- [MariaDB Node.js connector options](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options)
- [Prisma updatedAt behavior](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference#updatedat)
- [MySQL unique indexes and NULL](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)
