import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { dayOfWeekSchema } from '../../../utils/chore-schemas'
import { currentWeekClock } from '../../../utils/household-settings'

/**
 * Uncheck a completion for the current week.
 *
 * Path params (not a JSON body): Nitro `readBody` on DELETE with a body hangs
 * on Cloudflare Workers (Error 1101). See ADR 0001.
 */
export default eventHandler(async (event): Promise<{ ok: true }> => {
  const choreId = Number(getRouterParam(event, 'choreId'))
  if (!Number.isInteger(choreId) || choreId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chore id' })
  }

  const dayResult = dayOfWeekSchema.safeParse(Number(getRouterParam(event, 'dayOfWeek')))
  if (!dayResult.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid day of week' })
  }

  const { weekStart } = await currentWeekClock(event)

  // Prefer an explicit terminal method on D1 writes (ADR 0001).
  await db
    .delete(schema.completions)
    .where(and(
      eq(schema.completions.choreId, choreId),
      eq(schema.completions.dayOfWeek, dayResult.data),
      eq(schema.completions.weekStart, weekStart),
    ))
    .returning()

  return { ok: true }
})
