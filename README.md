# Sweepy

Household chore tracker and organizer.

## Stack

- [Nuxt 4](https://nuxt.com/) (TypeScript)
- [NuxtHub](https://hub.nuxt.com/) + [Drizzle ORM](https://orm.drizzle.team/)
- Local SQLite (`.data/db/sqlite.db`) / production [Cloudflare D1](https://developers.cloudflare.com/d1/)

## Setup

```powershell
pnpm install
```

### One-time Cloudflare provisioning (production)

Do this once per machine/account before the first production deploy:

1. Log in to Cloudflare:

```powershell
pnpm exec wrangler login
```

2. Create the D1 database:

```powershell
pnpm exec wrangler d1 create sweepy
```

3. Save the printed `database_id` for deploys (PowerShell session, or `.env` — never commit secrets):

```powershell
$env:CLOUDFLARE_D1_DATABASE_ID = "<database-id-from-wrangler>"
```

Or in `.env`:

```env
CLOUDFLARE_D1_DATABASE_ID=<database-id-from-wrangler>
```

`pnpm dev` always uses local file SQLite. The D1 driver is enabled only when `pnpm run deploy` runs (it sets `SWEEPY_DEPLOY=1`), so keeping the ID in `.env` is safe for day-to-day local work.

## Local development

```powershell
pnpm dev
```

NuxtHub creates `.data/db/sqlite.db` automatically and applies migrations on startup. Open that file in any SQLite browser (e.g. Beekeeper Studio) to inspect data.

### Database scripts

| Script | Purpose |
| --- | --- |
| `pnpm db:generate` | Generate SQL migrations from `server/db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations to the local database |
| `pnpm db:seed` | Wipe local tables and load a fresh development chore set |

After changing the schema:

```powershell
pnpm db:generate
pnpm db:migrate
```

## Production deploy

One atomic command — build (with D1 bindings), apply D1 migrations, then deploy the Worker named `sweepy`. If the database ID is missing or migrations fail, deploy does not run:

```powershell
# If not already in .env:
$env:CLOUDFLARE_D1_DATABASE_ID = "<database-id>"
# Must be `pnpm run deploy` — bare `pnpm deploy` is a reserved pnpm command.
pnpm run deploy
```

Local interactive runs still prompt before applying remote D1 migrations. In GitHub Actions (non-interactive / `CI=true`), Wrangler skips that confirmation; the same script aborts the job if migrations fail.

### GitHub Actions (unattended)

After CI tests pass on `main`, Actions runs `pnpm run deploy` (also triggerable via **workflow_dispatch**). Pull requests never deploy. Required **repository secrets**:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token scoped to Workers + D1 (not an unbounded account key) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |
| `CLOUDFLARE_D1_DATABASE_ID` | Production D1 database id |

Runtime config such as `NUXT_HOUSEHOLD_TIMEZONE` stays a **Worker secret** (not a GitHub secret):

```powershell
pnpm exec wrangler secret put NUXT_HOUSEHOLD_TIMEZONE --name sweepy
```

Do not auto-seed production chores as part of deploy — seeding remains a conscious local action (`pnpm db:seed` against local SQLite only).

**First-time cutover** (pin `sweepy`, set secrets, smoke-check, enable Actions, retire the old Worker): see [`docs/checklists/production-cutover.md`](docs/checklists/production-cutover.md). Decision record: [ADR 0009](docs/adr/0009-ci-deploy-atomic-d1-migrations.md).

## Verify the plumbing

### Local

```powershell
pnpm db:seed
# with the dev server running:
Invoke-RestMethod http://localhost:3000/api/placeholders
```

Expected: a JSON array of rows with `id`, `label`, and `createdAt` (e.g. labels `alpha`, `beta`, `gamma`).

### Production

After `pnpm run deploy` (Worker `sweepy`), open `https://sweepy.<account>.workers.dev`, then:

1. In the [Cloudflare D1 console](https://dash.cloudflare.com/), run:
   `INSERT INTO placeholders (label, created_at) VALUES ('prod-smoke', unixepoch() * 1000);`
2. Hit the endpoint:

```powershell
Invoke-RestMethod https://sweepy.<account>.workers.dev/api/placeholders
```

Expected: JSON including a row with `"label": "prod-smoke"`.

## Tests

```powershell
pnpm test
```

Runs unit tests, one consolidated API `$fetch` suite, and WebKit browser e2e (ADR 0007) against an isolated SQLite file under `.data/test/` (not the `.data/db/sqlite.db` used by `pnpm dev`). CI installs Playwright WebKit only — locally run `pnpm exec playwright install webkit` if browser suites fail to launch.
