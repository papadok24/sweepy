import { rmSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { weekClockAt } from '../../server/utils/week.ts'
import type { Chore, SweepsSnapshot } from '../helpers/api-types.ts'
import { setupE2e, TEST_HOUSEHOLD_TIMEZONE } from '../helpers/e2e-setup.ts'
import {
  insertCompletion,
  previousWeekStart,
  upsertHouseholdTimezone,
} from '../helpers/fixtures.ts'

/** Wednesday 2026-07-15 12:00 CDT — current Week Monday is 2026-07-13. */
const FROZEN_NOW = '2026-07-15T17:00:00.000Z'
const HUB_DIR = '.data/test-sweeps'

/**
 * Seam: GET /api/sweeps snapshot (issue #66 / ADR 0010).
 * Asserts filter windows, quiet Weeks, sticker omission, archived cue, anonymity.
 */
describe('GET /api/sweeps', async () => {
  // Isolated hub must start empty — empty-window case is the first tracer.
  rmSync(HUB_DIR, { recursive: true, force: true })

  await setupE2e({
    frozenNow: FROZEN_NOW,
    hubDir: HUB_DIR,
  })

  const currentWeek = weekClockAt(new Date(FROZEN_NOW), TEST_HOUSEHOLD_TIMEZONE).weekStart

  async function createChore(name: string) {
    return await $fetch<Chore>('/api/chores', {
      method: 'POST',
      body: { name },
    })
  }

  async function assign(choreId: number, dayOfWeek: number) {
    await $fetch(`/api/chores/${choreId}/assignments`, {
      method: 'POST',
      body: { dayOfWeek },
    })
  }

  it('returns empty scrapbook when the window has no sparkles', async () => {
    const snapshot = await $fetch<SweepsSnapshot>('/api/sweeps', {
      query: { filter: 'lately' },
    })

    expect(snapshot).toEqual(
      expect.objectContaining({
        filter: 'lately',
        definition: 'Sparkles from the last 4 Weeks.',
        totalSparkles: 0,
        empty: true,
        peak: null,
        chores: [],
        weeks: [],
      }),
    )
  })

  it('defaults to Lately with 4 Weeks including quiet zeros', async () => {
    const dishes = await createChore(`Sweeps dishes ${Date.now()}`)
    await assign(dishes.id, 0)

    await insertCompletion({
      choreId: dishes.id,
      dayOfWeek: 0,
      weekStart: currentWeek,
    })
    await insertCompletion({
      choreId: dishes.id,
      dayOfWeek: 1,
      weekStart: previousWeekStart(currentWeek),
    })
    const twoBack = previousWeekStart(previousWeekStart(currentWeek))
    const threeBack = previousWeekStart(twoBack)
    await insertCompletion({
      choreId: dishes.id,
      dayOfWeek: 2,
      weekStart: threeBack,
    })

    const snapshot = await $fetch<SweepsSnapshot>('/api/sweeps')

    expect(snapshot.filter).toBe('lately')
    expect(snapshot.definition).toBe('Sparkles from the last 4 Weeks.')
    expect(snapshot.weeks).toHaveLength(4)
    expect(snapshot.weeks.map(w => w.weekId)).toEqual([
      currentWeek,
      previousWeekStart(currentWeek),
      twoBack,
      threeBack,
    ])
    expect(snapshot.weeks[2]).toEqual(
      expect.objectContaining({ sparkles: 0, isCurrent: false, label: expect.any(String) }),
    )
    expect(snapshot.totalSparkles).toBe(3)
    expect(snapshot.empty).toBe(false)
    expect(snapshot.peak?.sparkles).toBe(1)
    expect(snapshot.chores).toEqual([
      expect.objectContaining({
        choreId: dishes.id,
        name: dishes.name,
        sparkles: 3,
      }),
    ])
  })

  it('uses A while as the last 8 Weeks including current', async () => {
    const snapshot = await $fetch<SweepsSnapshot>('/api/sweeps', {
      query: { filter: 'awhile' },
    })
    expect(snapshot.filter).toBe('awhile')
    expect(snapshot.definition).toBe('Sparkles from the last 8 Weeks.')
    expect(snapshot.weeks).toHaveLength(8)
    expect(snapshot.weeks[0]?.weekId).toBe(currentWeek)
    expect(snapshot.weeks[0]?.isCurrent).toBe(true)
  })

  it('Forever omits historical zero Weeks but keeps the current Week', async () => {
    const lonely = await createChore(`Sweeps forever-lonely ${Date.now()}`)
    await assign(lonely.id, 3)

    const farPast = '2026-03-02'
    await insertCompletion({
      choreId: lonely.id,
      dayOfWeek: 3,
      weekStart: farPast,
    })

    const snapshot = await $fetch<SweepsSnapshot>('/api/sweeps', {
      query: { filter: 'forever' },
    })

    expect(snapshot.filter).toBe('forever')
    expect(snapshot.weeks.some(w => w.weekId === farPast && w.sparkles >= 1)).toBe(true)
    expect(snapshot.weeks[0]).toEqual(
      expect.objectContaining({ weekId: currentWeek, isCurrent: true }),
    )
    const zeroHistorical = snapshot.weeks.filter(
      w => !w.isCurrent && w.sparkles === 0,
    )
    expect(zeroHistorical).toEqual([])
  })

  it('omits zero-sparkle chores and includes archived chores with sparkles', async () => {
    const stamp = Date.now()
    const hot = await createChore(`Sweeps hot ${stamp}`)
    const cold = await createChore(`Sweeps cold ${stamp}`)
    const retired = await createChore(`Sweeps retired ${stamp}`)
    await assign(hot.id, 0)
    await assign(cold.id, 1)
    await assign(retired.id, 2)

    // Five sparkles so hot outranks the earlier dishes fixture (3).
    for (const dayOfWeek of [0, 1, 2, 3, 4]) {
      await insertCompletion({
        choreId: hot.id,
        dayOfWeek,
        weekStart: currentWeek,
      })
    }
    await insertCompletion({
      choreId: retired.id,
      dayOfWeek: 2,
      weekStart: currentWeek,
    })
    await $fetch(`/api/chores/${retired.id}/archive`, { method: 'POST' })

    const snapshot = await $fetch<SweepsSnapshot>('/api/sweeps', {
      query: { filter: 'lately' },
    })

    const names = snapshot.chores.map(c => c.name)
    expect(names).toContain(hot.name)
    expect(names).not.toContain(cold.name)
    expect(names).toContain(retired.name)

    expect(snapshot.chores[0]).toEqual(
      expect.objectContaining({
        choreId: hot.id,
        sparkles: 5,
      }),
    )
    expect(snapshot.chores.find(c => c.choreId === retired.id)).toEqual(
      expect.objectContaining({
        sparkles: 1,
        archived: true,
      }),
    )
    expect(snapshot.chores.every(c => c.sparkles > 0)).toBe(true)

    const deadArchive = await createChore(`Sweeps dead-archive ${stamp}`)
    await assign(deadArchive.id, 5)
    await $fetch(`/api/chores/${deadArchive.id}/archive`, { method: 'POST' })
    const afterDead = await $fetch<SweepsSnapshot>('/api/sweeps', {
      query: { filter: 'lately' },
    })
    expect(afterDead.chores.map(c => c.choreId)).not.toContain(deadArchive.id)
  })

  it('never attributes sparkles to members', async () => {
    const snapshot = await $fetch<SweepsSnapshot>('/api/sweeps', {
      query: { filter: 'forever' },
    })
    const json = JSON.stringify(snapshot)
    expect(json).not.toMatch(/member|assignee|userId|completedBy|attribution/i)
    for (const chore of snapshot.chores) {
      expect(chore).not.toHaveProperty('memberId')
      expect(chore).not.toHaveProperty('userId')
      expect(chore).not.toHaveProperty('completedBy')
    }
  })

  it('rejects unknown filters', async () => {
    await expect(
      $fetch('/api/sweeps', { query: { filter: 'dashboard' } }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('follows household timezone current Monday', async () => {
    await upsertHouseholdTimezone(TEST_HOUSEHOLD_TIMEZONE)
    const snapshot = await $fetch<SweepsSnapshot>('/api/sweeps')
    expect(snapshot.weeks[0]?.weekId).toBe(currentWeek)
    expect(snapshot.weeks[0]?.isCurrent).toBe(true)
  })
})
