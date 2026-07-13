# Cloudflare D1 via NuxtHub for the database

Sweepy needs a SQLite database with painless local development on Windows and a cheap, low-maintenance production home. We deploy to Cloudflare Workers with D1 as the production database, and integrate through NuxtHub v0.10 (`@nuxthub/core`) rather than wiring Drizzle + wrangler by hand. NuxtHub uses Drizzle ORM underneath (so the schema layer carries no extra lock-in), gives a file-based SQLite database in `.data/` for local dev with zero config, and auto-binds to D1 in production.

## Considered Options

- **Plain Drizzle + drizzle-kit + wrangler bindings** — more control, but duplicates local/remote migration commands and adds Windows-side friction. Rejected for DX.
- **Turso/libSQL on Vercel or Netlify** — viable, but adds a second vendor; Cloudflare keeps database and hosting in one account.
- **Self-hosted SQLite file** — simplest conceptually, but makes the household app's availability depend on a home machine.

## Consequences

- Production deploys use a single atomic pnpm script: build → apply D1 migrations → `wrangler deploy`. Cloudflare Workers Builds does **not** auto-apply D1 migrations, which is why the migration step lives in the deploy script. ADR 0009 adds GitHub Actions on `main` (and `workflow_dispatch`) invoking that same script; local `pnpm run deploy` remains valid for cutover and emergencies.
- Two environments only: local (`.data/` SQLite file, inspectable with any SQLite browser) and production (D1). No preview environment.
- Seeding local data is done via a `pnpm db:seed` script.
- Atomic multi-statement D1 writes use `db.batch()` rather than Drizzle transactions because D1 rejects SQL `BEGIN`. Parameterized raw `db.run(sql)` items must not be passed directly to a Drizzle D1 batch: [drizzle-orm#2277](https://github.com/drizzle-team/drizzle-orm/issues/2277) leaves those raw queries without the prepared statement its D1 batch driver expects and fails with `Cannot read properties of undefined (reading 'bind')`. Use a Drizzle query builder (including insert-from-select) as the batch item, or prepare a native D1 statement when a query builder cannot express the operation.
- Every Drizzle write on D1 must end with an explicit terminal method — `.returning()`, `.run()`, `.get()`, or `.all()` — not a bare `await db.insert|update|delete(...).where(...)`. Without a terminal method, production Workers can hang and Cloudflare returns Error 1101 (“script will never generate a response”); local libSQL often still settles, so API tests alone miss the failure. Unchecking a completion (`DELETE /api/completions`) hit this until the delete gained `.returning()`, matching assignment deletes.
- Local NuxtHub API tests run against libSQL and do not exercise Drizzle's D1 batch driver or the terminal-method hang. D1-specific write patterns therefore need a focused D1-driver regression test in addition to the normal API behavior tests.
