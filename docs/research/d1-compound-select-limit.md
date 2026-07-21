# Research: D1 compound `SELECT` limit on chore creation

**Status:** Implemented — `buildAssignmentSelect` now uses a `VALUES` row
source (see `server/utils/chore-create.ts`).

## Finding

Production D1 allows **at most 5 terms** in one compound `SELECT`; the sixth
term fails with `too many terms in compound SELECT`.

- SQLite defines a compound query as simple `SELECT` terms joined by `UNION`,
  `UNION ALL`, `INTERSECT`, or `EXCEPT`. Upstream SQLite defaults
  `SQLITE_MAX_COMPOUND_SELECT` to 500, but permits a host to lower it per
  connection with `sqlite3_limit()`.
- Cloudflare's current `workerd` SQLite setup explicitly calls
  `sqlite3_limit(db, SQLITE_LIMIT_COMPOUND_SELECT, 5)`. This runtime setting,
  not SQLite's upstream default, is the relevant D1 limit.
- Cloudflare's public D1 limits page does not list this inherited runtime
  limit. It separately documents 100 bound parameters and 100 KB of SQL per
  statement; those limits apply to each statement inside `db.batch()`.

Sources:

- [Cloudflare `workerd`: D1/SQLite runtime limits](https://github.com/cloudflare/workerd/blob/main/src/workerd/util/sqlite.c%2B%2B#L1352-L1380)
- [Cloudflare PR raising the compound limit from 3 to 5](https://github.com/cloudflare/workerd/pull/796)
- [Cloudflare D1 SQL compatibility](https://developers.cloudflare.com/d1/sql-api/sql-statements/)
- [Cloudflare D1 platform limits](https://developers.cloudflare.com/d1/platform/limits/)
- [SQLite implementation limits](https://www.sqlite.org/limits.html#max_compound_select)
- [SQLite run-time limit API](https://www.sqlite.org/c3ref/limit.html)

## Triggering SQL shapes

The limit counts each simple `SELECT`, not each operator:

```sql
-- 5 terms: accepted by D1
SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4;

-- 6 terms: rejected by D1
SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5;
```

The same check applies when the compound query is nested or supplies rows to
another statement. Therefore an `INSERT ... SELECT ... UNION ALL ...` with six
or more terms is implicated:

```sql
INSERT INTO target (value)
SELECT ? UNION ALL SELECT ? UNION ALL SELECT ?
UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ?;
```

Plain multi-row `INSERT ... VALUES (...), (...), ...` is **not** this failure
mode. SQLite's parser exempts its internal multi-value/`VALUES` representation
from `SQLITE_LIMIT_COMPOUND_SELECT`. It remains subject to D1's separate
100-bound-parameter and 100 KB statement limits.

Sources:

- [SQLite `SELECT`: compound operators and semantics](https://www.sqlite.org/lang_select.html#compound)
- [SQLite `INSERT`: `VALUES` versus `INSERT ... SELECT`](https://www.sqlite.org/lang_insert.html)
- [SQLite parser source: term count, error, and `SF_MultiValue|SF_Values` exemption](https://github.com/sqlite/sqlite/blob/master/src/parse.y#L537-L568)
- [Drizzle SQLite inserts: multi-row `.values()` and insert-from-select](https://orm.drizzle.team/docs/sqlite/insert)

## Connection to `POST /api/chores`

`server/api/chores/index.post.ts` batches the chore insert with the assignment
insert built by `server/utils/chore-create.ts`. `buildAssignmentSelect()` emits
one `SELECT ? AS day_of_week` per distinct selected day and joins them with
`UNION ALL`:

```sql
INSERT INTO chore_assignments (...)
SELECT null, chore_id, day_of_week
FROM (SELECT last_insert_rowid() AS chore_id)
CROSS JOIN (
  SELECT ? AS day_of_week
  UNION ALL SELECT ? AS day_of_week
  -- one term per selected day
);
```

The API accepts days 0 through 6, deduplicates them, and the UI can submit all
seven. Consequently:

- 1–5 distinct days stay within D1's compound limit.
- 6–7 distinct days exceed it and explain the production error.
- Local libSQL uses SQLite's much higher default, so the existing mocked D1
  batch test does not reproduce D1's parser limit.

This is not Drizzle automatically rewriting `.values([...])` into
`SELECT ... UNION ALL`; the repository constructs that compound SQL explicitly
and passes it through Drizzle's supported insert-from-select API.

## Fix applied

Keep the atomic `db.batch()` and insert-from-select design, but replace the
`UNION ALL` day source with a `VALUES` row source (verified against production
D1 for all seven days):

```sql
INSERT INTO chore_assignments (id, chore_id, day_of_week)
SELECT null, chore_id, days.column1 AS day_of_week
FROM (SELECT last_insert_rowid() AS chore_id)
CROSS JOIN (VALUES (?), (?), (?), (?), (?), (?), (?)) AS days;
```

`VALUES` is exempt from `SQLITE_LIMIT_COMPOUND_SELECT` while still freezing
the new chore id via `last_insert_rowid()`. A unit regression asserts the
prepared SQL for seven days contains `VALUES` and no `UNION ALL`.

`json_each(?)` is an equally valid non-compound alternative if a single-bound
JSON array is preferred later.

Source:

- [Cloudflare D1: expand a bound JSON array with `json_each`](https://developers.cloudflare.com/d1/sql-api/query-json/#expand-arrays-for-in-queries)
