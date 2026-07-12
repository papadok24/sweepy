import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'

/**
 * Seam: add-chore bottom drawer browser contract (issue #27).
 * Open drawer, validate form, atomic create+assign, refresh board.
 */
describe('add chore bottom drawer', async () => {
  await setupE2e({ browser: true })

  function findAssignment(week: WeekView, choreName: string, dayOfWeek: number) {
    return week.days
      .find(d => d.dayOfWeek === dayOfWeek)
      ?.assignments.find(a => a.choreName === choreName)
  }

  function checkboxSelector(choreId: number, dayOfWeek: number) {
    return `[data-week-chore="${choreId}"][data-day-of-week="${dayOfWeek}"]`
  }

  it('opens the drawer from the nav Add chore button', async () => {
    const page = await createPage('/')
    await page.waitForSelector('[data-design-shell]')
    await page.waitForSelector('[data-add-chore-open]')

    expect(await page.isVisible('[data-add-chore-drawer]')).toBe(false)

    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    expect(await page.isVisible('[data-add-chore-name]')).toBe(true)
  })

  it('submits name, notes, and days then shows the chore on the board', async () => {
    const unique = `Drawer create ${Date.now()}`
    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')

    await page.fill('[data-add-chore-name]', unique)
    await page.fill('[data-add-chore-notes]', 'use the wood cleaner')
    await page.click('[data-add-chore-day="0"]')
    await page.click('[data-add-chore-day="3"]')
    await page.click('[data-add-chore-submit]')

    await expect
      .poll(async () => page.getAttribute('[data-add-chore-drawer]', 'open'))
      .toBe(null)
    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignment(week, unique, 0)?.choreId
      })
      .toEqual(expect.any(Number))

    const week = await $fetch<WeekView>('/api/week')
    const choreId = findAssignment(week, unique, 0)!.choreId
    expect(findAssignment(week, unique, 3)?.choreId).toBe(choreId)
    expect(findAssignment(week, unique, 1)).toBeUndefined()

    await page.waitForSelector(checkboxSelector(choreId, 0))
    await page.waitForSelector(checkboxSelector(choreId, 3))
    expect(await page.getAttribute(checkboxSelector(choreId, 0), 'aria-checked')).toBe('false')
  })

  it('blocks submit when no day is selected', async () => {
    const unique = `No days ${Date.now()}`
    const page = await createPage('/')
    await page.waitForSelector('[data-add-chore-open]')
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')

    await page.fill('[data-add-chore-name]', unique)
    await page.click('[data-add-chore-submit]')

    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
    expect(await page.isVisible('[data-add-chore-error]')).toBe(true)

    const week = await $fetch<WeekView>('/api/week')
    for (const day of week.days) {
      expect(day.assignments.find(a => a.choreName === unique)).toBeUndefined()
    }
  })

  it('keeps the drawer open with input intact when save fails', async () => {
    const unique = `Failed save ${Date.now()}`
    const page = await createPage('/')
    await page.waitForSelector('[data-add-chore-open]')
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')

    await page.fill('[data-add-chore-name]', unique)
    await page.fill('[data-add-chore-notes]', 'keep me')
    await page.click('[data-add-chore-day="1"]')

    await page.route('**/api/chores', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ statusMessage: 'forced failure' }),
        })
        return
      }
      await route.continue()
    })

    await page.click('[data-add-chore-submit]')
    await page.waitForSelector('[data-add-chore-error]')

    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
    expect(await page.inputValue('[data-add-chore-name]')).toBe(unique)
    expect(await page.inputValue('[data-add-chore-notes]')).toBe('keep me')
    expect(await page.getAttribute('[data-add-chore-day="1"]', 'aria-pressed')).toBe('true')
  })
})
