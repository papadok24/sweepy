import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import {
  choreAssignments,
  chores,
  completions,
  placeholders,
} from '../server/db/schema.ts'
import { weekStartFor } from '../server/utils/week.ts'
import {
  DEV_SQLITE_URL,
  ensureSqliteDir,
  resolveSqliteUrl,
} from './local-sqlite.ts'

const SAMPLE_LABELS = ['alpha', 'beta', 'gamma'] as const

/** dayOfWeek: 0 = Monday … 6 = Sunday */
const SAMPLE_CHORES: ReadonlyArray<{
  name: string
  notes?: string
  days: ReadonlyArray<number>
  /** Mark complete for the current week on these days (subset of `days`). */
  doneThisWeek?: ReadonlyArray<number>
}> = [
  { name: 'Dishes', days: [0, 1, 2, 3, 4, 5], doneThisWeek: [0, 1] },
  { name: 'Kitchen counters', notes: 'Wipe after dinner', days: [0, 2, 4] },
  { name: 'Vacuum living room', days: [2], doneThisWeek: [2] },
  { name: 'Laundry', notes: 'Wash + fold', days: [0, 3] },
  { name: 'Trash & recycling', days: [1, 4] },
  { name: 'Bathrooms', notes: 'Sinks, toilet, quick floor', days: [5] },
  { name: 'Change bed sheets', days: [6] },
  { name: 'Mop kitchen', days: [5] },
]

/**
 * Wipes local SQLite domain tables and loads a fresh development dataset.
 * Requires migrations to have been applied (e.g. via `pnpm db:migrate`).
 * Uses `SWEEPY_SQLITE_URL` when set (e2e), otherwise `.data/db/sqlite.db`.
 */
export async function seedPlaceholders(options?: { url?: string }) {
  const url = options?.url ?? resolveSqliteUrl(DEV_SQLITE_URL)
  ensureSqliteDir(url)

  const client = createClient({ url })
  const db = drizzle(client)

  try {
    // Children first — FKs from assignments/completions → chores
    await db.delete(completions)
    await db.delete(choreAssignments)
    await db.delete(chores)
    await db.delete(placeholders)

    await db.insert(placeholders).values(
      SAMPLE_LABELS.map(label => ({
        label,
        createdAt: Date.now(),
      })),
    )

    const weekStart = weekStartFor()
    const now = Date.now()

    for (const sample of SAMPLE_CHORES) {
      const [chore] = await db.insert(chores).values({
        name: sample.name,
        notes: sample.notes ?? null,
        active: true,
        createdAt: now,
      }).returning()

      if (!chore) {
        throw new Error(`Failed to insert chore: ${sample.name}`)
      }

      if (sample.days.length > 0) {
        await db.insert(choreAssignments).values(
          sample.days.map(dayOfWeek => ({
            choreId: chore.id,
            dayOfWeek,
          })),
        )
      }

      const doneDays = sample.doneThisWeek ?? []
      if (doneDays.length > 0) {
        await db.insert(completions).values(
          doneDays.map(dayOfWeek => ({
            choreId: chore.id,
            dayOfWeek,
            weekStart,
            completedAt: now,
          })),
        )
      }
    }
  }
  finally {
    client.close()
  }

  return [...SAMPLE_LABELS]
}

const entry = process.argv[1]
const isMain = Boolean(entry) && import.meta.url === pathToFileURL(entry).href

if (isMain) {
  const url = resolveSqliteUrl(DEV_SQLITE_URL)
  const labels = await seedPlaceholders({ url })
  console.log(
    `Reset local DB and seeded ${SAMPLE_CHORES.length} chores + ${labels.length} placeholders into ${url}`,
  )
}
