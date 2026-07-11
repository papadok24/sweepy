import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'

/**
 * Seam: design baseline contract (issue #8).
 * Asserts the vanilla CSS baseline is wired into the Nuxt app shell —
 * semantic tokens resolve and surface/control hooks are usable.
 */
describe('design baseline contract', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: true,
  })

  it('loads the app shell with design baseline tokens and recipes', async () => {
    const page = await createPage('/')

    await page.waitForSelector('[data-design-shell]')

    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)

      const token = (name: string) => root.getPropertyValue(name).trim()

      const surface = document.querySelector('.surface')
      const control = document.querySelector('.control')
      const field = document.querySelector('.field.control')
      const weekBoard = document.querySelector('.week-board')
      const quietSunday = document.querySelector('.day-bucket--quiet')
      const completion = document.querySelector('.completion')
      const icon = document.querySelector('[data-design-icon]')
      const heading = document.querySelector('.today-shell h1')

      const surfaceStyle = surface ? getComputedStyle(surface) : null
      const controlStyle = control ? getComputedStyle(control) : null
      const fieldStyle = field ? getComputedStyle(field) : null
      const headingStyle = heading ? getComputedStyle(heading) : null

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
          hasCompletion: Boolean(completion),
          hasIcon: Boolean(icon),
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
      expect(contract.tokens[name]).toMatch(/^(#|oklch|rgb|hsl|color-mix)/)
    }

    expect(contract.tokens.fontDisplay.toLowerCase()).toContain('fredoka')
    expect(contract.tokens.fontBody.toLowerCase()).toContain('atkinson')

    expect(contract.hooks.hasSurface).toBe(true)
    expect(contract.hooks.hasControl).toBe(true)
    expect(contract.hooks.hasField).toBe(true)
    expect(contract.hooks.hasWeekBoard).toBe(true)
    expect(contract.hooks.hasQuietSunday).toBe(true)
    expect(contract.hooks.hasCompletion).toBe(true)
    expect(contract.hooks.hasIcon).toBe(true)

    expect(contract.surface).not.toBeNull()
    expect(contract.control).not.toBeNull()
    expect(contract.field).not.toBeNull()
    expect(contract.type).not.toBeNull()

    // Surfaces stay soft (no chunky outline); controls are chunky + tappable.
    expect(Number.parseFloat(contract.surface!.borderWidth)).toBeLessThan(1.5)
    expect(Number.parseFloat(contract.surface!.borderRadius)).toBeGreaterThanOrEqual(12)
    expect(Number.parseFloat(contract.control!.borderWidth)).toBeGreaterThanOrEqual(2)
    expect(contract.control!.minHeight).toBeGreaterThanOrEqual(44)
    expect(Number.parseFloat(contract.field!.borderWidth)).toBeGreaterThanOrEqual(2)
    expect(contract.field!.minHeight).toBeGreaterThanOrEqual(44)

    expect(contract.type!.headingFamily.toLowerCase()).toContain('fredoka')
    expect(contract.type!.bodyFamily.toLowerCase()).toContain('atkinson')
  })
})
