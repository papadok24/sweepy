import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import { countCompletionsForChore } from '../helpers/fixtures.ts'
import {
  assignChore,
  checkboxSelector,
  createChore,
  editNameSelector,
  findAssignmentById,
  findAssignmentByName,
} from '../helpers/week-board.ts'

/**
 * Seam: Edit Chore + Archive browser contract (PRD #46 / issues #48–#49).
 * Run alone: pnpm exec vitest run test/e2e/edit-chore.spec.ts
 */
describe('edit chore drawer', async () => {
  await setupE2e({ browser: true })

  it('opens Edit from Today and Week name taps; Completion never opens Edit', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const unique = `Edit open ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, today)

    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await page.waitForSelector(editNameSelector(chore.id))

    expect(await page.isVisible('[data-edit-chore-drawer]')).toBe(false)

    await page.click(checkboxSelector(chore.id, today))
    expect(await page.getAttribute('[data-edit-chore-drawer]', 'open')).toBe(null)
    expect(await page.getAttribute(checkboxSelector(chore.id, today), 'aria-checked')).toBe('true')

    await page.click(checkboxSelector(chore.id, today))
    expect(await page.getAttribute('[data-edit-chore-drawer]', 'open')).toBe(null)
    expect(await page.getAttribute(checkboxSelector(chore.id, today), 'aria-checked')).toBe('false')

    await page.locator('#today').locator(editNameSelector(chore.id)).click()
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    expect(await page.isVisible('[data-edit-chore-name]')).toBe(true)
    await page.click('[data-edit-chore-close]')
    await expect
      .poll(async () => page.getAttribute('[data-edit-chore-drawer]', 'open'))
      .toBe(null)

    const otherDay = (today + 1) % 7
    await assignChore(chore.id, otherDay)
    await page.reload()
    await page.waitForSelector('[data-week-ready="true"]')
    await page.waitForSelector(`#week ${editNameSelector(chore.id)}`)

    await page.locator('#week').locator(editNameSelector(chore.id)).first().click()
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    expect(await page.inputValue('[data-edit-chore-name]')).toBe(unique)
  })

  it('hydrates name, notes, and Days from the Week document including Sunday', async () => {
    const unique = `Edit hydrate ${Date.now()}`
    const chore = await $fetch<{ id: number }>('/api/chores', {
      method: 'POST',
      body: {
        name: unique,
        notes: 'wipe the baseboards',
        days: [0, 6],
      },
    })

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')

    expect(await page.inputValue('[data-edit-chore-name]')).toBe(unique)
    expect(await page.inputValue('[data-edit-chore-notes]')).toBe('wipe the baseboards')
    expect(await page.getAttribute('[data-edit-chore-day="0"]', 'aria-pressed')).toBe('true')
    expect(await page.getAttribute('[data-edit-chore-day="6"]', 'aria-pressed')).toBe('true')
    expect(await page.getAttribute('[data-edit-chore-day="1"]', 'aria-pressed')).toBe('false')

    await page.click('[data-edit-chore-day="6"]')
    expect(await page.getAttribute('[data-edit-chore-day="6"]', 'aria-pressed')).toBe('false')
    await page.click('[data-edit-chore-day="6"]')
    expect(await page.getAttribute('[data-edit-chore-day="6"]', 'aria-pressed')).toBe('true')
  })

  it('refuses Save when zero Days are selected', async () => {
    const unique = `Edit zero days ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 2)

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')

    await page.click('[data-edit-chore-day="2"]')
    expect(await page.getAttribute('[data-edit-chore-day="2"]', 'aria-pressed')).toBe('false')
    await page.click('[data-edit-chore-submit]')

    expect(await page.getAttribute('[data-edit-chore-drawer]', 'open')).not.toBe(null)
    expect(await page.isVisible('[data-edit-chore-error]')).toBe(true)

    const week = await $fetch<WeekView>('/api/week')
    expect(findAssignmentById(week, chore.id, 2)?.choreId).toBe(chore.id)
  })

  it('saves name, notes, and Days immediately then closes the drawer', async () => {
    const unique = `Edit save ${Date.now()}`
    const renamed = `${unique} renamed`
    const chore = await createChore(unique)
    await assignChore(chore.id, 0)
    await assignChore(chore.id, 3)

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')

    await page.fill('[data-edit-chore-name]', renamed)
    await page.fill('[data-edit-chore-notes]', 'use the wood cleaner')
    await page.click('[data-edit-chore-day="3"]')
    await page.click('[data-edit-chore-day="5"]')
    await page.click('[data-edit-chore-submit]')

    await expect
      .poll(async () => page.getAttribute('[data-edit-chore-drawer]', 'open'))
      .toBe(null)

    await page.waitForSelector(editNameSelector(chore.id))
    const boardName = await page.locator(editNameSelector(chore.id)).first().textContent()
    expect(boardName?.trim()).toBe(renamed)
    expect(await page.isVisible(checkboxSelector(chore.id, 0))).toBe(true)
    expect(await page.isVisible(checkboxSelector(chore.id, 5))).toBe(true)
    expect(await page.locator(checkboxSelector(chore.id, 3)).count()).toBe(0)

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return {
          mon: findAssignmentByName(week, renamed, 0),
          fri: findAssignmentByName(week, renamed, 5),
          thu: findAssignmentByName(week, renamed, 3),
        }
      })
      .toEqual({
        mon: expect.objectContaining({
          choreId: chore.id,
          choreNotes: 'use the wood cleaner',
        }),
        fri: expect.objectContaining({ choreId: chore.id }),
        thu: undefined,
      })
  })

  it('unassigns a Day with an existing Completion without warning; Completions stay stored', async () => {
    const unique = `Edit unassign ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 1)
    await assignChore(chore.id, 4)

    await $fetch('/api/completions', {
      method: 'POST',
      body: { choreId: chore.id, dayOfWeek: 1 },
    })

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')

    await page.click('[data-edit-chore-day="1"]')
    await page.click('[data-edit-chore-submit]')

    await expect
      .poll(async () => page.getAttribute('[data-edit-chore-drawer]', 'open'))
      .toBe(null)

    expect(await page.locator('[data-edit-chore-error]').count()).toBe(0)
    expect(await page.locator(checkboxSelector(chore.id, 1)).count()).toBe(0)
    expect(await page.isVisible(checkboxSelector(chore.id, 4))).toBe(true)
    expect(await countCompletionsForChore(chore.id)).toBe(1)
  })

  it('rehydrates and shows a sync notice when Edit Save fails', async () => {
    const unique = `Edit reconcile ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 0)

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')

    await page.route(`**/api/chores/${chore.id}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ statusMessage: 'forced failure' }),
        })
        return
      }
      await route.continue()
    })

    await page.fill('[data-edit-chore-name]', `${unique} boom`)
    await page.click('[data-edit-chore-submit]')

    await page.waitForSelector('[data-sync-notice]')
    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentById(week, chore.id, 0)?.choreName
      })
      .toBe(unique)
  })

  it('Archives via a second confirm step; cancel keeps the draft; confirm leaves the board', async () => {
    const unique = `Edit archive ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 2)

    await $fetch('/api/completions', {
      method: 'POST',
      body: { choreId: chore.id, dayOfWeek: 2 },
    })

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')

    await page.fill('[data-edit-chore-name]', `${unique} draft`)
    await page.click('[data-edit-chore-archive]')
    await page.waitForSelector('[data-edit-chore-archive-step]')
    expect(await page.isVisible('[data-edit-chore-archive-copy]')).toBe(true)
    const copy = await page.textContent('[data-edit-chore-archive-copy]')
    expect(copy?.toLowerCase()).toContain('completion')

    await page.click('[data-edit-chore-archive-cancel]')
    await page.waitForSelector('[data-edit-chore-name]')
    expect(await page.inputValue('[data-edit-chore-name]')).toBe(`${unique} draft`)
    expect(await page.getAttribute('[data-edit-chore-drawer]', 'open')).not.toBe(null)

    await page.click('[data-edit-chore-archive]')
    await page.waitForSelector('[data-edit-chore-archive-confirm]')
    await page.click('[data-edit-chore-archive-confirm]')

    await expect
      .poll(async () => page.getAttribute('[data-edit-chore-drawer]', 'open'))
      .toBe(null)

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return week.days.some(d => d.assignments.some(a => a.choreId === chore.id))
      })
      .toBe(false)

    expect(await page.locator(editNameSelector(chore.id)).count()).toBe(0)
    expect(await countCompletionsForChore(chore.id)).toBe(1)
  })
})
