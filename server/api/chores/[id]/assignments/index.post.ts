import { db, schema } from 'hub:db'
import type { ChoreAssignment } from '../../../../db/schema'
import { createAssignmentBody } from '../../../../utils/chore-schemas'
import { requireActiveChore, requireChoreId } from '../../../../utils/chore-id'
import { withUniqueConflict } from '../../../../utils/db-errors'
import { readZodBody } from '../../../../utils/validate'

export default eventHandler(async (event): Promise<ChoreAssignment> => {
  const choreId = requireChoreId(event)
  const body = await readZodBody(event, createAssignmentBody)

  await requireActiveChore(choreId)

  return await withUniqueConflict(async () => {
    const [assignment] = await db.insert(schema.choreAssignments).values({
      choreId,
      dayOfWeek: body.dayOfWeek,
    }).returning()

    if (!assignment) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create assignment' })
    }

    return assignment
  }, 'Chore is already assigned to this day')
})
