import { z } from 'zod'
import { db, schema } from 'hub:db'
import { requireVitestApi } from '../../utils/require-vitest'
import { assertValidTimeZone } from '../../utils/timezone'
import { readZodBody } from '../../utils/validate'

const bodySchema = z.object({
  timezone: z.string().trim().min(1),
})

/** Upsert the singleton household timezone via hub:db (ADR 0008). */
export default eventHandler(async (event): Promise<{ timezone: string }> => {
  requireVitestApi()

  const body = await readZodBody(event, bodySchema)
  const timezone = assertValidTimeZone(body.timezone)

  await db
    .insert(schema.householdSettings)
    .values({ id: 1, timezone })
    .onConflictDoUpdate({
      target: schema.householdSettings.id,
      set: { timezone },
    })

  return { timezone }
})
