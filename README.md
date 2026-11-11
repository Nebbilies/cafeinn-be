# CafeInn Backend

Express and strict TypeScript foundation for a single acoustic cafe: F&B/POS, events, and study rooms.

## Requirements

- Node.js **26.13.0 LTS** (supported range: `^26.13.0`).
- npm **11.20.0** or a compatible newer npm 11 release.

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

Percent-encode special characters in credentials. Configure TLS and any private CA according to the shared database provider; retain certificate verification. CLI and runtime adapter TLS options must both be checked against the selected provider and driver. Do not copy legacy connector parameters without confirming adapter support.

The CLI has a non-routable placeholder for local validation/generation only. Runtime access rejects a missing/invalid URL and creates Prisma lazily. The HTTP app never initializes Prisma for liveness. No database connection, schema introspection, migration, reset, seed, or provisioning is part of this scaffold.

The schema deliberately contains no business models. Design the real schema with the team first. Assign an owner to review and apply migrations to the shared database; individual contributors must not independently mutate shared schema to run checks.

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

Tests cover liveness, JSON 404, CORS headers, and safe error responses. They do not prove shared database connectivity, database constraints, authentication, booking concurrency, or payment behavior.
