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

`pnpm dev` always uses local file SQLite. The D1 driver is enabled only when `pnpm deploy` runs (it sets `SWEEPY_DEPLOY=1`), so keeping the ID in `.env` is safe for day-to-day local work.

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
| `pnpm db:seed` | Load sample placeholder rows into the local database |

After changing the schema:

```powershell
pnpm db:generate
pnpm db:migrate
```

## Production deploy

One atomic command — build (with D1 bindings), apply D1 migrations, then deploy. If the database ID is missing or migrations fail, deploy does not run:

```powershell
# If not already in .env:
$env:CLOUDFLARE_D1_DATABASE_ID = "<database-id>"
pnpm deploy
```

## Verify the plumbing

### Local

```powershell
pnpm db:seed
# with the dev server running:
Invoke-RestMethod http://localhost:3000/api/placeholders
```

Expected: a JSON array of rows with `id`, `label`, and `createdAt` (e.g. labels `alpha`, `beta`, `gamma`).

### Production

After `pnpm deploy`, open the worker URL wrangler prints, then:

1. In the [Cloudflare D1 console](https://dash.cloudflare.com/), run:
   `INSERT INTO placeholders (label, created_at) VALUES ('prod-smoke', unixepoch() * 1000);`
2. Hit the endpoint:

```powershell
Invoke-RestMethod https://<your-worker>.workers.dev/api/placeholders
```

Expected: JSON including a row with `"label": "prod-smoke"`.

## Tests

```powershell
pnpm test
```

Exercises `GET /api/placeholders` end-to-end against the real local SQLite database.
