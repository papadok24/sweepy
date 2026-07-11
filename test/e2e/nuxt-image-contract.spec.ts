import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'

/**
 * Seam: Nuxt Image static-raster contract (issues #15 / #16).
 * Asserts @nuxt/image is wired for static rasters under public/img/ —
 * a non-visual app-shell hook yields a real image with resolved src
 * and project defaults visible in the DOM (e.g. lazy loading).
 */
describe('Nuxt Image static-raster contract', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: true,
  })

  it('renders a known public/img raster through Nuxt Image with project defaults', async () => {
    const page = await createPage('/')

    // Contract hook is sr-only (non-visual); attach is enough.
    await page.waitForSelector('img[data-nuxt-image-contract]', { state: 'attached' })

    const snapshot = await page.evaluate(() => {
      const img = document.querySelector('img[data-nuxt-image-contract]')
      if (!(img instanceof HTMLImageElement)) {
        return null
      }

      return {
        src: img.getAttribute('src') ?? '',
        loading: img.getAttribute('loading'),
        // Nuxt Image stamps this on rendered <img> elements.
        isNuxtImg: img.hasAttribute('data-nuxt-img'),
      }
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot!.isNuxtImg).toBe(true)
    expect(snapshot!.src.length).toBeGreaterThan(0)
    expect(snapshot!.src).toMatch(/sweepy/i)
    expect(snapshot!.loading).toBe('lazy')
  })
})
