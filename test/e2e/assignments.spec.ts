import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import type { Assignment, Chore } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'

describe('day-bucket assignments API', async () => {
  await setupE2e()

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
