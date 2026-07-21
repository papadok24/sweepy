import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from 'hub:db'
import { requireVitestApi } from '../../utils/require-vitest'

const querySchema = z.object({
  choreId: z.coerce.number().int().positive(),
})

/** Count rain-check rows for a chore via hub:db (no second SQLite client). */
export default eventHandler(async (event): Promise<{ count: number }> => {
  requireVitestApi()

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid choreId' })
  }

  const rows = await db
    .select({ id: schema.choreWeekSkips.id })
    .from(schema.choreWeekSkips)
    .where(eq(schema.choreWeekSkips.choreId, parsed.data.choreId))

  return { count: rows.length }
})
