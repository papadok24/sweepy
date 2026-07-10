import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { dayOfWeekSchema } from '../../../../utils/chore-schemas'
import { requireChoreId } from '../../../../utils/chore-id'

export default eventHandler(async (event): Promise<{ ok: true }> => {
  const choreId = requireChoreId(event)

  const dayResult = dayOfWeekSchema.safeParse(Number(getRouterParam(event, 'dayOfWeek')))
  if (!dayResult.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid day of week' })
  }

  const deleted = await db
    .delete(schema.choreAssignments)
    .where(and(
      eq(schema.choreAssignments.choreId, choreId),
      eq(schema.choreAssignments.dayOfWeek, dayResult.data),
    ))
    .returning()

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Assignment not found' })
  }

  return { ok: true }
})
