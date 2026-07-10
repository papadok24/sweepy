import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { Chore } from '../../db/schema'
import { updateChoreBody } from '../../utils/chore-schemas'
import { requireChoreId } from '../../utils/chore-id'
import { readZodBody } from '../../utils/validate'

export default eventHandler(async (event): Promise<Chore> => {
  const id = requireChoreId(event)
  const body = await readZodBody(event, updateChoreBody)

  const existing = await db
    .select()
    .from(schema.chores)
    .where(eq(schema.chores.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Chore not found' })
  }

  const [updated] = await db
    .update(schema.chores)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    })
    .where(eq(schema.chores.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update chore' })
  }

  return updated
})
