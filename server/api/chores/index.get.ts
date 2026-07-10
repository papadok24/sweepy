import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { Chore } from '../../db/schema'

export default eventHandler(async (): Promise<Chore[]> => {
  return await db
    .select()
    .from(schema.chores)
    .where(eq(schema.chores.active, true))
})
