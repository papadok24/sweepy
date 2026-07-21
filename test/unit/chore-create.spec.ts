import { drizzle } from 'drizzle-orm/d1'
import { describe, expect, it, vi } from 'vitest'
import * as schema from '../../server/db/schema'
import {
  buildAssignmentSelect,
  choreWithDaysBatchQueries,
} from '../../server/utils/chore-create'
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

  it('uses VALUES for seven days without UNION ALL (D1 compound-select cap)', () => {
    const days: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]
    const { sql: query, params } = drizzle({} as never, { schema })
      .insert(schema.choreAssignments)
      .select(buildAssignmentSelect(days))
      .toSQL()

    expect(query).toMatch(/values/i)
    expect(query).not.toMatch(/union all/i)
    expect(params).toEqual(days)
  })
})
