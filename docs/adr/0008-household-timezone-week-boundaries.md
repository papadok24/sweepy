# Household timezone owns Week boundaries

Week identity and “today” on the shared board are defined by a single **household timezone** (IANA), not UTC, not the browser, and not a future logged-in member. Completions stay keyed by `weekStart` (that Week’s Monday date); the server alone derives current `weekStart` and household `todayDayOfWeek` at local Monday 00:00 civil time in that zone. The timezone is stored in a single-row household settings record, seeded once from `NUXT_HOUSEHOLD_TIMEZONE` when missing, then DB-owned; changing it does not rewrite existing Completions. The Week API returns household “today” so the client never invents calendar day for markup (device snap removed).

## Considered Options

- **Per-device or per-member timezone for week keys** — rejected: anonymous Completions and one shared board would diverge across clients; future login is attribution only, not Week ownership.
- **Env-only timezone (no DB)** — rejected for this iteration: settings UI is expected soon; DB storage avoids a second migration later. Env remains the fail-closed seed when no row exists.
- **Client-supplied `weekStart` / device “today” after mount** — rejected: Worker vs browser clocks already caused hydration mismatches (ADR 0006); calendar-day markup must come from the API.

## Consequences

- `GET /api/week` gains household `todayDayOfWeek`; completion write paths keep server-derived `weekStart`.
- Missing settings row **and** missing/empty `NUXT_HOUSEHOLD_TIMEZONE` is an error — no silent UTC fallback. Once a settings row exists, the DB wins even if env is unset.
- ADR 0006’s post-mount device-local today realignment is superseded for the shared board.
