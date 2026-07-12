import type { Page } from 'playwright-core'
import { createPage, url } from '@nuxt/test-utils/e2e'

/** Asset paths shipped for chore interaction cues (issue #31). */
export const ADD_CHORE_SRC = '/audio/sweepy_add_chore.wav'
export const COMPLETE_CHORE_SRC = '/audio/sweepy_chore_complete.wav'

export type SoundPlayRecord = {
  src: string
  volume: number
}

type SoundProbeState = {
  plays: SoundPlayRecord[]
  /** Src args passed to `new Audio(...)` — proves player reuse vs overlap. */
  constructed: string[]
}

declare global {
  interface Window {
    __soundProbe?: SoundProbeState
  }
}

/**
 * Source installed into the page. Kept as a string so Playwright serialization
 * never ships TypeScript syntax into the browser.
 */
const SOUND_PROBE_INIT = `(() => {
  if (window.__soundProbe) return
  const state = { plays: [], constructed: [] }
  window.__soundProbe = state
  const OriginalAudio = window.Audio
  window.Audio = function (src) {
    state.constructed.push(src == null ? '' : src)
    return new OriginalAudio(src)
  }
  window.Audio.prototype = OriginalAudio.prototype
  Object.setPrototypeOf(window.Audio, OriginalAudio)
  const originalPlay = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () {
    const src = this.currentSrc || this.getAttribute('src') || ''
    state.plays.push({ src: src, volume: this.volume })
    return originalPlay.apply(this)
  }
})()`

/**
 * Install the media probe after navigation (before user actions).
 * Misses Audio constructed during initial mount — prefer
 * `createPageWithSoundProbe` when reuse/construction matters.
 */
export async function installSoundProbe(page: Page): Promise<void> {
  await page.evaluate(SOUND_PROBE_INIT)
}

/** Open a page with the sound probe installed before any app scripts run. */
export async function createPageWithSoundProbe(path = '/'): Promise<Page> {
  const page = await createPage()
  await page.addInitScript(SOUND_PROBE_INIT)
  await page.goto(url(path), { waitUntil: 'hydration' })
  return page
}

export async function readSoundProbe(page: Page): Promise<SoundProbeState> {
  return await page.evaluate(() => {
    return window.__soundProbe ?? { plays: [], constructed: [] }
  })
}

export async function clearSoundPlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.__soundProbe) window.__soundProbe.plays = []
  })
}

/** Normalize absolute or relative media URLs to a path for assertions. */
export function mediaPath(src: string): string {
  try {
    return new URL(src, 'http://localhost').pathname
  }
  catch {
    return src
  }
}

export function playsFor(plays: SoundPlayRecord[], path: string): SoundPlayRecord[] {
  return plays.filter(p => mediaPath(p.src) === path)
}

export function constructedFor(constructed: string[], path: string): string[] {
  return constructed.filter(src => mediaPath(src) === path)
}
