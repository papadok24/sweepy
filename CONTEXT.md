# Sweepy

A household chore tracker: chores are placed into day-of-week buckets so the household can see, at a glance, what to do on which day — and check things off week by week.

## Language

**Chore**:
A recurring household task (e.g. "Dishes", "Vacuum living room") with a name and optional notes. Chores are archived when retired, never destroyed.
_Avoid_: Task, todo, job

**Assignment**:
The placement of a chore into a day-of-week bucket. A chore may be assigned to multiple days. Assignments define the *current* schedule only; changing them does not rewrite history.
_Avoid_: Schedule entry, slot

**Day bucket**:
One of the seven days of the week, used as a grouping for chores — not a deadline. Sunday is assignable but customarily kept free (Sabbath).
_Avoid_: Due date, deadline

**Week**:
A Monday-through-Sunday period. Completions are scoped to a week; checkmarks effectively reset each Monday.

**Completion**:
The record that a specific chore, on a specific day bucket, was done in a specific week. Any slot may be checked off at any point during its week (days are buckets, not deadlines). Completions are anonymous (no household member attribution) and survive later changes to the schedule. Unchecking a mistake removes the record.
_Avoid_: Check-in, done log
