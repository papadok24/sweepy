import { mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { completions, placeholders } from '../server/db/schema.ts'

const SAMPLE_LABELS = ['alpha', 'beta', 'gamma'] as const

function openLocalDb() {
  mkdirSync('.data/db', { recursive: true })
  const client = createClient({ url: 'file:.data/db/sqlite.db' })
  return { client, db: drizzle(client) }
}

/**
 * Loads sample placeholder rows into the local SQLite database.
 * Requires migrations to have been applied (e.g. via `pnpm db:migrate`).
 */
export async function seedPlaceholders() {
  const { client, db } = openLocalDb()

  try {
    await db.delete(placeholders)
    await db.insert(placeholders).values(
      SAMPLE_LABELS.map(label => ({
        label,
        createdAt: Date.now(),
      })),
    )
  }
  finally {
    client.close()
  }

  return [...SAMPLE_LABELS]
}

/**
 * Insert a completion row directly — used by e2e setup for prior-week
 * fixtures that the complete API cannot create (server always uses current week).
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

const entry = process.argv[1]
const isMain = Boolean(entry) && import.meta.url === pathToFileURL(entry).href

if (isMain) {
  const labels = await seedPlaceholders()
  console.log(`Seeded ${labels.length} placeholder rows into .data/db/sqlite.db`)
}
