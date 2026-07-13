import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { describe, expect, it, vi } from 'vitest'
import * as schema from '../../server/db/schema'

/**
 * Seam: Drizzle D1 driver write terminals (ADR 0001).
 * Bare await of delete/insert builders can hang Workers; `.returning()` /
 * `.run()` must be used so the driver calls stmt.all / stmt.run.
 */
describe('D1 write terminal methods', () => {
  function mockD1() {
    const statement = {
      bind: vi.fn(),
      run: vi.fn().mockResolvedValue({ success: true, meta: {}, results: [] }),
      all: vi.fn().mockResolvedValue({ success: true, meta: {}, results: [] }),
      // `.returning()` uses stmt.raw() then maps rows
      raw: vi.fn().mockResolvedValue([]),
      first: vi.fn(),
    }
    statement.bind.mockReturnValue(statement)

    const client = {
      prepare: vi.fn().mockReturnValue(statement),
      batch: vi.fn(),
    } as Parameters<typeof drizzle>[0]

    return { statement, database: drizzle(client, { schema }) }
  }

  it('settles completion uncheck via delete().returning() (stmt.raw)', async () => {
    const { statement, database } = mockD1()

    await expect(
      database
        .delete(schema.completions)
        .where(and(
          eq(schema.completions.choreId, 1),
          eq(schema.completions.dayOfWeek, 0),
          eq(schema.completions.weekStart, '2026-07-13'),
        ))
        .returning(),
    ).resolves.toEqual([])

    expect(statement.raw).toHaveBeenCalledOnce()
    expect(statement.run).not.toHaveBeenCalled()
  })

  it('settles settings seed via insert().run() (stmt.run)', async () => {
    const { statement, database } = mockD1()

    await expect(
      database.insert(schema.householdSettings).values({
        id: 1,
        timezone: 'America/Chicago',
      }).run(),
    ).resolves.toMatchObject({ success: true })

    expect(statement.run).toHaveBeenCalledOnce()
  })
})
