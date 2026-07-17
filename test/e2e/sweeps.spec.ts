import { rmSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { Chore, SweepsSnapshot } from '../helpers/api-types.ts'
import { setupE2e, TEST_HOUSEHOLD_TIMEZONE } from '../helpers/e2e-setup.ts'
import { insertCompletion } from '../helpers/fixtures.ts'
import { weekClockAt } from '../../server/utils/week.ts'

const PORTRAIT = { width: 390, height: 844 } as const
const READY_MS = 20_000
const HUB_DIR = '.data/test-sweeps-e2e'

/**
 * Seam: /sweeps Scrapbook route + wrap 2×2 primary nav (issue #66).
 */
describe('Sweeps page + primary nav', async () => {
  rmSync(HUB_DIR, { recursive: true, force: true })

  await setupE2e({
    browser: true,
    browserType: 'webkit',
    hubDir: HUB_DIR,
  })

  let sparkleChore: Chore

  beforeAll(async () => {
    sparkleChore = await $fetch<Chore>('/api/chores', {
      method: 'POST',
      body: { name: `Sweeps e2e ${Date.now()}` },
    })
    await $fetch(`/api/chores/${sparkleChore.id}/assignments`, {
      method: 'POST',
      body: { dayOfWeek: 0 },
    })
    const weekStart = weekClockAt(new Date(), TEST_HOUSEHOLD_TIMEZONE).weekStart
    await insertCompletion({
      choreId: sparkleChore.id,
      dayOfWeek: 0,
      weekStart,
    })
  })

  it('board primary nav is a wrap 2×2 with Sweeps entry', async () => {
    const page = await createPage('/', { viewport: { ...PORTRAIT } })
    try {
      await page.waitForSelector('[data-shell-nav="wrap"]', { timeout: READY_MS })

      const layout = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('[data-shell-nav="wrap"]')
        if (!nav) return null
        const style = getComputedStyle(nav)
        const controls = [...nav.querySelectorAll('.btn.control')]
        const boxes = controls.map(el => el.getBoundingClientRect())
        const sweeps = nav.querySelector('[data-sweeps-nav]')
        return {
          columns: style.gridTemplateColumns,
          controlCount: controls.length,
          labels: controls.map(el => el.textContent?.replace(/\s+/g, ' ').trim()),
          minHeight: Math.min(...boxes.map(b => b.height)),
          hasSweeps: Boolean(sweeps),
        }
      })

      expect(layout).not.toBeNull()
      expect(layout!.controlCount).toBe(4)
      expect(layout!.labels).toEqual(
        expect.arrayContaining(['Today', 'Week', 'Sweeps', 'Add chore']),
      )
      expect(layout!.hasSweeps).toBe(true)
      expect(layout!.minHeight).toBeGreaterThanOrEqual(44)
      expect(layout!.columns.trim().split(/\s+/).length).toBe(2)
    }
    finally {
      await page.close()
    }
  })

  it('Sweeps route shows scrapbook peak, quiet Weeks, and sticker shelf', async () => {
    const api = await $fetch<SweepsSnapshot>('/api/sweeps', {
      query: { filter: 'lately' },
    })
    expect(api.empty).toBe(false)

    const page = await createPage('/sweeps', { viewport: { ...PORTRAIT } })
    try {
      await page.waitForSelector('[data-sweeps-page]', { timeout: READY_MS })
      await page.waitForSelector('#sweeps-peak-heading', { timeout: READY_MS })

      expect(await page.locator('h1').innerText()).toMatch(/Sweeps/)
      expect(await page.getAttribute('[data-shell-nav="wrap"] a[aria-current="page"]', 'href'))
        .toContain('/sweeps')

      const filters = page.locator('[aria-label="Time window"] .sweeps-chip')
      expect(await filters.count()).toBe(3)

      await page.waitForSelector('.sweeps-stickers .sweeps-sticker', { timeout: READY_MS })
      expect(await page.locator('.sweeps-stickers').innerText()).toContain(sparkleChore.name)

      // Quiet empty slot copy should appear when a zero Week is in the strip.
      const quiet = page.locator('.sweeps-card__quiet')
      if (api.weeks.some(w => w.sparkles === 0)) {
        expect(await quiet.count()).toBeGreaterThan(0)
        expect(await quiet.first().innerText()).toMatch(/quiet Week/i)
      }

      await filters.nth(1).click()
      await page.waitForFunction(
        () => document.querySelector('.sweeps-bubble__label')?.textContent?.includes('A while'),
        { timeout: READY_MS },
      )
    }
    finally {
      await page.close()
    }
  })

  it('Add chore from Sweeps lands on the board drawer', async () => {
    const page = await createPage('/sweeps', { viewport: { ...PORTRAIT } })
    try {
      await page.waitForSelector('[data-sweeps-page]', { timeout: READY_MS })
      await page.click('[data-add-chore-open]')
      await page.waitForURL(url => url.pathname === '/' || url.search.includes('add=1'), {
        timeout: READY_MS,
      })
      await page.waitForSelector('[data-add-chore-drawer][open]', { timeout: READY_MS })
    }
    finally {
      await page.close()
    }
  })
})
