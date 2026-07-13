import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { seedPlaceholders } from '../../scripts/seed.ts'
import { weekStartFor } from '../../server/utils/week.ts'
import type { Assignment, Chore, Completion, WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  countCompletionsForChore,
  insertCompletion,
  previousWeekStart,
} from '../helpers/fixtures.ts'
import {
  DEV_SQLITE_URL,
  TEST_SQLITE_URL,
  ensureSqliteDir,
} from '../helpers/sqlite.ts'

/**
 * All `$fetch` API suites share one Nuxt boot (no browser).
 */
describe('API server', async () => {
  await setupE2e()

  describe('chore catalog API', () => {
    function findAssignment(week: WeekView, choreId: number, dayOfWeek: number) {
      return week.days
        .find(d => d.dayOfWeek === dayOfWeek)
        ?.assignments.find(a => a.choreId === choreId)
    }

    it('creates a chore and lists it among active chores', async () => {
      const created = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name: 'Dishes', notes: 'use the wood cleaner' },
      })

      expect(created).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: 'Dishes',
          notes: 'use the wood cleaner',
          active: true,
          createdAt: expect.any(Number),
        }),
      )

      const list = await $fetch<Chore[]>('/api/chores')
      expect(list).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: created.id, name: 'Dishes', active: true }),
        ]),
      )
    })

    it('creates a chore with days and shows it in those week buckets', async () => {
      const created = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: {
          name: 'Vacuum living room',
          notes: 'use the wood cleaner',
          days: [0, 3, 6],
        },
      })

      expect(created).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: 'Vacuum living room',
          notes: 'use the wood cleaner',
          active: true,
        }),
      )

      const week = await $fetch<WeekView>('/api/week')
      expect(findAssignment(week, created.id, 0)).toEqual(
        expect.objectContaining({
          choreId: created.id,
          choreName: 'Vacuum living room',
          choreNotes: 'use the wood cleaner',
          completed: false,
        }),
      )
      expect(findAssignment(week, created.id, 3)?.choreId).toBe(created.id)
      expect(findAssignment(week, created.id, 6)?.choreId).toBe(created.id)
      expect(findAssignment(week, created.id, 1)).toBeUndefined()
    })

    it('omitting days still creates an unassigned chore', async () => {
      const created = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name: 'Unscheduled deep clean' },
      })

      const week = await $fetch<WeekView>('/api/week')
      for (const day of week.days) {
        expect(day.assignments.find(a => a.choreId === created.id)).toBeUndefined()
      }
    })

    it('deduplicates duplicate day values when creating with days', async () => {
      const created = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name: 'Take out trash', days: [4, 4, 1] },
      })

      const week = await $fetch<WeekView>('/api/week')
      const thursday = week.days.find(d => d.dayOfWeek === 4)?.assignments
        .filter(a => a.choreId === created.id) ?? []
      expect(thursday).toHaveLength(1)
      expect(findAssignment(week, created.id, 1)?.choreId).toBe(created.id)
    })

    it('rejects out-of-range day values without creating a chore', async () => {
      const unique = `Bad day chore ${Date.now()}`
      const before = await $fetch<Chore[]>('/api/chores')

      await expect(
        $fetch('/api/chores', {
          method: 'POST',
          body: { name: unique, days: [0, 7] },
        }),
      ).rejects.toMatchObject({ statusCode: 400 })

      const after = await $fetch<Chore[]>('/api/chores')
      expect(after.map(c => c.name)).not.toContain(unique)
      expect(after).toHaveLength(before.length)
    })

    it('updates a chore name and notes', async () => {
      const created = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name: 'Vacuum' },
      })

      const updated = await $fetch<Chore>(`/api/chores/${created.id}`, {
        method: 'PATCH',
        body: { name: 'Vacuum living room', notes: 'move the chairs' },
      })

      expect(updated).toEqual(
        expect.objectContaining({
          id: created.id,
          name: 'Vacuum living room',
          notes: 'move the chairs',
          active: true,
        }),
      )

      const list = await $fetch<Chore[]>('/api/chores')
      expect(list.find(c => c.id === created.id)).toEqual(
        expect.objectContaining({
          name: 'Vacuum living room',
          notes: 'move the chairs',
        }),
      )
    })

    it('archives a chore so it leaves the active list', async () => {
      const created = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name: 'Mop floors' },
      })

      const archived = await $fetch<Chore>(`/api/chores/${created.id}/archive`, {
        method: 'POST',
      })

      expect(archived).toEqual(
        expect.objectContaining({ id: created.id, active: false }),
      )

      const list = await $fetch<Chore[]>('/api/chores')
      expect(list.find(c => c.id === created.id)).toBeUndefined()
    })

    it('rejects invalid create bodies', async () => {
      await expect(
        $fetch('/api/chores', { method: 'POST', body: { name: '' } }),
      ).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  describe('day-bucket assignments API', () => {
    async function createChore(name: string) {
      return await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name },
      })
    }

    it('assigns a chore to a day and supports multi-day assignment including Sunday', async () => {
      const chore = await createChore('Dishes')

      const monday = await $fetch<Assignment>(`/api/chores/${chore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: 0 },
      })
      expect(monday).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          choreId: chore.id,
          dayOfWeek: 0,
        }),
      )

      const thursday = await $fetch<Assignment>(`/api/chores/${chore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: 3 },
      })
      expect(thursday.dayOfWeek).toBe(3)

      const sunday = await $fetch<Assignment>(`/api/chores/${chore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: 6 },
      })
      expect(sunday.dayOfWeek).toBe(6)
    })

    it('rejects duplicate (chore, day) assignments with 409', async () => {
      const chore = await createChore('Laundry')

      await $fetch(`/api/chores/${chore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: 1 },
      })

      await expect(
        $fetch(`/api/chores/${chore.id}/assignments`, {
          method: 'POST',
          body: { dayOfWeek: 1 },
        }),
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('removes an assignment from a day bucket', async () => {
      const chore = await createChore('Trash')

      await $fetch(`/api/chores/${chore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: 2 },
      })
      await $fetch(`/api/chores/${chore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: 4 },
      })

      await $fetch(`/api/chores/${chore.id}/assignments/2`, {
        method: 'DELETE',
      })

      const readded = await $fetch<Assignment>(`/api/chores/${chore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: 2 },
      })
      expect(readded.dayOfWeek).toBe(2)

      await expect(
        $fetch(`/api/chores/${chore.id}/assignments`, {
          method: 'POST',
          body: { dayOfWeek: 4 },
        }),
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('rejects invalid dayOfWeek values', async () => {
      const chore = await createChore('Windows')

      await expect(
        $fetch(`/api/chores/${chore.id}/assignments`, {
          method: 'POST',
          body: { dayOfWeek: 7 },
        }),
      ).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  describe('week view and completions API', () => {
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

    function findAssignment(week: WeekView, choreId: number, dayOfWeek: number) {
      return week.days
        .find(d => d.dayOfWeek === dayOfWeek)
        ?.assignments.find(a => a.choreId === choreId)
    }

    it('returns the current week schedule grouped by day with completion status', async () => {
      const chore = await createChore('Dishes')
      await assign(chore.id, 0)
      await assign(chore.id, 3)

      const week = await $fetch<WeekView>('/api/week')

      expect(week.weekStart).toBe(weekStartFor())
      expect(week.days).toHaveLength(7)
      expect(findAssignment(week, chore.id, 0)).toEqual(
        expect.objectContaining({
          choreId: chore.id,
          choreName: 'Dishes',
          completed: false,
          completedAt: null,
        }),
      )
      expect(findAssignment(week, chore.id, 3)).toEqual(
        expect.objectContaining({ choreId: chore.id, completed: false }),
      )
    })

    it('completes an assignment for the current week and rejects a second completion', async () => {
      const chore = await createChore('Vacuum')
      await assign(chore.id, 1)

      const completion = await $fetch<Completion>('/api/completions', {
        method: 'POST',
        body: { choreId: chore.id, dayOfWeek: 1 },
      })

      expect(completion).toEqual(
        expect.objectContaining({
          choreId: chore.id,
          dayOfWeek: 1,
          weekStart: weekStartFor(),
          completedAt: expect.any(Number),
        }),
      )

      const week = await $fetch<WeekView>('/api/week')
      expect(findAssignment(week, chore.id, 1)?.completed).toBe(true)

      await expect(
        $fetch('/api/completions', {
          method: 'POST',
          body: { choreId: chore.id, dayOfWeek: 1 },
        }),
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('unchecks by deleting the completion so it can be completed again', async () => {
      const chore = await createChore('Laundry')
      await assign(chore.id, 2)

      await $fetch('/api/completions', {
        method: 'POST',
        body: { choreId: chore.id, dayOfWeek: 2 },
      })

      await $fetch('/api/completions', {
        method: 'DELETE',
        body: { choreId: chore.id, dayOfWeek: 2 },
      })

      // Idempotent: unchecking again still succeeds
      await $fetch('/api/completions', {
        method: 'DELETE',
        body: { choreId: chore.id, dayOfWeek: 2 },
      })

      const weekAfterUncheck = await $fetch<WeekView>('/api/week')
      expect(findAssignment(weekAfterUncheck, chore.id, 2)?.completed).toBe(false)

      const again = await $fetch<Completion>('/api/completions', {
        method: 'POST',
        body: { choreId: chore.id, dayOfWeek: 2 },
      })
      expect(again.choreId).toBe(chore.id)
    })

    it('keeps completion history after assignment removal', async () => {
      const chore = await createChore('Trash')
      await assign(chore.id, 4)

      await $fetch('/api/completions', {
        method: 'POST',
        body: { choreId: chore.id, dayOfWeek: 4 },
      })

      await $fetch(`/api/chores/${chore.id}/assignments/4`, { method: 'DELETE' })

      let week = await $fetch<WeekView>('/api/week')
      expect(findAssignment(week, chore.id, 4)).toBeUndefined()

      await assign(chore.id, 4)
      week = await $fetch<WeekView>('/api/week')
      expect(findAssignment(week, chore.id, 4)?.completed).toBe(true)
    })

    it('hides archived chores from the week view but retains their completions', async () => {
      const chore = await createChore('Mop')
      await assign(chore.id, 5)

      await $fetch('/api/completions', {
        method: 'POST',
        body: { choreId: chore.id, dayOfWeek: 5 },
      })

      await $fetch(`/api/chores/${chore.id}/archive`, { method: 'POST' })

      const week = await $fetch<WeekView>('/api/week')
      expect(findAssignment(week, chore.id, 5)).toBeUndefined()

      // Archive only flips active — completion rows remain (ADR 0003).
      expect(await countCompletionsForChore(chore.id)).toBe(1)
    })

    it('does not mark this week complete from a prior-week completion', async () => {
      const chore = await createChore('Windows')
      await assign(chore.id, 0)

      await insertCompletion({
        choreId: chore.id,
        dayOfWeek: 0,
        weekStart: previousWeekStart(weekStartFor()),
      })

      const week = await $fetch<WeekView>('/api/week')
      expect(findAssignment(week, chore.id, 0)?.completed).toBe(false)
    })
  })

  describe('GET /api/placeholders', () => {
    it('returns placeholder rows with id, label, and createdAt', async () => {
      const labels = await seedPlaceholders({ url: TEST_SQLITE_URL })

      const rows = await $fetch('/api/placeholders')

      expect(rows).toEqual(
        expect.arrayContaining(
          labels.map(label =>
            expect.objectContaining({
              id: expect.any(Number),
              label,
              createdAt: expect.any(Number),
            }),
          ),
        ),
      )
    })
  })

  describe('e2e database isolation', () => {
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
})
