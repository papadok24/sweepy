# Local-first Week view store for completion toggles

The week board must feel instant: checking off a chore must not wait on an HTTP round-trip. We hold an in-memory **this-week** Week view as the UI’s source of truth, hydrate it once via Nuxt `useAsyncData`/`useFetch` against `GET /api/week`, and apply completion toggles optimistically with fire-and-forget `POST /api/completions` (check) and `DELETE /api/completions/:choreId/:dayOfWeek` (uncheck; path params — ADR 0001). On write failure we re-fetch the week, replace the snapshot, and show a subtle notice owned by the week composable. The store is a Nuxt `useState` + composable (no Pinia); baseline scope is completions only, current week only, concurrent toggles allowed.

## Considered Options

- **Await the API on every toggle** — correct under flaky networks, but fights the snappy household UX we want. Rejected for the check/uncheck path.
- **Pinia (or another client store package)** — workable, but Nuxt `useState` already covers SSR-friendly shared state for one document; adding a package for this baseline was rejected.
- **Normalized entity stores or multi-week cache from day one** — better when many screens share overlapping data or week navigation exists; premature for a single current-week board.
- **Outbox / ordered write queue / per-cell locking** — stronger under rapid toggles and offline use; deferred until we see real pain. Baseline relies on reconcile-via-rehydrate.
- **Silent reconcile or immediate rollback on failure** — silent hides lost saves; rollback makes every failure a visible undo. Chose re-hydrate plus a subtle notice instead.

## Hydration (SSR vs client)

Vue hydrates by matching the server HTML to the client’s **first** render. If those trees differ, you get `Hydration node mismatch` (e.g. server `empty-state` vs client `ul`) and Vue throws away the SSR DOM.

Two patterns caused that on the week board:

1. **`new Date()` / `apiDayOfWeek()` in setup for DOM branching** — Node (especially Cloudflare Workers in UTC) and the browser can disagree on “today”. Server renders Today’s empty state; client expects today’s chore list (or the reverse). **Rule:** anything that changes markup by wall-clock day must be seeded with `useState(() => …)` during SSR so the value is in the payload, then optionally realigned in `onMounted`.
2. **Mirroring `useAsyncData` into a separate `useState` via `watch`** — the template bound the mirror. Any moment the mirror lagged the async payload (or stayed `null` while `data` was present) produced loading/empty markup on one side and the board on the other. **Rule:** use the `useAsyncData` `data` ref as the week document; mutate it in place for optimistic toggles.

Do not gate SSR markup on client-only clocks, `localStorage`, or a second copy of async data. Prefer one payload-backed source of truth and stable first paint.

## Consequences

- First paint that never hydrates must show a hard error/empty state — no demo/mock fallback once the UI is wired to the real API.
- Successful background writes are no-ops against local state (already updated). Failed writes may briefly show a wrong checkmark until re-hydrate completes.
- Chore create/edit/archive and assignment edits stay outside this optimistic path until a later spec.
- “Today” may briefly follow the SSR clock, then snap to the device-local day after mount when they differ (UTC Worker vs household TZ). A configured household timezone can replace that later if needed.
