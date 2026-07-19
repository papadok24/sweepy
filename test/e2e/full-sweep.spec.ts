import { describe, expect, it } from 'vitest'
import { $fetch, createPage, url } from '@nuxt/test-utils/e2e'
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
  findAssignmentById,
} from '../helpers/week-board.ts'

const OVERLAY = '[data-full-sweep-overlay]'
const FULL_SWEEP_REST_MS = 2200
const SOFT_STACK_WINDOW_MS = 400

/** Close every today Assignment except the given chore ids so a later Today check can Full sweep. */
async function completeOtherTodaySlots(
  today: number,
  keepChoreIds: number[],
) {
  const keep = new Set(keepChoreIds)
  const fresh = await $fetch<WeekView>('/api/week')
  for (const slot of fresh.days.find(d => d.dayOfWeek === today)?.assignments ?? []) {
    if (!keep.has(slot.choreId) && !slot.completed) {
      await $fetch('/api/completions', {
        method: 'POST',
        body: { choreId: slot.choreId, dayOfWeek: today },
      })
    }
  }
}

/**
 * Seam: Today shell Full sweep cheer (issues #56 / #57 / parent #55).
 * Drive Completion toggles / media prefs / failed writes; observe overlay,
 * dimming, sound probe, and board interactivity — external behavior only.
 */
describe('full sweep cheer on Today', async () => {
  await setupE2e({
    browser: true,
    // Fresh DB each run so "empty today" is not polluted by prior vitest invocations.
    hubDir: `.data/test-full-sweep-${process.pid}-${Date.now()}`,
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

    await completeOtherTodaySlots(today, [a.id, b.id])

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

    await completeOtherTodaySlots(today, [chore.id])

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

    // Complete every today slot (including this chore) before opening the page.
    await completeOtherTodaySlots(today, [])

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

    await completeOtherTodaySlots(today, [chore.id])

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

  // --- issue #57 edges & resilience ---

  it('replays Full sweep after uncheck then re-complete from Today', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep replay ${Date.now()}`)
    await assignChore(chore.id, today)
    await completeOtherTodaySlots(today, [chore.id])

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)
    await installSoundProbe(page)

    await page.locator(todayBox).click()
    await page.waitForSelector(OVERLAY)
    await page.waitForTimeout(FULL_SWEEP_REST_MS)
    expect(await page.locator(OVERLAY).count()).toBe(0)

    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('false')

    await clearSoundPlays(page)
    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('true')
    await page.waitForSelector(OVERLAY)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(1)
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC).length)
      .toBe(1)
  })

  it('shows a static Full sweep overlay under reduced motion and still plays audio', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep reduced ${Date.now()}`)
    await assignChore(chore.id, today)
    await completeOtherTodaySlots(today, [chore.id])

    const page = await createPage('/')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(todayBox).click()
    await page.waitForSelector(OVERLAY)

    const motion = await page.locator(OVERLAY).evaluate((el) => {
      const overlay = getComputedStyle(el)
      const beat = getComputedStyle(el.querySelector('.full-sweep-overlay__beat')!)
      return {
        overlayAnimation: overlay.animationName,
        beatAnimation: beat.animationName,
        copy: el.textContent ?? '',
      }
    })
    expect(motion.copy).toContain('Full sweep!')
    expect(motion.overlayAnimation).toBe('none')
    expect(motion.beatAnimation).toBe('none')
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(1)

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC).length)
      .toBe(1)

    await page.waitForTimeout(FULL_SWEEP_REST_MS)
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(0)
  })

  it('uses Full sweep cue on the last rapid Today check, not soft-stack row celebrate', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const a = await createChore(`Full sweep rapid A ${Date.now()}`)
    const b = await createChore(`Full sweep rapid B ${Date.now()}`)
    await assignChore(a.id, today)
    await assignChore(b.id, today)
    await completeOtherTodaySlots(today, [a.id, b.id])

    const page = await createPage('/')
    const todayA = `#today ${checkboxSelector(a.id, today)}`
    const todayB = `#today ${checkboxSelector(b.id, today)}`
    await page.waitForSelector(todayA)
    await page.waitForSelector(todayB)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(todayA).click()
    expect(await page.getAttribute(todayA, 'aria-checked')).toBe('true')
    await page.waitForTimeout(SOFT_STACK_WINDOW_MS)
    await clearSoundPlays(page)

    await page.locator(todayB).click()
    expect(await page.getAttribute(todayB, 'aria-checked')).toBe('true')
    await page.waitForSelector(OVERLAY)
    expect(await page.locator(`${todayB}.celebrate, ${todayB}.celebrate--soft`).count()).toBe(0)
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC).length)
      .toBe(1)
    expect(playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })

  it('clears Full sweep cheer when a failed last-check reconciles away', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep reconcile ${Date.now()}`)
    await assignChore(chore.id, today)
    await completeOtherTodaySlots(today, [chore.id])

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)
    await installSoundProbe(page)

    await page.route('**/api/completions**', async (route) => {
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

    await page.locator(todayBox).click()
    await page.waitForSelector('[data-sync-notice]')

    await expect
      .poll(async () => page.getAttribute(todayBox, 'aria-checked'))
      .toBe('false')
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(0)

    const week = await $fetch<WeekView>('/api/week')
    expect(findAssignmentById(week, chore.id, today)?.completed).toBe(false)
  })

  it('leaves the board interactive after overlay ends and after mid-cheer navigation', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep nav ${Date.now()}`)
    await assignChore(chore.id, today)
    await completeOtherTodaySlots(today, [chore.id])

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)

    await page.locator(todayBox).click()
    await page.waitForSelector(OVERLAY)
    await page.click('a[href="#week"]')

    // Hash navigation mid-cheer must drop overlay/dimming immediately (not wait for the beat).
    await expect.poll(async () => page.locator(OVERLAY).count()).toBe(0)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(0)

    await page.click('a[href="#today"]')
    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('false')
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(0)
  })

  it('keeps Full sweep overlay and Completion when Full sweep audio is rejected', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep audio reject ${Date.now()}`)
    await assignChore(chore.id, today)
    await completeOtherTodaySlots(today, [chore.id])

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = function rejectedPlay() {
        const src = this.currentSrc || this.getAttribute('src') || ''
        window.__soundProbe?.plays.push({
          src,
          volume: this.volume,
          muted: this.muted,
        })
        return Promise.reject(new DOMException('NotAllowedError'))
      }
    })

    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('true')
    await page.waitForSelector(OVERLAY)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(1)

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentById(week, chore.id, today)?.completed ?? false
      })
      .toBe(true)

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, FULL_SWEEP_SRC).length)
      .toBe(1)
  })

  it('keeps Full sweep overlay and Completion when the Full sweep asset is missing', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep audio missing ${Date.now()}`)
    await assignChore(chore.id, today)
    await completeOtherTodaySlots(today, [chore.id])

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)

    await page.route(`**${FULL_SWEEP_SRC}`, async (route) => {
      await route.fulfill({ status: 404, body: 'missing' })
    })

    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('true')
    await page.waitForSelector(OVERLAY)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(1)

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentById(week, chore.id, today)?.completed ?? false
      })
      .toBe(true)
  })

  it('does not leave stuck dimming after leaving mid-cheer and returning', async () => {
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const chore = await createChore(`Full sweep leave ${Date.now()}`)
    await assignChore(chore.id, today)
    await completeOtherTodaySlots(today, [chore.id])

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(chore.id, today)}`
    await page.waitForSelector(todayBox)

    await page.locator(todayBox).click()
    await page.waitForSelector(OVERLAY)

    await page.goto(url('/'), { waitUntil: 'hydration' })
    await page.waitForSelector(todayBox)
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('true')
    expect(await page.locator(OVERLAY).count()).toBe(0)
    expect(await page.locator('#today.today-shell--full-sweep').count()).toBe(0)

    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('false')
  })
})
