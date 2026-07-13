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

  const assignments = await db
    .select({ dayOfWeek: schema.choreAssignments.dayOfWeek })
    .from(schema.choreAssignments)
    .where(eq(schema.choreAssignments.choreId, choreId))

  const match = assignments.find(a => a.dayOfWeek === dayResult.data)
  if (!match) {
    throw createError({ statusCode: 404, statusMessage: 'Assignment not found' })
  }

  if (assignments.length <= 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Chore must keep at least one day assignment',
    })
  }

  await db
    .delete(schema.choreAssignments)
    .where(and(
      eq(schema.choreAssignments.choreId, choreId),
      eq(schema.choreAssignments.dayOfWeek, dayResult.data),
    ))

  return { ok: true }
})
