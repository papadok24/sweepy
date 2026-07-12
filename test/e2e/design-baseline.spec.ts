import { describe, expect, it } from 'vitest'
import { $fetch, createPage } from '@nuxt/test-utils/e2e'
import type { Chore, WeekView } from '../helpers/api-types.ts'
import { setupE2e } from '../helpers/e2e-setup.ts'

/**
 * Seam: design baseline contract (issue #8).
 * Asserts the vanilla CSS baseline is wired into the Nuxt app shell —
 * semantic tokens resolve and surface/control hooks are usable.
 */
describe('design baseline contract', async () => {
  await setupE2e({ browser: true })

  it('loads the app shell with design baseline tokens and recipes', async () => {
    // Seed one Monday assignment so completion controls exist (#17).
    const chore = await $fetch<Chore>('/api/chores', {
      method: 'POST',
      body: { name: `Design baseline ${Date.now()}` },
    })
    await $fetch(`/api/chores/${chore.id}/assignments`, {
      method: 'POST',
      body: { dayOfWeek: 0 },
    })

    // Shared test DB can accumulate assignments; clear Tuesday so a nested
    // empty-state recipe is guaranteed for the snapshot.
    const weekBefore = await $fetch<WeekView>('/api/week')
    const tuesday = weekBefore.days.find(d => d.dayOfWeek === 1)
    for (const entry of tuesday?.assignments ?? []) {
      await $fetch(`/api/chores/${entry.choreId}/assignments/1`, { method: 'DELETE' })
    }

    const page = await createPage('/')

    await page.waitForSelector('[data-design-shell]')
    await page.waitForSelector('[data-week-ready="true"]')
    // Field recipe lives in the add-chore drawer; open it so computed styles resolve
    // (closed <dialog> is display:none and reports 0 border / height).
    await page.click('[data-add-chore-open]')
    await page.waitForSelector('[data-add-chore-drawer][open]')

    const designBaselineSnapshot = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)

      const token = (name: string) => root.getPropertyValue(name).trim()

      const surface = document.querySelector('.surface')
      const control = document.querySelector('.control')
      const field = document.querySelector('.field.control')
      const weekBoard = document.querySelector('.week-board')
      const quietSunday = document.querySelector('.day-bucket--quiet')
      const emptyStateNested = document.querySelector('.day-bucket.surface .empty-state')
      const emptyStateStandalone = document.querySelector('.empty-state.surface')
      const completion = document.querySelector('.completion')
      const celebrateBeat = document.querySelector('[data-celebrate-beat]')
      const icon = document.querySelector('[data-design-icon]')
      const heading = document.querySelector('.today-shell h1')

      const expressions = {
        idle: Boolean(document.querySelector('[data-sweepy-expression="idle"]')),
        cheer: Boolean(document.querySelector('[data-sweepy-expression="cheer"]')),
        wink: Boolean(document.querySelector('[data-sweepy-expression="wink"]')),
      }

      const surfaceStyle = surface ? getComputedStyle(surface) : null
      const controlStyle = control ? getComputedStyle(control) : null
      const fieldStyle = field ? getComputedStyle(field) : null
      const headingStyle = heading ? getComputedStyle(heading) : null
      const nestedEmptyParent = emptyStateNested?.closest('.day-bucket')
      const nestedEmptyParentStyle = nestedEmptyParent
        ? getComputedStyle(nestedEmptyParent)
        : null
      const nestedEmptyStyle = emptyStateNested
        ? getComputedStyle(emptyStateNested)
        : null

      return {
        tokens: {
          surface: token('--color-surface'),
          text: token('--color-text'),
          accent: token('--color-accent'),
          success: token('--color-success'),
          danger: token('--color-danger'),
          quiet: token('--color-quiet'),
          focus: token('--color-focus'),
          borderControl: token('--color-border-control'),
          fontDisplay: token('--font-display'),
          fontBody: token('--font-body'),
        },
        hooks: {
          hasSurface: Boolean(surface),
          hasControl: Boolean(control),
          hasField: Boolean(field),
          hasWeekBoard: Boolean(weekBoard),
          hasQuietSunday: Boolean(quietSunday),
          hasEmptyState: Boolean(emptyStateNested || emptyStateStandalone),
          hasCompletion: Boolean(completion),
          hasCelebrateBeat: Boolean(celebrateBeat),
          hasIcon: Boolean(icon),
          hasIdle: expressions.idle,
          hasCheer: expressions.cheer,
          hasWink: expressions.wink,
        },
        surface: surfaceStyle
          ? {
              borderWidth: surfaceStyle.borderTopWidth,
              borderRadius: surfaceStyle.borderRadius,
            }
          : null,
        control: controlStyle
          ? {
              borderWidth: controlStyle.borderTopWidth,
              minHeight: Number.parseFloat(controlStyle.minHeight),
            }
          : null,
        field: fieldStyle
          ? {
              borderWidth: fieldStyle.borderTopWidth,
              minHeight: Number.parseFloat(fieldStyle.minHeight),
            }
          : null,
        type: headingStyle
          ? {
              headingFamily: headingStyle.fontFamily,
              bodyFamily: getComputedStyle(document.body).fontFamily,
            }
          : null,
        nestedEmpty: nestedEmptyParentStyle && nestedEmptyStyle
          ? {
              parentHeight: nestedEmptyParentStyle.height,
              childHeight: nestedEmptyStyle.height,
              parentOverflowsChild:
                Number.parseFloat(nestedEmptyParentStyle.height)
                >= Number.parseFloat(nestedEmptyStyle.height),
            }
          : null,
      }
    })

    const colorTokenNames = [
      'surface',
      'text',
      'accent',
      'success',
      'danger',
      'quiet',
      'focus',
      'borderControl',
    ] as const
    for (const name of colorTokenNames) {
      expect(designBaselineSnapshot.tokens[name]).toMatch(/^(#|oklch|rgb|hsl|color-mix)/)
    }

    expect(designBaselineSnapshot.tokens.fontDisplay.toLowerCase()).toContain('fredoka')
    expect(designBaselineSnapshot.tokens.fontBody.toLowerCase()).toContain('atkinson')

    const requiredHooks = [
      'hasSurface',
      'hasControl',
      'hasField',
      'hasWeekBoard',
      'hasQuietSunday',
      'hasEmptyState',
      'hasCompletion',
      'hasCelebrateBeat',
      'hasIcon',
      'hasIdle',
      'hasCheer',
      'hasWink',
    ] as const
    for (const hook of requiredHooks) {
      expect(designBaselineSnapshot.hooks[hook], hook).toBe(true)
    }

    expect(designBaselineSnapshot.surface).not.toBeNull()
    expect(designBaselineSnapshot.control).not.toBeNull()
    expect(designBaselineSnapshot.field).not.toBeNull()
    expect(designBaselineSnapshot.type).not.toBeNull()
    expect(designBaselineSnapshot.nestedEmpty).not.toBeNull()
    expect(designBaselineSnapshot.nestedEmpty!.parentOverflowsChild).toBe(true)

    // Surfaces stay soft (no chunky outline); controls are chunky + tappable.
    expect(Number.parseFloat(designBaselineSnapshot.surface!.borderWidth)).toBeLessThan(1.5)
    expect(Number.parseFloat(designBaselineSnapshot.surface!.borderRadius)).toBeGreaterThanOrEqual(12)
    expect(Number.parseFloat(designBaselineSnapshot.control!.borderWidth)).toBeGreaterThanOrEqual(2)
    expect(designBaselineSnapshot.control!.minHeight).toBeGreaterThanOrEqual(44)
    expect(Number.parseFloat(designBaselineSnapshot.field!.borderWidth)).toBeGreaterThanOrEqual(2)
    expect(designBaselineSnapshot.field!.minHeight).toBeGreaterThanOrEqual(44)

    expect(designBaselineSnapshot.type!.headingFamily.toLowerCase()).toContain('fredoka')
    expect(designBaselineSnapshot.type!.bodyFamily.toLowerCase()).toContain('atkinson')
  })
})
