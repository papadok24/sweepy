import { z } from 'zod'
import { db, schema } from 'hub:db'
import { requireVitestApi } from '../../utils/require-vitest'
import { readZodBody } from '../../utils/validate'

const bodySchema = z.object({
  labels: z.array(z.string().trim().min(1)).min(1),
})

/** Insert placeholder rows via hub:db for API suite setup. */
export default eventHandler(async (event): Promise<{ labels: string[] }> => {
  requireVitestApi()

  const body = await readZodBody(event, bodySchema)
  const now = Date.now()

  await db.insert(schema.placeholders).values(
    body.labels.map(label => ({
      label,
      createdAt: now,
    })),
  )

  return { labels: body.labels }
})
