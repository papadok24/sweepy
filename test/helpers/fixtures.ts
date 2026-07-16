import { $fetch } from '@nuxt/test-utils/e2e'
import type { Completion } from '../../server/db/schema.ts'

/**
 * Test fixtures that need DB access go through Vitest-only Nitro routes on the
 * running NuxtHub server (`hub:db`). Opening a second `@libsql/client` against
 * the same file races the server and flakes with SQLITE_BUSY.
 */

/**
 * Insert a completion row with an explicit weekStart — product POST always
 * stamps the current week.
 */
export async function insertCompletion(input: {
  choreId: number
  dayOfWeek: number
  weekStart: string
  completedAt?: number
}): Promise<Completion> {
  return await $fetch<Completion>('/api/__test__/completions', {
    method: 'POST',
    body: input,
  })
}

/** Upsert the singleton household settings timezone (ADR 0008). */
export async function upsertHouseholdTimezone(timezone: string): Promise<void> {
  await $fetch('/api/__test__/household-timezone', {
    method: 'PUT',
    body: { timezone },
  })
}

/** Count completion rows for a chore — used to assert archive keeps history. */
export async function countCompletionsForChore(choreId: number): Promise<number> {
  const result = await $fetch<{ count: number }>('/api/__test__/completions', {
    query: { choreId },
  })
  return result.count
}

/** Insert placeholder labels for GET /api/placeholders coverage. */
export async function insertPlaceholders(labels: string[]): Promise<string[]> {
  const result = await $fetch<{ labels: string[] }>('/api/__test__/placeholders', {
    method: 'POST',
    body: { labels },
  })
  return result.labels
}

/** ISO date of the Monday one week before `weekStart`. */
export function previousWeekStart(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  date.setDate(date.getDate() - 7)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
