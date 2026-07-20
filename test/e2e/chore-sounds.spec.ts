import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  ADD_CHORE_SRC,
  COMPLETE_CHORE_SRC,
  FULL_SWEEP_SRC,
  clearSoundPlays,
  constructedFor,
  createPageWithSoundProbe,
  installRejectedPlayStub,
  installSoundProbe,
  openReadySoundPage,
  pausesFor,
  playsFor,
  readSoundProbe,
  resolveDeferredPlays,
  setDeferredPlay,
  warmPlaysFor,
} from '../helpers/sound-probe.ts'
import {
  assignChore,
  checkboxSelector,
  createChore,
  findAssignmentByName,
} from '../helpers/week-board.ts'

/**
 * Seam: browser media `play()` boundary for chore interaction sounds (issue #31).
 * Observe cue URLs, trigger counts, relative volume, and restart — not private helpers.
 */
describe('chore interaction sounds', async () => {
  await setupE2e({ browser: true })

  it('plays the add-chore cue once after create and week refresh succeed', async () => {
    const unique = `Sound add ok ${Date.now()}`
    const page = await openReadySoundPage()

    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', unique)
    await page.click('[data-add-chore-day="0"]')
    await page.click('[data-add-chore-submit]')

    await expect
      .poll(async () => page.getAttribute('[data-add-chore-drawer]', 'open'))
      .toBe(null)

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentByName(week, unique, 0)?.choreId
      })
      .toEqual(expect.any(Number))

    const probe = await readSoundProbe(page)
    expect(playsFor(probe.plays, ADD_CHORE_SRC)).toHaveLength(1)
    expect(playsFor(probe.plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })

  it('does not play the add-chore cue when form validation fails', async () => {
    const unique = `Sound add invalid ${Date.now()}`
    const page = await openReadySoundPage()

    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', unique)
    await page.click('[data-add-chore-submit]')

    await page.waitForSelector('[data-add-chore-error]')
    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
    expect(playsFor((await readSoundProbe(page)).plays, ADD_CHORE_SRC)).toHaveLength(0)
  })

  it('does not play the add-chore cue when save fails', async () => {
    const unique = `Sound add fail ${Date.now()}`
    const page = await openReadySoundPage()

    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', unique)
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

    expect(playsFor((await readSoundProbe(page)).plays, ADD_CHORE_SRC)).toHaveLength(0)
    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
  })

  it('does not play the add-chore cue when week refresh fails', async () => {
    const unique = `Sound add refresh fail ${Date.now()}`
    const page = await openReadySoundPage()

    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', unique)
    await page.click('[data-add-chore-day="2"]')

    await page.route('**/api/week', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusMessage: 'forced refresh failure' }),
      })
    })

    await page.click('[data-add-chore-submit]')
    await page.waitForSelector('[data-add-chore-error]')

    expect(playsFor((await readSoundProbe(page)).plays, ADD_CHORE_SRC)).toHaveLength(0)
    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
  })

  it('plays the completion cue when checking off from the Week board', async () => {
    const unique = `Sound complete week ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 0)

    const page = await createPage('/')
    await page.waitForSelector(checkboxSelector(chore.id, 0))
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(`#week ${checkboxSelector(chore.id, 0)}`).click()
    expect(await page.getAttribute(checkboxSelector(chore.id, 0), 'aria-checked')).toBe('true')

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)
    expect(playsFor((await readSoundProbe(page)).plays, ADD_CHORE_SRC)).toHaveLength(0)
  })

  it('plays the completion cue when checking off a mid-list Today slot', async () => {
    // Two today Assignments so this check is not a Full sweep (issue #56).
    const board = await $fetch<WeekView>('/api/week')
    const today = board.todayDayOfWeek
    const a = await createChore(`Sound complete today A ${Date.now()}`)
    const b = await createChore(`Sound complete today B ${Date.now()}`)
    await assignChore(a.id, today)
    await assignChore(b.id, today)

    const page = await createPage('/')
    const todayBox = `#today ${checkboxSelector(a.id, today)}`
    await page.waitForSelector(todayBox)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(todayBox).click()
    expect(await page.getAttribute(todayBox, 'aria-checked')).toBe('true')

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)
  })

  it('plays the same cues when activated with the keyboard', async () => {
    const unique = `Sound keyboard ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 0)

    const page = await createPage('/')
    // Scope to Week: day 0 also appears in Today when today is Monday.
    const box = `#week ${checkboxSelector(chore.id, 0)}`
    await page.waitForSelector(box)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(box).focus()
    await page.keyboard.press('Space')
    expect(await page.getAttribute(box, 'aria-checked')).toBe('true')
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)

    await clearSoundPlays(page)
    const addUnique = `Sound keyboard add ${Date.now()}`
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', addUnique)
    await page.click('[data-add-chore-day="1"]')
    await page.locator('[data-add-chore-submit]').focus()
    await page.keyboard.press('Enter')

    await expect
      .poll(async () => page.getAttribute('[data-add-chore-drawer]', 'open'))
      .toBe(null)
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, ADD_CHORE_SRC).length)
      .toBe(1)
  })

  it('does not play a completion cue when unchecking', async () => {
    const unique = `Sound uncheck ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 1)

    const page = await createPage('/')
    const box = checkboxSelector(chore.id, 1)
    await page.waitForSelector(box)
    await installSoundProbe(page)

    await page.click(box)
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)

    await clearSoundPlays(page)
    await page.click(box)
    expect(await page.getAttribute(box, 'aria-checked')).toBe('false')
    expect(playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })

  it('uses a lower volume for a rapid follow-up Completion', async () => {
    const choreA = await createChore(`Sound soft A ${Date.now()}`)
    const choreB = await createChore(`Sound soft B ${Date.now()}`)
    await assignChore(choreA.id, 3)
    await assignChore(choreB.id, 3)

    const page = await createPage('/')
    await page.waitForSelector(checkboxSelector(choreA.id, 3))
    await page.waitForSelector(checkboxSelector(choreB.id, 3))
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.click(checkboxSelector(choreA.id, 3))
    await page.click(checkboxSelector(choreB.id, 3))

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(2)

    const completePlays = playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC)
    expect(completePlays[0]!.volume).toBeGreaterThan(completePlays[1]!.volume)
  })

  it('restarts the completion cue on repeated triggers instead of overlapping', async () => {
    const choreA = await createChore(`Sound restart A ${Date.now()}`)
    const choreB = await createChore(`Sound restart B ${Date.now()}`)
    await assignChore(choreA.id, 4)
    await assignChore(choreB.id, 4)

    // Probe before mount so preload construction is visible — reuse vs overlap.
    const page = await createPageWithSoundProbe('/')
    await page.waitForSelector(checkboxSelector(choreA.id, 4))
    await page.waitForSelector(checkboxSelector(choreB.id, 4))
    await clearSoundPlays(page)

    await page.click(checkboxSelector(choreA.id, 4))
    await page.click(checkboxSelector(choreB.id, 4))

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(2)

    const probe = await readSoundProbe(page)
    expect(constructedFor(probe.constructed, COMPLETE_CHORE_SRC)).toHaveLength(1)
    expect(constructedFor(probe.constructed, ADD_CHORE_SRC)).toHaveLength(1)
    expect(constructedFor(probe.constructed, FULL_SWEEP_SRC)).toHaveLength(1)
  })

  it('warms every cue once on the first trusted pointer gesture', async () => {
    const page = await createPageWithSoundProbe('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await clearSoundPlays(page)

    await page.locator('.brand-lockup').click()

    await expect
      .poll(async () => {
        const plays = (await readSoundProbe(page)).plays
        return (
          warmPlaysFor(plays, ADD_CHORE_SRC).length
          + warmPlaysFor(plays, COMPLETE_CHORE_SRC).length
          + warmPlaysFor(plays, FULL_SWEEP_SRC).length
        )
      })
      .toBe(3)

    const probe = await readSoundProbe(page)
    expect(warmPlaysFor(probe.plays, ADD_CHORE_SRC)).toHaveLength(1)
    expect(warmPlaysFor(probe.plays, COMPLETE_CHORE_SRC)).toHaveLength(1)
    expect(warmPlaysFor(probe.plays, FULL_SWEEP_SRC)).toHaveLength(1)
    expect(playsFor(probe.plays, ADD_CHORE_SRC)).toHaveLength(0)
    expect(playsFor(probe.plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
    expect(playsFor(probe.plays, FULL_SWEEP_SRC)).toHaveLength(0)

    await clearSoundPlays(page)
    await page.locator('.brand-lockup').click()
    expect(warmPlaysFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })

  it('warms every cue once on the first trusted keyboard gesture', async () => {
    const page = await createPageWithSoundProbe('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await clearSoundPlays(page)

    await page.locator('[data-add-chore-open]').focus()
    await page.keyboard.press('Tab')

    await expect
      .poll(async () => warmPlaysFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)

    const probe = await readSoundProbe(page)
    expect(warmPlaysFor(probe.plays, ADD_CHORE_SRC)).toHaveLength(1)
    expect(warmPlaysFor(probe.plays, FULL_SWEEP_SRC)).toHaveLength(1)
    expect(playsFor(probe.plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })

  it('does not warm players for synthetic untrusted events', async () => {
    const page = await createPageWithSoundProbe('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await clearSoundPlays(page)

    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }))
    })

    expect(warmPlaysFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
    expect(warmPlaysFor((await readSoundProbe(page)).plays, ADD_CHORE_SRC)).toHaveLength(0)
  })

  it('does not let deferred warm-up cleanup pause a real completion cue', async () => {
    const unique = `Sound warm race ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 2)

    const page = await createPageWithSoundProbe('/')
    const box = `#week ${checkboxSelector(chore.id, 2)}`
    await page.waitForSelector(box)
    await clearSoundPlays(page)
    await setDeferredPlay(page, true)

    // First trusted gesture starts muted warm plays that stay pending.
    await page.locator('.brand-lockup').click({ force: true })
    await expect
      .poll(async () => warmPlaysFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)

    await setDeferredPlay(page, false)
    await page.locator(box).click()
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)

    const beforeResolve = await readSoundProbe(page)
    const completePausesBefore = pausesFor(beforeResolve.pauses, COMPLETE_CHORE_SRC).length
    const addPausesBefore = pausesFor(beforeResolve.pauses, ADD_CHORE_SRC).length
    const sweepPausesBefore = pausesFor(beforeResolve.pauses, FULL_SWEEP_SRC).length

    const resolved = await resolveDeferredPlays(page)
    expect(resolved).toBeGreaterThanOrEqual(3)

    await expect
      .poll(async () => pausesFor((await readSoundProbe(page)).pauses, ADD_CHORE_SRC).length)
      .toBeGreaterThan(addPausesBefore)
    await expect
      .poll(async () => pausesFor((await readSoundProbe(page)).pauses, FULL_SWEEP_SRC).length)
      .toBeGreaterThan(sweepPausesBefore)

    // Completion player generation advanced for the real cue — warm cleanup must skip it.
    expect(pausesFor((await readSoundProbe(page)).pauses, COMPLETE_CHORE_SRC).length)
      .toBe(completePausesBefore)
    expect(await page.getAttribute(box, 'aria-checked')).toBe('true')
  })

  it('keeps chore actions working when warm-up playback is rejected', async () => {
    const unique = `Sound warm reject ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 3)

    const page = await createPageWithSoundProbe('/')
    const box = `#week ${checkboxSelector(chore.id, 3)}`
    await page.waitForSelector(box)
    await clearSoundPlays(page)
    await installRejectedPlayStub(page)

    await page.locator('.brand-lockup').click()
    await expect
      .poll(async () => warmPlaysFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)

    await clearSoundPlays(page)
    await page.locator(box).click()
    expect(await page.getAttribute(box, 'aria-checked')).toBe('true')
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)
  })

  it('serves compressed MP3 cue assets', async () => {
    const page = await openReadySoundPage()
    const origin = new URL(page.url()).origin
    for (const path of [ADD_CHORE_SRC, COMPLETE_CHORE_SRC, FULL_SWEEP_SRC]) {
      const response = await page.request.get(`${origin}${path}`)
      expect(response.status()).toBe(200)
      const contentType = response.headers()['content-type'] ?? ''
      expect(contentType).toMatch(/audio\/mpeg|audio\/mp3/i)
      expect((await response.body()).byteLength).toBeGreaterThan(1000)
    }
  })

  it('keeps chore actions working when media playback is rejected', async () => {
    const unique = `Sound reject ${Date.now()}`
    const chore = await createChore(unique)
    await assignChore(chore.id, 5)

    const page = await createPage('/')
    const box = checkboxSelector(chore.id, 5)
    await page.waitForSelector(box)
    await installSoundProbe(page)
    await installRejectedPlayStub(page)

    await page.click(box)
    expect(await page.getAttribute(box, 'aria-checked')).toBe('true')

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentByName(week, unique, 5)?.completed ?? false
      })
      .toBe(true)

    const addUnique = `Sound reject add ${Date.now()}`
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', addUnique)
    await page.click('[data-add-chore-day="0"]')
    await page.click('[data-add-chore-submit]')

    await expect
      .poll(async () => page.getAttribute('[data-add-chore-drawer]', 'open'))
      .toBe(null)
    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignmentByName(week, addUnique, 0)?.choreId
      })
      .toEqual(expect.any(Number))

    // Existing error handling still works under rejected playback.
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', `Sound reject fail ${Date.now()}`)
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
  })
})
