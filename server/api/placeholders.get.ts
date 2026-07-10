import { db, schema } from 'hub:db'
import type { Placeholder } from '../db/schema'

export default eventHandler(async (): Promise<Placeholder[]> => {
  return await db.select().from(schema.placeholders)
})
