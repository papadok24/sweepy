import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { ChoreAssignment } from '../../../../db/schema'
import { createAssignmentBody } from '../../../../utils/chore-schemas'
import { requireChoreId } from '../../../../utils/chore-id'
import { isUniqueViolation } from '../../../../utils/db-errors'
import { readZodBody } from '../../../../utils/validate'

export default eventHandler(async (event): Promise<ChoreAssignment> => {
  const choreId = requireChoreId(event)
  const body = await readZodBody(event, createAssignmentBody)

  const chore = await db
    .select()
    .from(schema.chores)
    .where(eq(schema.chores.id, choreId))
    .get()

  if (!chore || !chore.active) {
    throw createError({ statusCode: 404, statusMessage: 'Chore not found' })
  }

  try {
    const [assignment] = await db.insert(schema.choreAssignments).values({
      choreId,
      dayOfWeek: body.dayOfWeek,
    }).returning()

    if (!assignment) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create assignment' })
    }

    return assignment
  }
  catch (error) {
    if (isUniqueViolation(error)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Chore is already assigned to this day',
      })
    }
    throw error
  }
})
