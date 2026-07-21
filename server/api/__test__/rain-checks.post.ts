import { z } from 'zod'
import { db, schema } from 'hub:db'
import type { ChoreWeekSkip } from '../../db/schema'
import { requireVitestApi } from '../../utils/require-vitest'
import { readZodBody } from '../../utils/validate'

const bodySchema = z.object({
  choreId: z.number().int().positive(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  skippedAt: z.number().int().positive().optional(),
})

/**
 * Insert a rain-check row with an explicit weekStart — product POST always
 * stamps the current week, so prior-week fixtures need this Vitest-only path.
 */
export default eventHandler(async (event): Promise<ChoreWeekSkip> => {
  requireVitestApi()

  const body = await readZodBody(event, bodySchema)

  const [row] = await db.insert(schema.choreWeekSkips).values({
    choreId: body.choreId,
    weekStart: body.weekStart,
    skippedAt: body.skippedAt ?? Date.now(),
  }).returning()

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to insert rain check' })
  }

  return row
})
