import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import type { Chore, WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'

/** iPhone 14-class portrait — kitchen one-handed fixture (issue #21 / ADR 0007). */
const PORTRAIT = { width: 390, height: 844 } as const
/** Landscape must not break (usable, not polished). */
const LANDSCAPE = { width: 844, height: 390 } as const

/** Fail waits sooner than the 120s suite timeout so hangs are obvious. */
const READY_MS = 20_000

/** Vitest forks hide hook/test console — tail this while `pnpm test:webkit` runs. */
const PROGRESS_LOG = join(
  fileURLToPath(new URL('../..', import.meta.url)),
  '.data/test/webkit-e2e.log',
)

/** Live progress: stderr + file (forks often drop console from hooks/tests). */
function progress(message: string) {
  const line = `[webkit] ${message}`
  process.stderr.write(`${line}\n`)
  try {
    appendFileSync(PROGRESS_LOG, `${new Date().toISOString()} ${line}\n`)
  }
  catch {
    // Log dir may not exist yet during collection; boot hook recreates it.
  }
}

function resetProgressLog() {
  mkdirSync(dirname(PROGRESS_LOG), { recursive: true })
  writeFileSync(
    PROGRESS_LOG,
    `${new Date().toISOString()} [webkit] log reset - tail: Get-Content .data/test/webkit-e2e.log -Wait\n`,
  )
}

/**
 * Timed progress for WebKit e2e — Nuxt boot + browser are silent otherwise.
 * Run with: `pnpm test:webkit` and optionally tail `.data/test/webkit-e2e.log`.
 */
async function step<T>(label: string, run: () => Promise<T>): Promise<T> {
  const started = Date.now()
  progress(`> ${label}`)
  try {
    const value = await run()
    progress(`ok ${label} (${Date.now() - started}ms)`)
    return value
  }
  catch (error) {
    progress(`FAIL ${label} after ${Date.now() - started}ms`)
    throw error
  }
}

async function waitReady(
  page: Page,
  todayChoreId: number,
  today: number,
  label: string,
) {
  await step(label, async () => {
    await page.waitForSelector('[data-week-ready="true"]', { timeout: READY_MS })
    await page.waitForSelector(
      `[data-week-chore="${todayChoreId}"][data-day-of-week="${today}"]`,
      { timeout: READY_MS },
    )
  })
}

/**
 * Seam: iOS Safari home-shell contract (issues #21–#26).
 * Playwright WebKit + narrow phone viewport — observable kitchen UX bar.
 */
describe('home shell WebKit Safari contract', async () => {
  resetProgressLog()
  // setup() only registers Vitest hooks — real Nuxt/WebKit boot runs in
  // beforeAll and is the long silent stretch (often 60–120s cold).
  progress('> suite registered; Nuxt + WebKit boot starts next (often 60-120s cold)')
  progress(`> progress log: ${PROGRESS_LOG}`)
  await setupE2e({ browser: true, browserType: 'webkit' })

  let todayChore: Chore
  let today: number

  beforeAll(async () => {
    progress('ok Nuxt + WebKit ready')
    await step('seed Today + Week chores', async () => {
      const stamp = Date.now()
      const board = await $fetch<WeekView>('/api/week')
      today = board.todayDayOfWeek
      const otherDay = (today + 1) % 7

      todayChore = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name: `Safari today ${stamp}` },
      })
      await $fetch(`/api/chores/${todayChore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: today },
      })

      // Second chore on another day so Week has content above “today only”.
      const weekChore = await $fetch<Chore>('/api/chores', {
        method: 'POST',
        body: { name: `Safari week ${stamp}` },
      })
      await $fetch(`/api/chores/${weekChore.id}/assignments`, {
        method: 'POST',
        body: { dayOfWeek: otherDay },
      })
    })
  })

  it('narrow portrait: tappable Today, stacked Week, no sideways scroll, zoom + optional fonts', async () => {
    const page = await step('open / (portrait 390x844)', () =>
      createPage('/', { viewport: { ...PORTRAIT } }),
    )

    try {
      await page.waitForSelector('[data-design-shell]', { timeout: READY_MS })
      await waitReady(page, todayChore.id, today, 'wait for week board + today chore')

      const snapshot = await step('measure portrait shell contract', () =>
        page.evaluate(() => {
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

          // Contract is the import query (or local @font-face). Do not fetch
          // Bunny CSS here — that hangs/slows CI when the network is flaky.
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
        }),
      )

      expect(snapshot.completion, 'Today completion control present').not.toBeNull()
      expect(snapshot.completion!.width, 'completion width ≥ 44').toBeGreaterThanOrEqual(44)
      expect(snapshot.completion!.height, 'completion height ≥ 44').toBeGreaterThanOrEqual(44)

      expect(snapshot.todayBeforeWeek, 'Today before Week in DOM').toBe(true)
      expect(snapshot.horizontalOverflow, 'no sideways page scroll').toBe(false)

      const columnCount = snapshot.weekColumns.trim().split(/\s+/).filter(Boolean).length
      expect(columnCount, 'week board stacked (1 column)').toBe(1)

      expect(snapshot.viewportLocked, 'pinch-zoom not disabled').toBe(false)
      expect(snapshot.fieldFontSize, 'field font ≥ 16px').toBeGreaterThanOrEqual(16)
      expect(
        snapshot.fontDisplayOptional,
        `font-display optional (faces=${JSON.stringify(snapshot.faceDisplays)})`,
      ).toBe(true)

      expect(snapshot.todayScrollMargin, 'Today scroll-margin').toBeGreaterThanOrEqual(8)
      expect(snapshot.weekScrollMargin, 'Week scroll-margin').toBeGreaterThanOrEqual(8)
    }
    finally {
      await page.close()
    }
  })

  it('landscape must not break: no sideways overflow and completions stay tappable', async () => {
    const page = await step('open / (landscape 844x390)', () =>
      createPage('/', { viewport: { ...LANDSCAPE } }),
    )

    try {
      await waitReady(page, todayChore.id, today, 'wait for week board (landscape)')

      const landscape = await step('measure landscape shell', () =>
        page.evaluate(() => {
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
        }),
      )

      expect(landscape.horizontalOverflow, 'no sideways overflow').toBe(false)
      expect(landscape.completion, 'completion present').not.toBeNull()
      expect(landscape.completion!.width, 'completion width ≥ 44').toBeGreaterThanOrEqual(44)
      expect(landscape.completion!.height, 'completion height ≥ 44').toBeGreaterThanOrEqual(44)
    }
    finally {
      await page.close()
    }
  })

  it('sync notice stays readable and dismissible on a narrow phone', async () => {
    const page = await step('open / for sync-notice (portrait)', () =>
      createPage('/', { viewport: { ...PORTRAIT } }),
    )

    try {
      await waitReady(page, todayChore.id, today, 'wait for week board (sync notice)')

      await step('stub completions API 500 + tap chore', async () => {
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
        await page.waitForSelector('[data-sync-notice]', { timeout: READY_MS })
      })

      const notice = await step('measure sync notice', () =>
        page.evaluate(() => {
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
        }),
      )

      expect(notice, 'sync notice + dismiss present').not.toBeNull()
      expect(notice!.visible, 'notice visible').toBe(true)
      expect(notice!.overflowsX, 'notice no X overflow').toBe(false)
      expect(notice!.dismissHeight, 'dismiss height ≥ 44').toBeGreaterThanOrEqual(44)
      expect(notice!.dismissWidth, 'dismiss width ≥ 44').toBeGreaterThanOrEqual(44)
    }
    finally {
      await page.close()
    }
  })
})
