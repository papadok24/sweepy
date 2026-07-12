import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { seedPlaceholders } from '../../scripts/seed.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import { TEST_SQLITE_URL } from '../helpers/sqlite.ts'

describe('GET /api/placeholders', async () => {
  await setupE2e()

  it('returns placeholder rows with id, label, and createdAt', async () => {
    const labels = await seedPlaceholders({ url: TEST_SQLITE_URL })

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
