import { sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { Chore } from '../../db/schema'
import { createChoreBody } from '../../utils/chore-schemas'
import { readZodBody } from '../../utils/validate'

/**
 * Create a chore and optional day assignments atomically.
 *
 * D1 rejects SQL `BEGIN`, so Drizzle `db.transaction()` fails in production with
 * "Failed query: begin". `db.batch()` is the D1/libsql atomic multi-statement path.
 *
 * Assignments cannot use multi-row `VALUES (last_insert_rowid(), …)` — rowid updates
 * after the first row and breaks the FK. Freeze the new chore id in a subquery instead.
 */
export default eventHandler(async (event): Promise<Chore> => {
  const body = await readZodBody(event, createChoreBody)
  const days = body.days ? [...new Set(body.days)] : []

  const choreValues = {
    name: body.name,
    notes: body.notes ?? null,
  }

  if (days.length === 0) {
    const [chore] = await db.insert(schema.chores).values(choreValues).returning()
    if (!chore) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create chore' })
    }
    return chore
  }

  const daysSource = sql.join(
    days.map(day => sql`select ${day} as day_of_week`),
    sql` union all `,
  )

  const [choreRows] = await db.batch([
    db.insert(schema.chores).values(choreValues).returning(),
    db.run(sql`
      insert into chore_assignments (chore_id, day_of_week)
      select chore_id, day_of_week
      from (select last_insert_rowid() as chore_id)
      cross join (${daysSource})
    `),
  ])

  const [chore] = choreRows
  if (!chore) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create chore' })
  }
  return chore
})
