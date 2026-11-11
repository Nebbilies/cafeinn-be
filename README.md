# CafeInn Backend

Express and strict TypeScript foundation for a single acoustic cafe: F&B/POS, events, and study rooms.

## Requirements

- Node.js **26.13.0 LTS** (supported range: `^26.13.0`).
- npm **11.20.0** or a compatible newer npm 11 release.
- Applying the database schema requires **MySQL 8.0.17+** with enforced CHECKs and JSON schema validation. The actual team server version must be verified before application.

Check `node --version` and `npm --version` in the terminal that will run the project. `.node-version` documents the target; a version manager such as Volta may still select a different installed runtime.

## Install and run

```sh
npm ci
npm run db:generate
npm run dev
```

The API listens on port 4000 by default. Database credentials are not required for startup or liveness. No `.env` file is created automatically. If configuration is needed, copy `.env.example` to `.env` and replace its placeholder values; real environment files are ignored by Git.

Production:

```sh
npm run build
npm start
```

Development executes erasable TypeScript natively through Node. Production executes compiled ESM JavaScript from `dist/`. Use `import type` and explicit relative `.ts` imports in source; the compiler rewrites extensions for production.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with native watch mode. |
| `npm start` | Run the compiled server. |
| `npm run build` | Generate Prisma Client, then compile the application. |
| `npm run typecheck` | Check application, tests, and Prisma configuration without emitting code. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run real loopback HTTP tests through Node's test runner. |
| `npm run db:validate` | Validate the local Prisma schema. |
| `npm run db:generate` | Generate the local client without connecting to the database. |

Generate the Prisma Client before type checking a fresh checkout. Generated code, build outputs, and dependencies are not tracked.

## Environment

| Variable | Default or requirement |
| --- | --- |
| `NODE_ENV` | `development`; also accepts `test` or `production`. |
| `PORT` | `4000`. |
| `CORS_ORIGIN` | `http://localhost:3000`; one HTTP(S) origin without credentials, query, or a path. |
| `LOG_LEVEL` | `info`; supports Pino levels and `silent`. |
| `DATABASE_URL` | Optional for startup/liveness; required when database access is explicitly requested. |

`DATABASE_URL` is the single source for connection configuration:

```text
mysql://USER:PASSWORD@HOST:3306/DATABASE
```

`.env.example` also lists `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` as reference components for composing that URL. Runtime and Prisma read `DATABASE_URL`, not those individual values. The native environment loader does not interpolate variables; update the complete URL when changing the components. `DB_PORT` is the MySQL port, separate from the API's `PORT`.

Percent-encode special characters in credentials. Configure TLS and any private CA according to the shared database provider; retain certificate verification. CLI and runtime adapter TLS options must both be checked against the selected provider and driver. Do not copy legacy connector parameters without confirming adapter support.

The CLI has a non-routable placeholder for local validation/generation only. Runtime access rejects a missing/invalid URL and creates Prisma lazily. The HTTP app never initializes Prisma for liveness. No database connection, schema introspection, migration, reset, seed, or provisioning is part of this scaffold.

The physical schema contains 39 business models and retains the ERD's 48 foreign keys. Its English names, JSON weekdays, timestamp conventions, metadata, and soft-delete scope follow the approved [database design](docs/database-design.md). See the [field catalog](docs/database-field-catalog.md) for every column, enum translation, and approved difference from the source ERD.

## Database conventions

- Money is integer VND. Preserve unsigned monetary values and signed opening cash adjustments. A missing report amount is different from confirmed zero.
- Instants use `TIMESTAMP(3)`. Runtime options enforce UTC for driver conversion and connection initialization; reporting/calendar rules use `Asia/Ho_Chi_Minh`. MySQL TIMESTAMP ends in January 2038. Local `DATE` and recurring `TIME` values are separate from instants.
- Connection options come from `DATABASE_URL`. Driver-native JSON options such as `ssl` must be URL-encoded, with certificate verification enabled. UTC overrides URL timezone settings. Runtime driver options and Prisma CLI TLS parameters differ; the database owner must verify both against the actual provider. No provider TLS handshake has been verified by local option tests.
- Every table has creation metadata; 32 mutable tables have Prisma-managed update metadata. Raw SQL writers must explicitly maintain `updated_at` themselves.
- Soft deletion is limited to employees, artists, menu categories/items, service areas, tables, and rooms. Their unique values remain reserved after deletion. Restore the existing record to reuse them. Normal selection/authentication must exclude deleted records; historical reads must retain their references. These are contracts for future services, not implemented delete/restore APIs.
- `v_payment_allocation_orders` resolves direct item-money, surcharge, and room-rental allocations to their original order. Consumers must filter transaction kind/status and must not double-count full order totals with separate source components. Collection/refund reporting uses actual confirmation/completion events, not the creation time of a pending payment request.

## HTTP contract

`GET /api/v1/health` returns HTTP 200:

```json
{ "status": "ok", "service": "cafeinn-be" }
```

This confirms API liveness, not database readiness.

Unknown routes return HTTP 404:

```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found." } }
```

Unexpected errors return HTTP 500 with a generic `INTERNAL_ERROR` message. Internal exception details are not returned. CORS permits the configured frontend origin; it does not authenticate callers.

## Structure and verification limits

- `src/app.ts`: app composition without listening or database access.
- `src/server.ts`: startup, safe lifecycle logging, and shutdown.
- `src/modules/`: business capabilities; the initial health route is intentionally small.
- `src/common/`: error handling and shared infrastructure.
- `src/config/`: environment loading and validation.
- `src/database/`: lazy Prisma access; generated client lives in ignored `src/generated/prisma/`.
- `tests/`: public HTTP behavior, including a separate error fixture.

Future business modules use routes, controllers, schemas, services, and business-specific repositories when each layer has actual work. See [AGENTS.md](AGENTS.md).

## Migration workflow

### Create a new migration

Set `DATABASE_URL` in `.env`, pointing to a development MySQL database with shadow-database support. Update `prisma/schema.prisma`, then run:

```sh
npm ci
npm run db:validate
npx prisma migrate dev --name describe_change --create-only
```

Replace `describe_change` with the change name. Review `prisma/migrations/<timestamp>_describe_change/migration.sql`; add any required CHECK, VIEW, or collation SQL before applying.

### Apply on development

```sh
npx prisma migrate dev
npm run db:generate
```

### Apply reviewed migrations on the shared database

Set `DATABASE_URL` to the intended target, then run:

```sh
npx prisma migrate deploy
npm run db:generate
```

Coordinate shared-database application with the migration owner. Do not edit migrations that have already been applied.
