import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { Chore, WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'
import {
  ADD_CHORE_SRC,
  COMPLETE_CHORE_SRC,
  clearSoundPlays,
  constructedFor,
  createPageWithSoundProbe,
  installSoundProbe,
  playsFor,
  readSoundProbe,
} from '../helpers/sound-probe.ts'

/**
 * Seam: browser media `play()` boundary for chore interaction sounds (issue #31).
 * Observe cue URLs, trigger counts, relative volume, and restart — not private helpers.
 */
describe('chore interaction sounds', async () => {
  await setupE2e({ browser: true })

  async function createChore(name: string) {
    return await $fetch<Chore>('/api/chores', {
      method: 'POST',
      body: { name },
    })
  }

  async function assign(choreId: number, dayOfWeek: number) {
    await $fetch(`/api/chores/${choreId}/assignments`, {
      method: 'POST',
      body: { dayOfWeek },
    })
  }

  function findAssignment(week: WeekView, choreName: string, dayOfWeek: number) {
    return week.days
      .find(d => d.dayOfWeek === dayOfWeek)
      ?.assignments.find(a => a.choreName === choreName)
  }

  function checkboxSelector(choreId: number, dayOfWeek: number) {
    return `[data-week-chore="${choreId}"][data-day-of-week="${dayOfWeek}"]`
  }

  it('plays the add-chore cue once after create and week refresh succeed', async () => {
    const unique = `Sound add ok ${Date.now()}`
    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await installSoundProbe(page)

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
        return findAssignment(week, unique, 0)?.choreId
      })
      .toEqual(expect.any(Number))

    const probe = await readSoundProbe(page)
    const addPlays = playsFor(probe.plays, ADD_CHORE_SRC)
    expect(addPlays).toHaveLength(1)
    expect(playsFor(probe.plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })

  it('does not play the add-chore cue when form validation fails', async () => {
    const unique = `Sound add invalid ${Date.now()}`
    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await installSoundProbe(page)

    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')
    await page.fill('[data-add-chore-name]', unique)
    await page.click('[data-add-chore-submit]')

    await page.waitForSelector('[data-add-chore-error]')
    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)

    const probe = await readSoundProbe(page)
    expect(playsFor(probe.plays, ADD_CHORE_SRC)).toHaveLength(0)
  })

  it('does not play the add-chore cue when save fails', async () => {
    const unique = `Sound add fail ${Date.now()}`
    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await installSoundProbe(page)

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

    const probe = await readSoundProbe(page)
    expect(playsFor(probe.plays, ADD_CHORE_SRC)).toHaveLength(0)
    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
  })

  it('does not play the add-chore cue when week refresh fails', async () => {
    const unique = `Sound add refresh fail ${Date.now()}`
    const page = await createPage('/')
    await page.waitForSelector('[data-week-ready="true"]')
    await installSoundProbe(page)

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

    const probe = await readSoundProbe(page)
    expect(playsFor(probe.plays, ADD_CHORE_SRC)).toHaveLength(0)
    expect(await page.getAttribute('[data-add-chore-drawer]', 'open')).not.toBe(null)
  })

  it('plays the completion cue when checking off from the Week board', async () => {
    const unique = `Sound complete week ${Date.now()}`
    const chore = await createChore(unique)
    await assign(chore.id, 0)

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

  it('plays the completion cue when checking off from Today', async () => {
    const today = (new Date().getDay() + 6) % 7
    const unique = `Sound complete today ${Date.now()}`
    const chore = await createChore(unique)
    await assign(chore.id, today)

    const page = await createPage('/')
    await page.waitForSelector(`#today ${checkboxSelector(chore.id, today)}`)
    await installSoundProbe(page)
    await clearSoundPlays(page)

    await page.locator(`#today ${checkboxSelector(chore.id, today)}`).click()
    expect(
      await page.getAttribute(`#today ${checkboxSelector(chore.id, today)}`, 'aria-checked'),
    ).toBe('true')

    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)
  })

  it('does not play a completion cue when unchecking', async () => {
    const unique = `Sound uncheck ${Date.now()}`
    const chore = await createChore(unique)
    await assign(chore.id, 1)

    const page = await createPage('/')
    await page.waitForSelector(checkboxSelector(chore.id, 1))
    await installSoundProbe(page)

    await page.click(checkboxSelector(chore.id, 1))
    await expect
      .poll(async () => playsFor((await readSoundProbe(page)).plays, COMPLETE_CHORE_SRC).length)
      .toBe(1)

    await clearSoundPlays(page)
    await page.click(checkboxSelector(chore.id, 1))
    expect(await page.getAttribute(checkboxSelector(chore.id, 1), 'aria-checked')).toBe('false')

    const probe = await readSoundProbe(page)
    expect(playsFor(probe.plays, COMPLETE_CHORE_SRC)).toHaveLength(0)
  })

  it('uses a lower volume for a rapid follow-up Completion', async () => {
    const uniqueA = `Sound soft A ${Date.now()}`
    const uniqueB = `Sound soft B ${Date.now()}`
    const choreA = await createChore(uniqueA)
    const choreB = await createChore(uniqueB)
    await assign(choreA.id, 3)
    await assign(choreB.id, 3)

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
    const uniqueA = `Sound restart A ${Date.now()}`
    const uniqueB = `Sound restart B ${Date.now()}`
    const choreA = await createChore(uniqueA)
    const choreB = await createChore(uniqueB)
    await assign(choreA.id, 4)
    await assign(choreB.id, 4)

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
    // Two play() calls on one reused player — not a second Audio instance.
    expect(constructedFor(probe.constructed, COMPLETE_CHORE_SRC)).toHaveLength(1)
    expect(constructedFor(probe.constructed, ADD_CHORE_SRC)).toHaveLength(1)
  })

  it('keeps chore actions working when media playback is rejected', async () => {
    const unique = `Sound reject ${Date.now()}`
    const chore = await createChore(unique)
    await assign(chore.id, 5)

    const page = await createPage('/')
    await page.waitForSelector(checkboxSelector(chore.id, 5))
    await installSoundProbe(page)

    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = function rejectedPlay() {
        const src = this.currentSrc || this.getAttribute('src') || ''
        window.__soundProbe?.plays.push({
          src,
          volume: this.volume,
        })
        return Promise.reject(new DOMException('NotAllowedError'))
      }
    })

    await page.click(checkboxSelector(chore.id, 5))
    expect(await page.getAttribute(checkboxSelector(chore.id, 5), 'aria-checked')).toBe('true')

    await expect
      .poll(async () => {
        const week = await $fetch<WeekView>('/api/week')
        return findAssignment(week, unique, 5)?.completed ?? false
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
        return findAssignment(week, addUnique, 0)?.choreId
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
