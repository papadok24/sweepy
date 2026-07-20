import type { Page } from 'playwright-core'
import { createPage, url } from '@nuxt/test-utils/e2e'
import {
  ADD_CHORE_AUDIO_SRC,
  COMPLETE_CHORE_AUDIO_SRC,
  FULL_SWEEP_AUDIO_SRC,
} from '../../app/utils/chore-audio.ts'

/** Re-export shared asset paths for e2e assertions. */
export const ADD_CHORE_SRC = ADD_CHORE_AUDIO_SRC
export const COMPLETE_CHORE_SRC = COMPLETE_CHORE_AUDIO_SRC
export const FULL_SWEEP_SRC = FULL_SWEEP_AUDIO_SRC

export type SoundPlayRecord = {
  src: string
  volume: number
  muted: boolean
}

export type SoundPauseRecord = {
  src: string
  muted: boolean
}

type SoundProbeState = {
  plays: SoundPlayRecord[]
  pauses: SoundPauseRecord[]
  /** Src args / assignments for `Audio` — proves player reuse vs overlap. */
  constructed: string[]
  deferPlay: boolean
  deferred: Array<{
    resolve: (value: void) => void
    reject: (reason?: unknown) => void
  }>
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
  const state = {
    plays: [],
    pauses: [],
    constructed: [],
    deferPlay: false,
    deferred: [],
  }
  window.__soundProbe = state
  const OriginalAudio = window.Audio
  const srcDesc = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'src',
  )
  window.Audio = function (src) {
    const audio =
      src == null || src === ''
        ? new OriginalAudio()
        : new OriginalAudio(src)
    if (src != null && src !== '') {
      state.constructed.push(String(src))
    }
    if (srcDesc && srcDesc.get && srcDesc.set) {
      Object.defineProperty(audio, 'src', {
        configurable: true,
        enumerable: true,
        get: function () {
          return srcDesc.get.call(this)
        },
        set: function (value) {
          const before = srcDesc.get.call(this)
          srcDesc.set.call(this, value)
          if (value && String(value) !== String(before || '')) {
            state.constructed.push(String(value))
          }
        },
      })
    }
    return audio
  }
  window.Audio.prototype = OriginalAudio.prototype
  Object.setPrototypeOf(window.Audio, OriginalAudio)
  const originalPlay = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () {
    const src = this.currentSrc || this.getAttribute('src') || ''
    state.plays.push({
      src: src,
      volume: this.volume,
      muted: this.muted,
    })
    if (state.deferPlay) {
      return new Promise(function (resolve, reject) {
        state.deferred.push({ resolve: resolve, reject: reject })
      })
    }
    return originalPlay.apply(this)
  }
  const originalPause = HTMLMediaElement.prototype.pause
  HTMLMediaElement.prototype.pause = function () {
    const src = this.currentSrc || this.getAttribute('src') || ''
    state.pauses.push({ src: src, muted: this.muted })
    return originalPause.apply(this)
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

/**
 * Replace `HTMLMediaElement.play` with a rejecting stub that still records
 * muted/unmuted attempts on the sound probe (warm-up + cue paths).
 */
export async function installRejectedPlayStub(page: Page): Promise<void> {
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
}

/** Open a page with the sound probe installed before any app scripts run. */
export async function createPageWithSoundProbe(path = '/'): Promise<Page> {
  const page = await createPage()
  await page.addInitScript(SOUND_PROBE_INIT)
  await page.goto(url(path), { waitUntil: 'hydration' })
  return page
}

/** Hydrated home page with a post-load sound probe ready for user actions. */
export async function openReadySoundPage(): Promise<Page> {
  const page = await createPage('/')
  await page.waitForSelector('[data-week-ready="true"]')
  await installSoundProbe(page)
  return page
}

export async function readSoundProbe(page: Page): Promise<SoundProbeState> {
  return await page.evaluate(() => {
    return (
      window.__soundProbe ?? {
        plays: [],
        pauses: [],
        constructed: [],
        deferPlay: false,
        deferred: [],
      }
    )
  })
}

export async function clearSoundPlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (!window.__soundProbe) return
    window.__soundProbe.plays = []
    window.__soundProbe.pauses = []
  })
}

export async function setDeferredPlay(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate((deferPlay) => {
    if (!window.__soundProbe) return
    window.__soundProbe.deferPlay = deferPlay
  }, enabled)
}

/** Resolve every play() promise currently held by deferred mode. */
export async function resolveDeferredPlays(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const probe = window.__soundProbe
    if (!probe) return 0
    const pending = probe.deferred.splice(0, probe.deferred.length)
    for (const entry of pending) entry.resolve()
    return pending.length
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

/** Unmuted cue plays only — excludes muted warm-up attempts. */
export function playsFor(plays: SoundPlayRecord[], path: string): SoundPlayRecord[] {
  return plays.filter(p => mediaPath(p.src) === path && !p.muted)
}

/** Muted warm-up play attempts. */
export function warmPlaysFor(plays: SoundPlayRecord[], path: string): SoundPlayRecord[] {
  return plays.filter(p => mediaPath(p.src) === path && p.muted)
}

export function pausesFor(pauses: SoundPauseRecord[], path: string): SoundPauseRecord[] {
  return pauses.filter(p => mediaPath(p.src) === path)
}

export function constructedFor(constructed: string[], path: string): string[] {
  return constructed.filter(src => mediaPath(src) === path)
}
