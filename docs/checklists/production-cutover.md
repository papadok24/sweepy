# Production cutover to Worker `sweepy` + GitHub Actions

One-time human checklist before Actions owns production (ADR 0009). Do **not** run `pnpm db:seed` against production as part of this flow.

## 1. Ship Worker `sweepy` locally

```powershell
# CLOUDFLARE_D1_DATABASE_ID from `.env` or the session
pnpm run deploy
```

Confirm wrangler reports Worker name `sweepy` (URL like `https://sweepy.<account>.workers.dev`).

## 2. Set runtime Worker secrets

Household timezone (ADR 0008) and any future runtime secrets stay on Cloudflare, not in GitHub Actions:

```powershell
pnpm exec wrangler secret put NUXT_HOUSEHOLD_TIMEZONE --name sweepy
```

(Use the IANA zone the household already relies on, e.g. `America/Chicago`.)

Re-apply this secret on the new Worker name even if production D1 already has a household settings row: if that row is missing on first boot of `sweepy`, seeding comes only from `NUXT_HOUSEHOLD_TIMEZONE`. When a settings row already exists, the DB wins (ADR 0008) — the secret is still required insurance for an empty settings table.
## 3. Smoke-check

1. Open `https://sweepy.<account>.workers.dev` — board loads.
2. Confirm Week / today still match the household timezone (or hit `GET /api/week` and check `todayDayOfWeek` / week identity).
3. Completions and Assignments from the shared D1 should still be present (same database id as before).
4. Check a chore, then uncheck it — both must stick after refresh (D1 deletes need a Drizzle terminal method; ADR 0001).

## 4. Add GitHub repository secrets

In the repo **Settings → Secrets and variables → Actions**, add:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token scoped to Workers edit + D1 edit (not an unbounded account key) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |
| `CLOUDFLARE_D1_DATABASE_ID` | Same D1 id used for local `pnpm run deploy` |

## 5. Hand off to Actions

Push to `main` (or **Actions → CI → Run workflow**) and confirm the `deploy` job succeeds after `test`. Pull requests must never deploy.

## 6. Retire the old Worker

In the Cloudflare dashboard, delete (or clearly unused-mark) the old auto-generated Worker (e.g. `papadok24-sweepy`) so secrets and `*.workers.dev` URLs are not confused. Tell household members the new URL (`https://sweepy.<account>.workers.dev`) — bookmarks to the old Worker will break.