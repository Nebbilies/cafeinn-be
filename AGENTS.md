# CafeInn BE — Agent Guidelines

## Context and scope

CafeInn serves a single acoustic cafe, covering F&B/POS, events, and study rooms. This repository owns HTTP handling, business rules, and data access. The chosen stack is Node.js, Express, strict TypeScript, Prisma, MySQL, and npm.

The repository must work when cloned independently. The parent directory is the owner's local workspace; do not depend on `../docs/`, a neighboring frontend repository, or skills installed on a personal machine. Use the business specification supplied for the task. When requirements are missing or conflicting, identify the uncertainty before implementing dependent behavior.

## Architecture

- Use a modular monolith organized by business capability: `src/modules/<module>/`. `app.ts` composes the application; `server.ts` starts and shuts down the process.
- Within a module, routes attach endpoints and middleware; controllers adapt HTTP; schemas validate input; services own business rules and transaction scope; repositories contain Prisma queries or parameterized SQL.
- Services and repositories do not receive Express `req` or `res`. Controllers write data through services. Repositories participating in one transaction must use the same transaction context.
- Write repositories around actual business operations. Add an interface only when a seam is needed for testing or substitution. Do not introduce a generic CRUD layer merely to wrap Prisma.
- Other modules call the module's public functionality rather than its internal repositories. `src/common/` holds clearly shared code; `src/config/` and `src/database/` hold their respective configuration.
- Use `kebab-case` for files and directories, with consistent role suffixes: `.routes.ts`, `.controller.ts`, `.schema.ts`, `.service.ts`, `.repository.ts`, and `.test.ts`. Use `camelCase` for functions and `PascalCase` for types.
- Create layers and files when they have an actual responsibility. Liveness does not need service/repository layers without business logic or database queries.

## HTTP and data

- Preserve the agreed frontend/backend contract: endpoints, DTOs, error codes, and semantics. Flag breaking changes in advance and update the contract definition with the implementation.
- Validate untrusted input at the boundary using the selected schema library. Distinguish validation, authentication, and authorization; frontend checks do not replace backend authorization.
- Use appropriate HTTP statuses and stable error codes. Production errors must not expose stack traces, SQL, or connection details. Logs must not contain passwords, connection URLs, cookies, or tokens.
- The backend confirms monetary amounts, price snapshots, states, and permissions. Preserve numeric and time representations from the schema and contract; avoid precision loss or unilateral timezone changes.
- For payments/refunds, webhooks, room bookings, and concurrent changes, design transactions, idempotency, and database constraints. A separate check followed by a write does not establish concurrency safety.
- Configure allowed CORS origins. Add endpoint-specific limits or rate limiting when the implemented functionality requires them.

## Shared database and environment

- MySQL is a shared database managed by the team. Docker or a local database is not a scaffold requirement.
- Provide placeholder values in `.env.example`; `DATABASE_URL` is the canonical connection configuration. Do not maintain a duplicate host/user/password configuration alongside it.
- Keep real `.env` files out of Git. URL-encode credentials when necessary; configure TLS according to the provider and retain certificate verification.
- Access or modify the shared database only when authorized by the task. Do not use introspection, `db push`, migration, reset, or seeding to verify the scaffold.
- Do not invent business models merely to generate a client. Use compatible stable CLI/client/adapter versions and verify generation without database access against the actual version.
- Review real migrations and coordinate who applies them to the shared database. Preserve migration history; do not independently alter the shared schema to make checks pass.
- Build, typecheck, and liveness must work without a real database. Database/concurrency verification requires an authorized environment; report when it is unavailable.

## Working and verification

- Write all repository documentation in English, including `AGENTS.md`, README files, architecture/setup/API guides, and documentation examples. Conversation follows the user's language.
- Before adding code, check existing implementations, the standard library, native platform features, and installed dependencies. Add a dependency only for a concrete need.
- Read actual versions and scripts from `package.json` and the lockfile; retain npm and compatible stable releases. If the scaffold or script is missing, report the limitation rather than inventing commands or results.
- Test affected behavior through its contract. Separate app composition from listening and database dependencies so HTTP can be tested independently when appropriate.
- Mocks do not prove actual database constraints or concurrency behavior. Report checks performed, results, and anything not verified.
- Keep changes within scope, preserve other contributors' work, and flag conflicts before editing the same area.

