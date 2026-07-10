import { mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { placeholders } from '../server/db/schema.ts'

const SAMPLE_LABELS = ['alpha', 'beta', 'gamma'] as const

/**
 * Loads sample placeholder rows into the local SQLite database.
 * Requires migrations to have been applied (e.g. via `pnpm dev` or `pnpm db:migrate`).
 */
export async function seedPlaceholders() {
  mkdirSync('.data/db', { recursive: true })

  const client = createClient({ url: 'file:.data/db/sqlite.db' })
  const db = drizzle(client)

  try {
    await db.delete(placeholders)
    await db.insert(placeholders).values(
      SAMPLE_LABELS.map((label) => ({
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

const entry = process.argv[1]
const isMain = Boolean(entry) && import.meta.url === pathToFileURL(entry).href

if (isMain) {
  const labels = await seedPlaceholders()
  console.log(`Seeded ${labels.length} placeholder rows into .data/db/sqlite.db`)
}
