import { db, schema } from 'hub:db'
import type { Chore } from '../../db/schema'
import { createChoreBody } from '../../utils/chore-schemas'
import { readZodBody } from '../../utils/validate'

export default eventHandler(async (event): Promise<Chore> => {
  const body = await readZodBody(event, createChoreBody)

  const [chore] = await db.insert(schema.chores).values({
    name: body.name,
    notes: body.notes ?? null,
  }).returning()

  if (!chore) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create chore' })
  }

  return chore
})
