import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireActiveChore, requireChoreId } from '../../../utils/chore-id'
import { currentWeekClock } from '../../../utils/household-settings'

/**
 * Clear the current Week's Rain check for an active Chore.
 * Idempotent when no row exists.
 */
export default eventHandler(async (event): Promise<{ cleared: true }> => {
  const choreId = requireChoreId(event)
  await requireActiveChore(choreId)
  const { weekStart } = await currentWeekClock(event)

  await db
    .delete(schema.choreWeekSkips)
    .where(and(
      eq(schema.choreWeekSkips.choreId, choreId),
      eq(schema.choreWeekSkips.weekStart, weekStart),
    ))
    .returning()

  return { cleared: true }
})
