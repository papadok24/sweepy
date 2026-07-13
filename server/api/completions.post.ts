import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { Completion } from '../db/schema'
import { completeBody } from '../utils/chore-schemas'
import { withUniqueConflict } from '../utils/db-errors'
import { currentWeekClock } from '../utils/household-settings'
import { readZodBody } from '../utils/validate'

export default eventHandler(async (event): Promise<Completion> => {
  const body = await readZodBody(event, completeBody)
  const { weekStart } = await currentWeekClock(event)

  const assignment = await db
    .select({
      choreId: schema.choreAssignments.choreId,
      active: schema.chores.active,
    })
    .from(schema.choreAssignments)
    .innerJoin(schema.chores, eq(schema.choreAssignments.choreId, schema.chores.id))
    .where(and(
      eq(schema.choreAssignments.choreId, body.choreId),
      eq(schema.choreAssignments.dayOfWeek, body.dayOfWeek),
    ))
    .get()

  if (!assignment || !assignment.active) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No assignment for this chore and day',
    })
  }

  return await withUniqueConflict(async () => {
    const [completion] = await db.insert(schema.completions).values({
      choreId: body.choreId,
      dayOfWeek: body.dayOfWeek,
      weekStart,
    }).returning()

    if (!completion) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to record completion' })
    }

    return completion
  }, 'Already completed for this week')
})
