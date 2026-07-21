import type { BatchItem } from 'drizzle-orm/batch'
import { sql, type SQL } from 'drizzle-orm'
import * as schema from '../db/schema'
import type { DayOfWeek } from './chore-schemas'

export type ChoreInsertValues = {
  name: string
  notes: string | null
  listItems?: string[]
}

/**
 * Build the assignment rows for Drizzle's insert-from-select query builder.
 *
 * Keeping the raw SQL inside an insert builder gives the D1 batch driver a
 * prepared statement. Passing parameterized `db.run(sql)` directly to
 * `db.batch()` instead triggers drizzle-orm#2277 (`undefined.bind`).
 *
 * Use `VALUES` for the day list — not `SELECT … UNION ALL`. Workerd caps
 * compound SELECTs at 5 terms (`SQLITE_LIMIT_COMPOUND_SELECT`), so assigning
 * a chore to 6–7 days would fail in production D1. `VALUES` is exempt from
 * that limit (see docs/research/d1-compound-select-limit.md).
 *
 * `days` must be non-empty — callers gate the no-days path separately.
 */
export function buildAssignmentSelect(days: readonly DayOfWeek[]): SQL {
  const dayRows = sql.join(
    days.map(day => sql`(${day})`),
    sql`, `,
  )

  return sql`
    select null as id, chore_id, days.column1 as day_of_week
    from (select last_insert_rowid() as chore_id)
    cross join (values ${dayRows}) as days
  `
}

/**
 * Atomic chore + assignment batch items for D1/libsql `db.batch()`.
 * Shared by the create route and the D1-driver regression test.
 *
 * Accepts hub:db and drizzle-orm/d1 clients; both expose the same insert API
 * that BatchItem needs, but their TypeScript shapes differ enough that we
 * normalize once here instead of casting at every call site.
 */
export function choreWithDaysBatchQueries(
  database: { insert: unknown },
  choreValues: ChoreInsertValues,
  days: readonly DayOfWeek[],
): [BatchItem<'sqlite'>, BatchItem<'sqlite'>] {
  const db = database as {
    insert: (table: typeof schema.chores | typeof schema.choreAssignments) => {
      values: (values: ChoreInsertValues) => {
        returning: () => BatchItem<'sqlite'>
      }
      select: (query: SQL) => BatchItem<'sqlite'>
    }
  }

  return [
    db.insert(schema.chores).values(choreValues).returning(),
    db.insert(schema.choreAssignments).select(buildAssignmentSelect(days)),
  ]
}
