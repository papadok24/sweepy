import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { Chore } from '../../../db/schema'
import { requireChore, requireChoreId } from '../../../utils/chore-id'

export default eventHandler(async (event): Promise<Chore> => {
  const id = requireChoreId(event)
  await requireChore(id)

  // Soft-deactivate only — completions are never touched (ADR 0003).
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
