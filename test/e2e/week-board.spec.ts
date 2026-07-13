import { describe, expect, it } from 'vitest'
import { $fetch, createPage, url } from '@nuxt/test-utils/e2e'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  assignChore,
  checkboxSelector,
  createChore,
  findAssignmentById,
} from '../helpers/week-board.ts'

/**
 * Seam: week board browser contract (issue #17).
 * Hydrate, optimistic completion toggle, persist, and failed-write reconcile.
 */
describe('week board local-first completions', async () => {
  await setupE2e({ browser: true })

  it('hydrates real assignments, toggles optimistically, and persists completions', async () => {
    const unique = `Board hydrate ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 0) // Monday

    const page = await createPage('/')
    await page.waitForSelector('[data-design-shell]')
    await page.waitForSelector(checkboxSelector(chore.id, 0))

    const visibleName = await page.evaluate((name) => {
      return Boolean(
        [...document.querySelectorAll('*')].some(el => el.textContent?.includes(name)),
      )
    }, unique)
    expect(visibleName).toBe(true)

    expect(await page.getAttribute(checkboxSelector(chore.id, 0), 'aria-checked')).toBe('false')

    await page.click(checkboxSelector(chore.id, 0))
    expect(await page.getAttribute(checkboxSelector(chore.id, 0), 'aria-checked')).toBe('true')

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentById(week, chore.id, 0)?.completed ?? false
      })
      .toBe(true)

    await page.click(checkboxSelector(chore.id, 0))
    expect(await page.getAttribute(checkboxSelector(chore.id, 0), 'aria-checked')).toBe('false')

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentById(week, chore.id, 0)?.completed ?? true
      })
      .toBe(false)
  })

  it('SSR first paint matches client hydration (no Vue mismatch warnings)', async () => {
    // Assign to "today" so Today is a <ul> on both sides when indexes agree;
    // a divergent apiDayOfWeek() would render empty-state vs ul (the bug).
    const today = (new Date().getDay() + 6) % 7
    const unique = `Hydration match ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, today)

    const hydrationWarnings: string[] = []
    const page = await createPage()
    page.on('console', (msg) => {
      const text = msg.text()
      if (/hydration/i.test(text)) {
        hydrationWarnings.push(text)
      }
    })

    await page.goto(url('/'), { waitUntil: 'hydration' })
    await page.waitForSelector('[data-week-ready="true"]')
    await page.waitForSelector(checkboxSelector(chore.id, today))

    expect(hydrationWarnings).toEqual([])
  })

  it('rehydrates and shows a sync notice when a completion write fails', async () => {
    const unique = `Board reconcile ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 1) // Tuesday

    const page = await createPage('/')
    await page.waitForSelector(checkboxSelector(chore.id, 1))

    await page.route('**/api/completions', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusMessage: 'forced failure' }),
      })
    })

    await page.click(checkboxSelector(chore.id, 1))
    await page.waitForSelector('[data-sync-notice]')

    await expect
      .poll(async () => page.getAttribute(checkboxSelector(chore.id, 1), 'aria-checked'))
      .toBe('false')

    const week = await $fetch<WeekView>('/api/week')
    expect(findAssignmentById(week, chore.id, 1)?.completed).toBe(false)
  })
})
