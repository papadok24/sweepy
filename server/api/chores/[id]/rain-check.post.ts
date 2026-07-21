import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { ChoreWeekSkip } from '../../../db/schema'
import { requireActiveChore, requireChoreId } from '../../../utils/chore-id'
import { isUniqueViolation } from '../../../utils/db-errors'
import { currentWeekClock } from '../../../utils/household-settings'

/**
 * Take a Rain check for the current Week (server-stamped weekStart).
 * Duplicate take is idempotent — returns the existing row.
 */
export default eventHandler(async (event): Promise<ChoreWeekSkip> => {
  const choreId = requireChoreId(event)
  await requireActiveChore(choreId)
  const { weekStart } = await currentWeekClock(event)

  try {
    const [row] = await db.insert(schema.choreWeekSkips).values({
      choreId,
      weekStart,
    }).returning()

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to take rain check' })
    }

    return row
  }
  catch (error) {
    if (!isUniqueViolation(error)) throw error

    const existing = await db
      .select()
      .from(schema.choreWeekSkips)
      .where(and(
        eq(schema.choreWeekSkips.choreId, choreId),
        eq(schema.choreWeekSkips.weekStart, weekStart),
      ))
      .get()

    if (!existing) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to take rain check' })
    }

    return existing
  }
})
