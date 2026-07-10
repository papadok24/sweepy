import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { Chore } from '../../../db/schema'
import { requireChoreId } from '../../../utils/chore-id'

export default eventHandler(async (event): Promise<Chore> => {
  const id = requireChoreId(event)

  const existing = await db
    .select()
    .from(schema.chores)
    .where(eq(schema.chores.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Chore not found' })
  }

  const [archived] = await db
    .update(schema.chores)
    .set({ active: false })
    .where(eq(schema.chores.id, id))
    .returning()

  if (!archived) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to archive chore' })
  }

  return archived
})
