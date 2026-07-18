import { db, schema } from 'hub:db'
import type { Chore } from '../../db/schema'
import { choreWithDaysBatchQueries } from '../../utils/chore-create'
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
 * The assignment query must remain an insert builder: parameterized raw `db.run(sql)`
 * batch items trigger drizzle-orm#2277 in D1 (`undefined.bind`).
 */
export default eventHandler(async (event): Promise<Chore> => {
  const body = await readZodBody(event, createChoreBody)
  const days = body.days ? [...new Set(body.days)] : []

  const choreValues = {
    name: body.name,
    notes: body.notes ?? null,
    listItems: [] as string[],
  }

  if (days.length === 0) {
    const [chore] = await db.insert(schema.chores).values(choreValues).returning()
    if (!chore) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create chore' })
    }
    return chore
  }

  const [choreRows] = await db.batch(
    choreWithDaysBatchQueries(db, choreValues, days),
  )

  const [chore] = choreRows
  if (!chore) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create chore' })
  }
  return chore
})
