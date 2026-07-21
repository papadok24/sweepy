import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  assignChore,
  checkboxSelector,
  createChore,
  editNameSelector,
  takeRainCheck,
} from '../helpers/week-board.ts'

/**
 * Seam: Week-scoped Rain check board + Edit drawer (issue #98).
 * Run alone: pnpm exec vitest run test/e2e/rain-check.spec.ts
 */
describe('rain check on week board', async () => {
  await setupE2e({
    browser: true,
    hubDir: `.data/test-rain-check-${process.pid}-${Date.now()}`,
  })

  it('mutes rain-checked rows without checkbox; Edit can take and clear', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const unique = `Rain check board ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, today)

    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    const todayCheckbox = page.locator('#today').locator(checkboxSelector(chore.id, today))
    await todayCheckbox.waitFor()

    await page.locator('#today').locator(editNameSelector(chore.id)).click()
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    expect(await page.textContent('[data-edit-chore-rain-check]')).toContain(
      'Rain check this week',
    )

    await page.click('[data-edit-chore-rain-check]')
    await expect
      .poll(async () => page.locator('#today [data-rain-check="true"]').count())
      .toBeGreaterThan(0)

    expect(await todayCheckbox.count()).toBe(0)
    expect(await page.locator('#today [data-rain-check-cue]').first().textContent())
      .toContain('Rain check this week')
    // Week board also mutes the same Chore (chore-wide).
    expect(await page.locator('#week [data-rain-check="true"]').count()).toBeGreaterThan(0)
    expect(await page.locator('#week').locator(checkboxSelector(chore.id, today)).count()).toBe(0)

    await page.click('[data-edit-chore-close]')
    await expect
      .poll(async () => page.getAttribute('[data-edit-chore-drawer]', 'open'))
      .toBe(null)

    // Edit still opens from the muted name.
    await page.locator('#today').locator(editNameSelector(chore.id)).click()
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    expect(await page.textContent('[data-edit-chore-rain-check]')).toContain(
      'Clear rain check',
    )

    await page.click('[data-edit-chore-rain-check]')
    await expect.poll(async () => todayCheckbox.count()).toBe(1)
    expect(await page.locator('#today [data-rain-check="true"]').count()).toBe(0)
  })

  it('excludes rain-checked today slots from Full sweep; all-rain-checked today does not cheer', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const stamp = Date.now()
    const checkable = await createChore(`Rain Full sweep A ${stamp}`)
    const sitting = await createChore(`Rain Full sweep B ${stamp}`)
    await assignChore(checkable.id, today)
    await assignChore(sitting.id, today)
    await takeRainCheck(sitting.id)

    // Rain-check every other today slot so only `checkable` remains in the denominator.
    const fresh = await $fetch<WeekView>('/api/week')
    for (const slot of fresh.days.find(d => d.dayOfWeek === today)?.assignments ?? []) {
      if (slot.choreId !== checkable.id && !slot.rainChecked) {
        await takeRainCheck(slot.choreId)
      }
    }

    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    const checkableBox = page.locator('#today').locator(checkboxSelector(checkable.id, today))
    await checkableBox.waitFor()

    expect(await page.locator('#today').locator(checkboxSelector(sitting.id, today)).count()).toBe(0)
    expect(await page.locator('#today .completion').count()).toBe(1)

    await checkableBox.click()
    await page.waitForSelector('[data-full-sweep-overlay]')
    expect(await page.locator('[data-full-sweep-overlay]').count()).toBe(1)

    await takeRainCheck(checkable.id)

    await page.reload()
    await page.waitForSelector('[data-week-ready="true"]')
    expect(await page.locator('#today [data-rain-check="true"]').count()).toBeGreaterThan(0)
    expect(await page.locator('#today .completion').count()).toBe(0)
    expect(await page.locator('[data-full-sweep-overlay]').count()).toBe(0)
  })
})
