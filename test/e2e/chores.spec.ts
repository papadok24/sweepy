import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import type { Chore, WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'

describe('chore catalog API', async () => {
  await setupE2e()

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
