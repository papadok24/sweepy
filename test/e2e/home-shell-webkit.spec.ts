import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { Chore } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'

/** iPhone 14-class portrait — kitchen one-handed fixture (issue #21 / ADR 0007). */
const PORTRAIT = { width: 390, height: 844 } as const
/** Landscape must not break (usable, not polished). */
const LANDSCAPE = { width: 844, height: 390 } as const

/**
 * Seam: iOS Safari home-shell contract (issues #21–#26).
 * Playwright WebKit + narrow phone viewport — observable kitchen UX bar.
 */
describe('home shell WebKit Safari contract', async () => {
  await setupE2e({ browser: true, browserType: 'webkit' })

  async function seedTodayAndWeek() {
    const stamp = Date.now()
    const today = (new Date().getDay() + 6) % 7
    const otherDay = (today + 1) % 7

    const todayChore = await $fetch<Chore>('/api/chores', {
      method: 'POST',
      body: { name: `Safari today ${stamp}` },
    })
    await $fetch(`/api/chores/${todayChore.id}/assignments`, {
      method: 'POST',
      body: { dayOfWeek: today },
    })

    const weekChore = await $fetch<Chore>('/api/chores', {
      method: 'POST',
      body: { name: `Safari week ${stamp}` },
    })
    await $fetch(`/api/chores/${weekChore.id}/assignments`, {
      method: 'POST',
      body: { dayOfWeek: otherDay },
    })

    return { todayChore, weekChore, today }
  }

  it('narrow portrait: tappable Today, stacked Week, no sideways scroll, zoom + optional fonts', async () => {
    const { todayChore, today } = await seedTodayAndWeek()
    const page = await createPage('/', { viewport: { ...PORTRAIT } })

    await page.waitForSelector('[data-design-shell]')
    await page.waitForSelector('[data-week-ready="true"]')
    await page.waitForSelector(
      `[data-week-chore="${todayChore.id}"][data-day-of-week="${today}"]`,
    )

    const snapshot = await page.evaluate(async () => {
      const completion = document.querySelector<HTMLElement>(
        '#today .completion.control',
      )
      const field = document.querySelector<HTMLElement>('.field.control')
      const weekDays = document.querySelector<HTMLElement>('.week-board__days')
      const todayEl = document.querySelector('#today')
      const weekEl = document.querySelector('#week')
      const viewportMeta = document
        .querySelector('meta[name="viewport"]')
        ?.getAttribute('content') ?? ''

      const completionBox = completion?.getBoundingClientRect()
      const weekColumns = weekDays
        ? getComputedStyle(weekDays).gridTemplateColumns
        : ''

      const todayBeforeWeek = Boolean(
        todayEl
        && weekEl
        && (todayEl.compareDocumentPosition(weekEl)
          & Node.DOCUMENT_POSITION_FOLLOWING),
      )

      const horizontalOverflow
        = document.documentElement.scrollWidth
          > document.documentElement.clientWidth + 1
        || document.body.scrollWidth > document.body.clientWidth + 1

      const viewportLocked
        = /user-scalable\s*=\s*no/i.test(viewportMeta)
        || /maximum-scale\s*=\s*1(?:\.0+)?(?:\s|,|$)/i.test(viewportMeta)

      const fieldFontSize = field
        ? Number.parseFloat(getComputedStyle(field).fontSize)
        : 0

      // Observable font-display policy: Bunny import (or local @font-face)
      // must use optional so slow Wi‑Fi does not mid-session swap.
      let fontDisplayOptional = false
      const faceDisplays: string[] = []
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList
        try {
          rules = sheet.cssRules
        }
        catch {
          continue
        }
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSImportRule) {
            if (/display=optional/i.test(rule.href ?? '')) {
              fontDisplayOptional = true
            }
            try {
              const imported = await fetch(rule.href).then(r => r.text())
              if (/font-display\s*:\s*optional/i.test(imported)) {
                fontDisplayOptional = true
              }
            }
            catch {
              // Network may be blocked; import query still counts.
            }
          }
          if (rule instanceof CSSFontFaceRule) {
            const display = rule.style.getPropertyValue('font-display').trim()
            faceDisplays.push(display)
            if (display === 'optional') fontDisplayOptional = true
          }
        }
      }

      const todayScrollMargin = todayEl
        ? Number.parseFloat(getComputedStyle(todayEl).scrollMarginTop) || 0
        : 0
      const weekScrollMargin = weekEl
        ? Number.parseFloat(getComputedStyle(weekEl).scrollMarginTop) || 0
        : 0

      return {
        completion: completionBox
          ? { width: completionBox.width, height: completionBox.height }
          : null,
        weekColumns,
        todayBeforeWeek,
        horizontalOverflow,
        viewportMeta,
        viewportLocked,
        fieldFontSize,
        fontDisplayOptional,
        faceDisplays,
        todayScrollMargin,
        weekScrollMargin,
      }
    })

    expect(snapshot.completion).not.toBeNull()
    expect(snapshot.completion!.width).toBeGreaterThanOrEqual(44)
    expect(snapshot.completion!.height).toBeGreaterThanOrEqual(44)

    expect(snapshot.todayBeforeWeek).toBe(true)
    expect(snapshot.horizontalOverflow).toBe(false)

    // Narrow phone: week stays a single stacked column (not multi-column).
    const columnCount = snapshot.weekColumns.trim().split(/\s+/).filter(Boolean).length
    expect(columnCount).toBe(1)

    expect(snapshot.viewportLocked).toBe(false)
    expect(snapshot.fieldFontSize).toBeGreaterThanOrEqual(16)
    expect(snapshot.fontDisplayOptional).toBe(true)

    // In-page anchors survive Safari collapsing chrome (scroll-margin).
    expect(snapshot.todayScrollMargin).toBeGreaterThanOrEqual(8)
    expect(snapshot.weekScrollMargin).toBeGreaterThanOrEqual(8)
  })

  it('landscape must not break: no sideways overflow and completions stay tappable', async () => {
    const { todayChore, today } = await seedTodayAndWeek()
    const page = await createPage('/', { viewport: { ...LANDSCAPE } })

    await page.waitForSelector('[data-week-ready="true"]')
    await page.waitForSelector(
      `[data-week-chore="${todayChore.id}"][data-day-of-week="${today}"]`,
    )

    const landscape = await page.evaluate(() => {
      const completion = document.querySelector<HTMLElement>(
        '#today .completion.control',
      )
      const box = completion?.getBoundingClientRect()
      const horizontalOverflow
        = document.documentElement.scrollWidth
          > document.documentElement.clientWidth + 1
        || document.body.scrollWidth > document.body.clientWidth + 1

      return {
        horizontalOverflow,
        completion: box
          ? { width: box.width, height: box.height }
          : null,
      }
    })

    expect(landscape.horizontalOverflow).toBe(false)
    expect(landscape.completion).not.toBeNull()
    expect(landscape.completion!.width).toBeGreaterThanOrEqual(44)
    expect(landscape.completion!.height).toBeGreaterThanOrEqual(44)
  })

  it('sync notice stays readable and dismissible on a narrow phone', async () => {
    const { todayChore, today } = await seedTodayAndWeek()
    const page = await createPage('/', { viewport: { ...PORTRAIT } })

    await page.waitForSelector(
      `[data-week-chore="${todayChore.id}"][data-day-of-week="${today}"]`,
    )

    await page.route('**/api/completions', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusMessage: 'forced failure' }),
      })
    })

    await page.click(
      `[data-week-chore="${todayChore.id}"][data-day-of-week="${today}"]`,
    )
    await page.waitForSelector('[data-sync-notice]')

    const notice = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('[data-sync-notice]')
      const dismiss = document.querySelector<HTMLElement>(
        '.sync-notice__dismiss',
      )
      if (!root || !dismiss) return null

      const rootBox = root.getBoundingClientRect()
      const dismissBox = dismiss.getBoundingClientRect()
      const overflowsX
        = root.scrollWidth > root.clientWidth + 1
        || rootBox.right > document.documentElement.clientWidth + 1

      return {
        overflowsX,
        dismissWidth: dismissBox.width,
        dismissHeight: dismissBox.height,
        visible: rootBox.height > 0 && dismissBox.height > 0,
      }
    })

    expect(notice).not.toBeNull()
    expect(notice!.visible).toBe(true)
    expect(notice!.overflowsX).toBe(false)
    expect(notice!.dismissHeight).toBeGreaterThanOrEqual(44)
    expect(notice!.dismissWidth).toBeGreaterThanOrEqual(44)
  })
})
