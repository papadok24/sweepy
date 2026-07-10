import type { H3Event } from 'h3'

/** Parse a positive integer chore id from the `:id` route param. */
export function requireChoreId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chore id' })
  }
  return id
}
