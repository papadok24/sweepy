import { z } from 'zod'
import { db, schema } from 'hub:db'
import type { Completion } from '../../db/schema'
import { dayOfWeekSchema } from '../../utils/chore-schemas'
import { requireVitestApi } from '../../utils/require-vitest'
import { readZodBody } from '../../utils/validate'

const bodySchema = z.object({
  choreId: z.number().int().positive(),
  dayOfWeek: dayOfWeekSchema,
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completedAt: z.number().int().positive().optional(),
})

/**
 * Insert a completion with an explicit weekStart — product POST always stamps
 * the current week, so prior-week fixtures need this Vitest-only path.
 */
export default eventHandler(async (event): Promise<Completion> => {
  requireVitestApi()

  const body = await readZodBody(event, bodySchema)

  const [row] = await db.insert(schema.completions).values({
    choreId: body.choreId,
    dayOfWeek: body.dayOfWeek,
    weekStart: body.weekStart,
    completedAt: body.completedAt ?? Date.now(),
  }).returning()

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to insert completion' })
  }

  return row
})
