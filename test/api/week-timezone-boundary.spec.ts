import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { weekClockAt } from '../../server/utils/week.ts'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e, TEST_HOUSEHOLD_TIMEZONE } from '../helpers/e2e-setup.ts'

/** Sunday 2026-07-12 23:59:59.999 CDT — still prior Week in America/Chicago */
const FROZEN_BEFORE_MONDAY = '2026-07-13T04:59:59.999Z'

/**
 * Frozen-clock HTTP seam for household Week boundaries (issue #32).
 */
describe('GET /api/week household timezone boundaries', async () => {
  await setupE2e({
    frozenNow: FROZEN_BEFORE_MONDAY,
    hubDir: '.data/test-week-tz',
  })

  it('returns weekStart and todayDayOfWeek for the frozen household instant', async () => {
    const expected = weekClockAt(
      new Date(FROZEN_BEFORE_MONDAY),
      TEST_HOUSEHOLD_TIMEZONE,
    )

    const week = await $fetch<WeekView>('/api/week')

    expect(week.weekStart).toBe(expected.weekStart)
    expect(week.todayDayOfWeek).toBe(expected.todayDayOfWeek)
    expect(week).toEqual(
      expect.objectContaining({
        weekStart: '2026-07-06',
        todayDayOfWeek: 6,
      }),
    )
  })
})
