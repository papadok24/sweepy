import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { seedPlaceholders } from '../../scripts/seed.ts'

describe('GET /api/placeholders', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: false,
  })

  it('returns placeholder rows with id, label, and createdAt', async () => {
    const labels = await seedPlaceholders()

    const rows = await $fetch('/api/placeholders')

    expect(rows).toEqual(
      expect.arrayContaining(
        labels.map((label) =>
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
