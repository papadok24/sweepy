# Sweeps reads via a dedicated server snapshot, not the Week store

Sweeps needs Completions across many Weeks (and archived Chores with history in range), but the board’s Week store and `GET /api/week` are deliberately **current Week + active schedule only** (ADR 0006). Aggregating on the client would invent multi-week fetches or dump raw Completions; extending the Week document would break that boundary and pull archive/history concerns onto the board. We therefore add a **dedicated Sweeps read** — a filter-scoped snapshot (Lately / A while / Forever) computed on the server from `completions` joined to chore names/`active`, using household-timezone Week windows (ADR 0008). Completions stay anonymous; the snapshot never attributes sparkles to members.

## Considered Options

- **Client aggregation over N Week views** — no multi-week product API exists; fighting ADR 0006’s single current-Week store. Rejected.
- **Extend `GET /api/week` / `useWeekStore` with history** — couples look-back to the board document and reintroduces archived Chores into the wrong surface. Rejected.
- **Dedicated Sweeps snapshot endpoint** — one seam for the Scrapbook UI; server owns Week cutoffs and ranking rules. Chosen.

## Consequences

- Board optimistic toggle path stays untouched; Sweeps hydrates its own read model.
- Prototype `SweepsSnapshot` shape (filter, week sparkle series, ranked chores, peak, empty) is the contract target — rewrite for production; do not promote throwaway CSS.
