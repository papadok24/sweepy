# Sweepy

A household chore tracker: chores are placed into day-of-week buckets so the household can see, at a glance, what to do on which day — and check things off week by week.

## Language

**Sweepy**:
The product and its bubble-with-broom mascot — one name for both. Appears in branding, empty states, and celebration moments; not as chrome on every chore row.
_Avoid_: Separate mascot name, the bubble (as a proper noun)

**Household settings**:
The household’s durable preferences that affect the shared board — starting with household timezone. One logical settings record for the household (not per member).
_Avoid_: User preferences (for board-wide Week/today), per-device settings

**Chore**:
A recurring household task (e.g. "Dishes", "Vacuum living room") with a name, optional Notes, and at most one List. Chores are archived when retired, never destroyed.
_Avoid_: Task, todo, job

**Notes**:
Plain free-text instructions on a Chore (e.g. "use the wood cleaner"). Not rich text; not a List.
_Avoid_: Description, rich text, checklist, body

**List**:
At most one ordered collection of plain-text items belonging to a Chore (e.g. grocery items for "go to store"). Distinct from Notes; items are labels only — no quantities, categories, or per-item check-off in the current product language.
_Avoid_: Checklist, notes, shopping list (as a household-wide entity), todo list

**Assignment**:
The placement of a chore into a day-of-week bucket. A chore may be assigned to multiple days. Assignments define the *current* schedule only; changing them does not rewrite history.
_Avoid_: Schedule entry, slot

**Day bucket**:
One of the seven days of the week, used as a grouping for chores — not a deadline. Sunday is assignable but customarily kept free (Sabbath); the UI treats Sunday as a quiet/rest day without blocking assignments. On the shared board, “today” is the current day bucket in the household timezone, returned with the Week view so it always agrees with the current Week (not the viewing device’s clock).
_Avoid_: Due date, deadline

**Week**:
A Monday-through-Sunday period in the household timezone. The week begins at local Monday 00:00 (civil midnight, DST-aware) in that timezone. Completions are scoped to a week; checkmarks effectively reset at that instant — not at UTC midnight and not per device. The week’s identity is the ISO date of that Monday.
_Avoid_: Calendar week in the browser’s local zone, UTC week

**Household timezone**:
The single IANA timezone that defines the household’s wall clock for Week boundaries and “which week is current.” Shared by everyone on the board. Changing it does not rewrite existing Completions — their Week labels stay as recorded; only how “current Week” is determined changes. Distinct from any future member/device timezone used only for personal display (e.g. reminders while traveling).
_Avoid_: User timezone (for week reset), per-device week key

**Completion**:
The record that a specific chore, on a specific day bucket, was done in a specific week. Any slot may be checked off at any point during its week (days are buckets, not deadlines). Completions are anonymous today (no household member attribution) and survive later changes to the schedule; a future login may add optional “done by” attribution without changing Week ownership. Unchecking a mistake removes the record.
_Avoid_: Check-in, done log

**Full sweep**:
When every Assignment in today's Day bucket has a Completion for the current Week. Empty today (no Assignments) is not a Full sweep.
_Avoid_: Day clear, day complete, all done, perfect day

**Sweeps**:
The celebratory look-back surface for household Completions — how many over recent Weeks or Forever, and how often each Chore has been completed. A dedicated route reached from primary nav; playful filters (Lately / A while / Forever) with plain-language definitions nearby. In UI copy, one Completion counts as a **sparkle** (plural **sparkles**) — e.g. ranked lists, empty states, peaks. The ranked per-Chore list only includes Chores with at least one sparkle in the active filter window (zeros are omitted; archived Chores appear there only when they have Completions in range). Not a metrics dashboard, not member comparison (Completions stay anonymous).
_Avoid_: Stats, analytics, reports, leaderboard; calling a Completion a sweep / check / completion in Sweeps UI; zero-sparkle rows on the ranked list
