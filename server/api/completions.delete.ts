import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { completeBody } from '../utils/chore-schemas'
import { readZodBody } from '../utils/validate'
import { weekStartFor } from '../utils/week'

export default eventHandler(async (event): Promise<{ ok: true }> => {
  const body = await readZodBody(event, completeBody)
  const weekStart = weekStartFor()

  const deleted = await db
    .delete(schema.completions)
    .where(and(
      eq(schema.completions.choreId, body.choreId),
      eq(schema.completions.dayOfWeek, body.dayOfWeek),
      eq(schema.completions.weekStart, weekStart),
    ))
    .returning()

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Completion not found' })
  }

  return { ok: true }
})
