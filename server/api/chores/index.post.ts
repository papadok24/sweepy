import { db, schema } from 'hub:db'
import type { Chore } from '../../db/schema'
import { createChoreBody } from '../../utils/chore-schemas'
import { readZodBody } from '../../utils/validate'

export default eventHandler(async (event): Promise<Chore> => {
  const body = await readZodBody(event, createChoreBody)
  const days = body.days ? [...new Set(body.days)] : []

  return await db.transaction(async (tx) => {
    const [chore] = await tx.insert(schema.chores).values({
      name: body.name,
      notes: body.notes ?? null,
    }).returning()

    if (!chore) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create chore' })
    }

    if (days.length > 0) {
      await tx.insert(schema.choreAssignments).values(
        days.map(dayOfWeek => ({
          choreId: chore.id,
          dayOfWeek,
        })),
      )
    }

    return chore
  })
})
