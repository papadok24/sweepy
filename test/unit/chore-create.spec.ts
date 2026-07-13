import { drizzle } from 'drizzle-orm/d1'
import { describe, expect, it, vi } from 'vitest'
import * as schema from '../../server/db/schema'
import { choreWithDaysBatchQueries } from '../../server/utils/chore-create'
import type { DayOfWeek } from '../../server/utils/chore-schemas'

describe('chore creation queries', () => {
  it('prepares the assignment insert for an atomic D1 batch', async () => {
    const statement = {
      bind: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
      raw: vi.fn(),
      first: vi.fn(),
    }
    statement.bind.mockReturnValue(statement)

    const batch = vi.fn().mockResolvedValue([
      {
        success: true,
        results: [{
          id: 1,
          name: 'Vacuum',
          notes: null,
          active: 1,
          created_at: 1,
        }],
        meta: {},
      },
      { success: true, results: [], meta: {} },
    ])
    const client = {
      prepare: vi.fn().mockReturnValue(statement),
      batch,
    } as Parameters<typeof drizzle>[0]
    const database = drizzle(client, { schema })

    const days: DayOfWeek[] = [0, 3, 6]
    await expect(database.batch(
      choreWithDaysBatchQueries(
        database,
        { name: 'Vacuum', notes: null },
        days,
      ),
    )).resolves.toBeDefined()

    expect(batch).toHaveBeenCalledOnce()
  })
})
