import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { completeBody } from '../utils/chore-schemas'
import { currentWeekClock } from '../utils/household-settings'
import { readZodBody } from '../utils/validate'

export default eventHandler(async (event): Promise<{ ok: true }> => {
  const body = await readZodBody(event, completeBody)
  const { weekStart } = await currentWeekClock(event)

  await db
    .delete(schema.completions)
    .where(and(
      eq(schema.completions.choreId, body.choreId),
      eq(schema.completions.dayOfWeek, body.dayOfWeek),
      eq(schema.completions.weekStart, weekStart),
    ))

  return { ok: true }
})
