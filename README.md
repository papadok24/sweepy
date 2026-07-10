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

3. Copy the printed `database_id` into your environment before building/deploying (PowerShell session or a local `.env` — never commit secrets):

```powershell
$env:CLOUDFLARE_D1_DATABASE_ID = "<database-id-from-wrangler>"
```

Or add to `.env`:

```env
CLOUDFLARE_D1_DATABASE_ID=<database-id-from-wrangler>
```

Without that variable, NuxtHub uses local file SQLite. With it set, the D1 driver and binding are enabled for production builds.

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

One atomic command — build, apply D1 migrations, then deploy. If migrations fail, deploy does not run:

```powershell
$env:CLOUDFLARE_D1_DATABASE_ID = "<database-id>"
pnpm deploy
```

## Verify the plumbing

Placeholder table + API (not the real chore model):

```powershell
pnpm db:seed
# with the dev server running:
Invoke-RestMethod http://localhost:3000/api/placeholders
```

On production, hit `https://<your-worker>/api/placeholders` after deploy (seed is local-only; use the D1 console to insert rows for a production smoke check).

## Tests

```powershell
pnpm test
```

Exercises `GET /api/placeholders` end-to-end against the real local SQLite database.
