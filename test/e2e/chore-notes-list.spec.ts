import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import {
  LIST_ITEM_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  NOTES_TOO_LONG_HINT,
} from '../../app/utils/chore-limits.ts'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  assignChore,
  createChore,
  editNameSelector,
} from '../helpers/week-board.ts'

/**
 * Seam: multi-line Notes + List + Today cue (PRD #78 / #79–#81).
 * Run alone: pnpm exec vitest run test/e2e/chore-notes-list.spec.ts
 */
describe('chore notes and list', async () => {
  await setupE2e({ browser: true })

  it('uses multi-line Notes on Add and Edit and round-trips newlines', async () => {
    const unique = `Notes multiline ${Date.now()}`
    const notes = 'line one\nline two\nline three'

    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')

    const addTag = await page.locator('[data-add-chore-notes]').evaluate(
      el => el.tagName,
    )
    expect(addTag).toBe('TEXTAREA')
    expect(await page.getAttribute('[data-add-chore-notes]', 'placeholder')).toBe(
      'Add notes',
    )

    await page.fill('[data-add-chore-name]', unique)
    await page.fill('[data-add-chore-notes]', notes)
    await page.click('[data-add-chore-day="0"]')
    await page.click('[data-add-chore-submit]')
    await expect
      .poll(async () => page.getAttribute('[data-add-chore-drawer]', 'open'))
      .toBe(null)

    const week = await $fetch<WeekView>('/api/week')
    const created = week.days
      .flatMap(d => d.assignments)
      .find(a => a.choreName === unique)
    expect(created?.choreNotes).toBe(notes)

    await page.click(editNameSelector(created!.choreId))
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    const editTag = await page.locator('[data-edit-chore-notes]').evaluate(
      el => el.tagName,
    )
    expect(editTag).toBe('TEXTAREA')
    expect(await page.inputValue('[data-edit-chore-notes]')).toBe(notes)
    expect(await page.getAttribute('[data-edit-chore-notes]', 'placeholder')).toBe(
      'Add notes',
    )
  })

  it('soft-fails Notes over 4000 characters with an on-theme hint', async () => {
    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')

    await page.fill('[data-add-chore-name]', `Notes cap ${Date.now()}`)
    await page.fill('[data-add-chore-notes]', 'x'.repeat(NOTES_MAX_LENGTH + 1))
    await page.click('[data-add-chore-day="0"]')
    await page.click('[data-add-chore-submit]')

    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
    expect(await page.textContent('[data-add-chore-error]')).toBe(NOTES_TOO_LONG_HINT)
  })

  it('opens Edit on Details, swaps to List as a peer tab, and resets on reopen', async () => {
    const unique = `List tabs ${Date.now()}`
    const chore = await createChore(unique)
    const board = await $fetch<WeekView>('/api/week')
    await assignChore(chore.id, board.todayDayOfWeek)

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')

    expect(await page.getAttribute('[data-edit-chore-tab="details"]', 'aria-selected'))
      .toBe('true')
    expect(await page.isVisible('[data-edit-chore-details]')).toBe(true)
    expect(await page.isVisible('[data-edit-chore-list]')).toBe(false)

    await page.click('[data-edit-chore-tab="list"]')
    expect(await page.getAttribute('[data-edit-chore-tab="list"]', 'aria-selected'))
      .toBe('true')
    expect(await page.isVisible('[data-edit-chore-list]')).toBe(true)
    expect(await page.isVisible('[data-edit-chore-details]')).toBe(false)
    expect(await page.isVisible('[data-edit-chore-list-empty]')).toBe(true)

    await page.click('[data-edit-chore-close]')
    await expect
      .poll(async () => page.getAttribute('[data-edit-chore-drawer]', 'open'))
      .toBe(null)

    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    expect(await page.getAttribute('[data-edit-chore-tab="details"]', 'aria-selected'))
      .toBe('true')
    expect(await page.isVisible('[data-edit-chore-details]')).toBe(true)
  })

  it('prepends List items on add, ignores empty submit, and removes items', async () => {
    const unique = `List mutate ${Date.now()}`
    const chore = await createChore(unique)
    const board = await $fetch<WeekView>('/api/week')
    await assignChore(chore.id, board.todayDayOfWeek)

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    await page.click('[data-edit-chore-tab="list"]')

    await page.click('[data-edit-chore-list-submit]')
    expect(await page.isVisible('[data-edit-chore-list-empty]')).toBe(true)

    await page.fill('[data-edit-chore-list-draft]', 'milk')
    await page.click('[data-edit-chore-list-submit]')
    await expect
      .poll(async () => page.locator('[data-edit-chore-list-item]').count())
      .toBe(1)
    expect(await page.textContent('[data-edit-chore-list-item]')).toContain('milk')

    await page.fill('[data-edit-chore-list-draft]', 'eggs')
    await page.click('[data-edit-chore-list-submit]')
    await expect
      .poll(async () => page.locator('[data-edit-chore-list-item]').count())
      .toBe(2)

    const labels = await page.locator('[data-edit-chore-list-item]').allTextContents()
    expect(labels[0]).toContain('eggs')
    expect(labels[1]).toContain('milk')

    await page.locator('[data-edit-chore-list-remove]').first().click()
    await expect
      .poll(async () => page.locator('[data-edit-chore-list-item]').count())
      .toBe(1)
    expect(await page.textContent('[data-edit-chore-list-item]')).toContain('milk')

    await page.click('[data-edit-chore-close]')
    await page.click(editNameSelector(chore.id))
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    await page.click('[data-edit-chore-tab="list"]')
    expect(await page.textContent('[data-edit-chore-list-item]')).toContain('milk')
  })

  it('shows Today List cue when count ≥ 1 and hides it at 0 and on Week', async () => {
    const unique = `List cue ${Date.now()}`
    const chore = await createChore(unique)
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const otherDay = (today + 1) % 7
    await assignChore(chore.id, today)
    await assignChore(chore.id, otherDay)

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))

    const todayCue = page.locator(`#today [data-today-list-cue="${chore.id}"]`)
    expect(await todayCue.count()).toBe(0)
    expect(await page.locator(`#week [data-today-list-cue="${chore.id}"]`).count()).toBe(0)

    await page.locator('#today').locator(editNameSelector(chore.id)).click()
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    expect(await page.getAttribute('[data-edit-chore-tab="details"]', 'aria-selected'))
      .toBe('true')
    await page.click('[data-edit-chore-tab="list"]')
    await page.fill('[data-edit-chore-list-draft]', 'oats')
    await page.click('[data-edit-chore-list-submit]')
    await expect
      .poll(async () => page.locator('[data-edit-chore-list-item]').count())
      .toBe(1)
    await page.click('[data-edit-chore-close]')
    await expect
      .poll(async () => page.getAttribute('[data-edit-chore-drawer]', 'open'))
      .toBe(null)

    await expect.poll(async () => todayCue.count()).toBe(1)
    expect(await todayCue.getAttribute('data-list-count')).toBe('1')
    expect(await todayCue.textContent()).toContain('1')
    expect(await todayCue.textContent()).not.toContain('oats')
    expect(await page.locator(`#week [data-today-list-cue="${chore.id}"]`).count()).toBe(0)

    await todayCue.click()
    await page.waitForSelector('[data-edit-chore-drawer][open]')
    expect(await page.getAttribute('[data-edit-chore-tab="details"]', 'aria-selected'))
      .toBe('true')
    expect(await page.isVisible('[data-edit-chore-details]')).toBe(true)
  })

  it('soft-fails overlong List labels in the Edit List panel', async () => {
    const unique = `List label cap ${Date.now()}`
    const chore = await createChore(unique)
    const board = await $fetch<WeekView>('/api/week')
    await assignChore(chore.id, board.todayDayOfWeek)

    const page = await createPage('/')
    await page.waitForSelector(editNameSelector(chore.id))
    await page.click(editNameSelector(chore.id))
    await page.click('[data-edit-chore-tab="list"]')
    await page.fill(
      '[data-edit-chore-list-draft]',
      'y'.repeat(LIST_ITEM_MAX_LENGTH + 1),
    )
    await page.click('[data-edit-chore-list-submit]')

    expect(await page.textContent('[data-edit-chore-list-error]')).toMatch(/100/)
    expect(await page.locator('[data-edit-chore-list-item]').count()).toBe(0)
  })
})
