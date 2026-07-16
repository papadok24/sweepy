import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  COMPLETE_CHORE_SRC,
  FULL_SWEEP_SRC,
  clearSoundPlays,
  installSoundProbe,
  playsFor,
  readSoundProbe,
} from '../helpers/sound-probe.ts'
import {
  assignChore,
  checkboxSelector,
  createChore,
} from '../helpers/week-board.ts'

const OVERLAY = '[data-full-sweep-overlay]'
const FULL_SWEEP_REST_MS = 2200

/**
 * Seam: Today shell Full sweep cheer (issue #56 / parent #55).
 * Drive Completion toggles; observe overlay/copy/mascot hooks + sound probe.
 */
describe('full sweep cheer on Today', async () => {
  await setupE2e({
    browser: true,
    // Fresh DB each run so "empty today" is not polluted by prior vitest invocations.
    hubDir: `.data/test-full-sweep-${process.pid}`,
  })

  it('never shows Full sweep on empty today', async () => {
    // Isolated hub starts empty; assign only a non-today day so Today stays empty.
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const otherDay = (today + 1) % 7
    const chore = await createChore(`Full sweep empty today ${Date.now()}`)
    await assignChore(chore.id, otherDay)

    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await installSoundProbe(page)

    expect(await page.locator('#today .chore-list .chore-slot').count()).toBe(0)
    expect(await page.locator('#today .empty-state').count()).toBeGreaterThan(0)
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC)).toHaveLength(0)
  })

  it('shows Full sweep overlay and audio on the last Today check, without row celebrate', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const a = await createChore(`Full sweep last A ${Date.now()}`)
    const b = await createChore(`Full sweep last B ${Date.now()}`)
    await assignChore(a.id, today)
    await assignChore(b.id, today)

    const fresh = await $fetch<WeekView>('/api/week')
    for (const slot of fresh.days.find(d => d.dayOfWeek === today)?.assignments ?? []) {
      if (slot.choreId !== a.id && slot.choreId !== b.id && !slot.completed) {
        await $fetch('/api/completions', {
          method: 'POST',
          body: { choreId: slot.choreId, dayOfWeek: today },
        })
      }
    }

    const page = await createPage('/')
    const todayA = `#today ${checkboxSelector(a.id, today)}`
    const todayB = `#today ${checkboxSelector(b.id, today)}`
    await page.waitForSelector(todayA)
    await page.waitForSelector(todayB)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(todayA).click()
    expect(await page.getAttribute(todayA, 'aria-checked')).toBe('true')
    expect(await page.locator(OVERLAY).count()).toBe(0)

    await clearSoundPlays(page)
    await page.locator(todayB).click()
    expect(await page.getAttribute(todayB, 'aria-checked')).toBe('true')

    await page.waitForSelector(OVERLAY)
    const overlay = page.locator(OVERLAY)
    expect(await overlay.innerText()).toContain('Full sweep!')
    expect(await overlay.innerText()).toContain('Every chore today — checked.')
    expect(
      await overlay.locator('[data-sweepy-expression="cheer"]').count(),
    ).toBeGreaterThan(0)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(1)
    expect(await page.locator(`${todayB}.celebrate, ${todayB}.celebrate--soft`).count()).toBe(0)

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC).length)
      .toBe(1)
    const fullSweepPlays = playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC)
    expect(fullSweepPlays[0]?.volume).toBe(1)
    expect(playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC)).toHaveLength(0)

    expect(
      await overlay.locator('.sweepy-mascot--cheer').count(),
    ).toBeGreaterThan(0)

    await page.waitForTimeout(FULL_SWEEP_REST_MS)
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(0)
  })

  it('keeps mid-list Today complete on the row celebrate path', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const a = await createChore(`Full sweep mid A ${Date.now()}`)
    const b = await createChore(`Full sweep mid B ${Date.now()}`)
    await assignChore(a.id, today)
    await assignChore(b.id, today)

    const page = await createPage('/')
    const todayA = `#today ${checkboxSelector(a.id, today)}`
    await page.waitForSelector(todayA)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(todayA).click()
    expect(await page.getAttribute(todayA, 'aria-checked')).toBe('true')
    expect(await page.locator(OVERLAY).count()).toBe(0)
    await expect
      .poll(async () => page.locator(`${todayA}.celebrate, ${todayA}.celebrate--soft`).count())
      .toBe(1)
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)
    expect(playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC)).toHaveLength(0)
  })

  it('does not fire Full sweep when the last today slot is completed from the Week grid', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep week last ${Date.now()}`)
    await assignChore(chore.id, today)

    const fresh = await $fetch<WeekView>('/api/week')
    for (const slot of fresh.days.find(d => d.dayOfWeek === today)?.assignments ?? []) {
      if (slot.choreId !== chore.id && !slot.completed) {
        await $fetch('/api/completions', {
          method: 'POST',
          body: { choreId: slot.choreId, dayOfWeek: today },
        })
      }
    }

    const page = await createPage('/')
    const weekBox = `#week ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(weekBox)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(weekBox).click()
    expect(await page.getAttribute(weekBox, 'aria-checked')).toBe('true')
    expect(await page.locator(OVERLAY).count()).toBe(0)
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)
    expect(playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC)).toHaveLength(0)
  })

  it('does not fire Full sweep on hydrate of an already-complete Today', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep hydrate ${Date.now()}`)
    await assignChore(chore.id, today)

    const fresh = await $fetch<WeekView>('/api/week')
    for (const slot of fresh.days.find(d => d.dayOfWeek === today)?.assignments ?? []) {
      if (!slot.completed) {
        await $fetch('/api/completions', {
          method: 'POST',
          body: { choreId: slot.choreId, dayOfWeek: today },
        })
      }
    }

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)
    await installSoundProbe(page)
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('true')
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC)).toHaveLength(0)
  })

  it('stays quiet on uncheck from Today', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep uncheck ${Date.now()}`)
    await assignChore(chore.id, today)

    // Prior suites leave open today slots — close them so this chore alone can Full sweep.
    const fresh = await $fetch<WeekView>('/api/week')
    for (const slot of fresh.days.find(d => d.dayOfWeek === today)?.assignments ?? []) {
      if (slot.choreId !== chore.id && !slot.completed) {
        await $fetch('/api/completions', {
          method: 'POST',
          body: { choreId: slot.choreId, dayOfWeek: today },
        })
      }
    }

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)
    await installSoundProbe(page)

    await page.locator(todayBox).click()
    await page.waitForSelector(OVERLAY)
    await page.waitForTimeout(FULL_SWEEP_REST_MS)
    expect(await page.locator(OVERLAY).count()).toBe(0)

    await clearSoundPlays(page)
    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('false')
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC)).toHaveLength(0)
    expect(playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })
})
