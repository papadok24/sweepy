import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { Chore } from '../../../db/schema'
import { requireChore, requireChoreId } from '../../../utils/chore-id'

export default eventHandler(async (event): Promise<Chore> => {
  const id = requireChoreId(event)
  await requireChore(id)

  // Soft-deactivate only — completions are never touched (ADR 0003).
  // Rain-check rows for this Chore are cleaned up (orphan sit-outs).
  const [archived] = await db
    .update(schema.chores)
    .set({ active: false })
    .where(eq(schema.chores.id, id))
    .returning()

  if (!archived) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to archive chore' })
  }

  await db
    .delete(schema.choreWeekSkips)
    .where(eq(schema.choreWeekSkips.choreId, id))
    .returning()

  return archived
})
