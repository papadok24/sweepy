import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db, schema } from 'hub:db'
import type { Chore } from '../db/schema'

/** Parse a positive integer chore id from the `:id` route param. */
export function requireChoreId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chore id' })
  }
  return id
}

/** Load a chore by id or 404. */
export async function requireChore(id: number): Promise<Chore> {
  const chore = await db
    .select()
    .from(schema.chores)
    .where(eq(schema.chores.id, id))
    .get()

  if (!chore) {
    throw createError({ statusCode: 404, statusMessage: 'Chore not found' })
  }

  return chore
}

/** Load an active chore by id or 404. */
export async function requireActiveChore(id: number): Promise<Chore> {
  const chore = await requireChore(id)
  if (!chore.active) {
    throw createError({ statusCode: 404, statusMessage: 'Chore not found' })
  }
  return chore
}
