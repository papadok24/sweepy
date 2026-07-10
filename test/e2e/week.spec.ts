import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { insertCompletion } from '../../scripts/seed.ts'
import { previousWeekStart, weekStartFor } from '../../server/utils/week.ts'

type Chore = {
  id: number
  name: string
  notes: string | null
  active: boolean
  createdAt: number
}

type Completion = {
  id: number
  choreId: number
  dayOfWeek: number
  weekStart: string
  completedAt: number
}

type WeekView = {
  weekStart: string
  days: Array<{
    dayOfWeek: number
    assignments: Array<{
      choreId: number
      choreName: string
      choreNotes: string | null
      completed: boolean
      completedAt: number | null
    }>
  }>
}

describe('week view and completions API', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: false,
  })

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

    // Assignment gone from the schedule…
    let week = await $fetch<WeekView>('/api/week')
    expect(findAssignment(week, chore.id, 4)).toBeUndefined()

    // …but re-adding resurfaces the existing completion
    await assign(chore.id, 4)
    week = await $fetch<WeekView>('/api/week')
    expect(findAssignment(week, chore.id, 4)?.completed).toBe(true)
  })

  it('hides archived chores from the week view', async () => {
    const chore = await createChore('Mop')
    await assign(chore.id, 5)

    await $fetch('/api/completions', {
      method: 'POST',
      body: { choreId: chore.id, dayOfWeek: 5 },
    })

    await $fetch(`/api/chores/${chore.id}/archive`, { method: 'POST' })

    const week = await $fetch<WeekView>('/api/week')
    expect(findAssignment(week, chore.id, 5)).toBeUndefined()
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
