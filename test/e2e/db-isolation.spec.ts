import { describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { $fetch } from '@nuxt/test-utils/e2e'
import type { Chore } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  DEV_SQLITE_URL,
  TEST_SQLITE_URL,
  ensureSqliteDir,
} from '../helpers/sqlite.ts'

async function choreCount(url: string): Promise<number | null> {
  ensureSqliteDir(url)
  const client = createClient({ url })
  try {
    const result = await client.execute('SELECT COUNT(*) AS n FROM chores')
    return Number(result.rows[0]?.n ?? 0)
  }
  catch {
    // Dev DB may be missing the chores table if never migrated — treat as 0.
    return null
  }
  finally {
    client.close()
  }
}

/**
 * Seam: e2e must not mutate the development SQLite file used by `pnpm dev`.
 */
describe('e2e database isolation', async () => {
  await setupE2e()

  it('writes chores to the test DB and leaves the development DB unchanged', async () => {
    const beforeDev = await choreCount(DEV_SQLITE_URL)
    const beforeTest = await choreCount(TEST_SQLITE_URL)

    const created = await $fetch<Chore>('/api/chores', {
      method: 'POST',
      body: { name: `Isolation probe ${Date.now()}` },
    })

    expect(created.id).toEqual(expect.any(Number))

    const afterDev = await choreCount(DEV_SQLITE_URL)
    const afterTest = await choreCount(TEST_SQLITE_URL)

    expect(afterDev).toBe(beforeDev)
    expect(afterTest).toBe((beforeTest ?? 0) + 1)
  })
})
