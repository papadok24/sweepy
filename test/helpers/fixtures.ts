import { eq } from 'drizzle-orm'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { completions, householdSettings } from '../../server/db/schema.ts'
import {
  TEST_SQLITE_URL,
  ensureSqliteDir,
  resolveSqliteUrl,
} from './sqlite.ts'

function openLocalDb() {
  const url = resolveSqliteUrl(TEST_SQLITE_URL)
  ensureSqliteDir(url)
  const client = createClient({ url })
  return { client, db: drizzle(client) }
}

/**
 * Insert a completion row directly — e2e setup for prior-week fixtures the
 * complete API cannot create (server always uses the current week).
 */
export async function insertCompletion(input: {
  choreId: number
  dayOfWeek: number
  weekStart: string
  completedAt?: number
}) {
  const { client, db } = openLocalDb()

  try {
    const [row] = await db.insert(completions).values({
      choreId: input.choreId,
      dayOfWeek: input.dayOfWeek,
      weekStart: input.weekStart,
      completedAt: input.completedAt ?? Date.now(),
    }).returning()
    return row
  }
  finally {
    client.close()
  }
}

/** Upsert the singleton household settings timezone (ADR 0008). */
export async function upsertHouseholdTimezone(timezone: string) {
  const { client, db } = openLocalDb()

  try {
    await db
      .insert(householdSettings)
      .values({ id: 1, timezone })
      .onConflictDoUpdate({
        target: householdSettings.id,
        set: { timezone },
      })
  }
  finally {
    client.close()
  }
}

/** Count completion rows for a chore — used to assert archive keeps history. */
export async function countCompletionsForChore(choreId: number): Promise<number> {
  const { client, db } = openLocalDb()

  try {
    const rows = await db
      .select()
      .from(completions)
      .where(eq(completions.choreId, choreId))
    return rows.length
  }
  finally {
    client.close()
  }
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
