# Cloudflare D1 via NuxtHub for the database

Sweepy needs a SQLite database with painless local development on Windows and a cheap, low-maintenance production home. We deploy to Cloudflare Workers with D1 as the production database, and integrate through NuxtHub v0.10 (`@nuxthub/core`) rather than wiring Drizzle + wrangler by hand. NuxtHub uses Drizzle ORM underneath (so the schema layer carries no extra lock-in), gives a file-based SQLite database in `.data/` for local dev with zero config, and auto-binds to D1 in production.

## Considered Options

- **Plain Drizzle + drizzle-kit + wrangler bindings** — more control, but duplicates local/remote migration commands and adds Windows-side friction. Rejected for DX.
- **Turso/libSQL on Vercel or Netlify** — viable, but adds a second vendor; Cloudflare keeps database and hosting in one account.
- **Self-hosted SQLite file** — simplest conceptually, but makes the household app's availability depend on a home machine.

## Consequences

- Deploys are manual from the developer's machine via a single atomic pnpm script: build → apply D1 migrations → `wrangler deploy`. Cloudflare Workers Builds does **not** auto-apply D1 migrations, which is why the migration step lives in the deploy script.
- Two environments only: local (`.data/` SQLite file, inspectable with any SQLite browser) and production (D1). No preview environment.
- Seeding local data is done via a `pnpm db:seed` script.
