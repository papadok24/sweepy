import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import type { Chore } from '../helpers/api-types.ts'

describe('chore catalog API', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: false,
  })

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
