# CI deploy on main via GitHub Actions with atomic D1 migrations

Production ships from GitHub Actions on green `main` (and on `workflow_dispatch`) by running the same `pnpm run deploy` script used locally: Cloudflare-oriented build → remote D1 migrations → Worker deploy. Migrations stay in that job so production code never expects schema that is not yet applied. This updates ADR 0001’s “manual only” deploy consequence; NuxtHub + D1 and the atomic migrate-then-deploy ordering stay as decided there.

## Considered Options

- **Separate migration-only workflow / manual approval gate before deploy** — rejected: splits schema and code across jobs and invites “Worker live, migration pending” windows. Atomic one-job ordering is safer for a single-household production D1.
- **Cloudflare Workers Builds / Pages Git integration as primary CD** — rejected: Workers Builds does not apply D1 migrations; we would still need a custom migrate step and would fork away from the local deploy entrypoint.
- **Inline migrate/deploy steps only in Actions YAML** — rejected: local and CI would drift on ordering and Cloudflare build flags. One script (`scripts/deploy.mjs`) is the shared entrypoint.

## Consequences

- Pushes to `main` run the existing test job first; deploy runs only if tests pass and the ref is `main`. Pull requests never deploy. Maintainers can re-ship `main` via `workflow_dispatch` (dispatch from other branches does not deploy).
- GitHub repository secrets hold Cloudflare auth and the D1 database id (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`). Runtime values such as `NUXT_HOUSEHOLD_TIMEZONE` remain Cloudflare Worker secrets (ADR 0008), set outside Actions.
- The production Worker name is pinned to `sweepy` in Nitro wrangler metadata. Cutover from any auto-generated Worker is a one-time human checklist (local deploy, secret put, smoke-check, add GitHub secrets, retire the old Worker) — see README / `docs/checklists/production-cutover.md`.
- Wrangler skips the migration confirmation prompt in non-interactive CI; local interactive runs still prompt. Missing CI credentials fail clearly in the deploy script.
- Preview / staging Workers and preview D1 remain out of scope (still two environments: local SQLite and production D1). Production chore seeding stays a conscious human action, not part of deploy.
