/**
 * Client-only chore interaction sounds (issue #31 / #56).
 * Best-effort playback — never throws into chore/completion flows.
 *
 * Players are constructed on mount and warmed once on the first trusted
 * pointer/keyboard gesture so the first audible cue is not a cold start.
 */

import {
  ADD_CHORE_AUDIO_SRC,
  COMPLETE_CHORE_AUDIO_SRC,
  COMPLETE_SOFT_VOLUME,
  FULL_SWEEP_AUDIO_SRC,
  FULL_VOLUME,
} from '~/utils/chore-audio'

type CuePlayer = {
  audio: HTMLAudioElement
  /** Bumped on real cue play so stale warm-up cleanup cannot interrupt it. */
  playToken: number
}

function createPlayer(src: string): CuePlayer {
  const audio = new Audio()
  audio.preload = 'auto'
  audio.src = src
  audio.load()
  return { audio, playToken: 0 }
}

function resetAfterWarm(player: CuePlayer, playToken: number): void {
  if (player.playToken !== playToken) return
  try {
    player.audio.pause()
    player.audio.currentTime = 0
    player.audio.muted = false
    player.audio.volume = FULL_VOLUME
  }
  catch {
    // Ignore cleanup failures after warm-up.
  }
}

function playCue(player: CuePlayer | null, volume: number): void {
  if (!player) return
  const { audio } = player
  try {
    player.playToken += 1
    audio.muted = false
    audio.pause()
    audio.currentTime = 0
    audio.volume = volume
    void audio.play().catch(() => {
      // Autoplay / unsupported media — ignore.
    })
  }
  catch {
    // Unsupported media element behavior — ignore.
  }
}

function warmPlayer(player: CuePlayer): void {
  const { audio } = player
  const playToken = player.playToken
  try {
    audio.muted = true
    audio.volume = 0
    audio.currentTime = 0
    void audio.play()
      .then(() => resetAfterWarm(player, playToken))
      .catch(() => resetAfterWarm(player, playToken))
  }
  catch {
    resetAfterWarm(player, playToken)
  }
}

export function useChoreSounds() {
  let addPlayer: CuePlayer | null = null
  let completePlayer: CuePlayer | null = null
  let fullSweepPlayer: CuePlayer | null = null
  let warmed = false

  function ensurePlayers() {
    if (!import.meta.client) return
    if (!addPlayer) addPlayer = createPlayer(ADD_CHORE_AUDIO_SRC)
    if (!completePlayer) completePlayer = createPlayer(COMPLETE_CHORE_AUDIO_SRC)
    if (!fullSweepPlayer) fullSweepPlayer = createPlayer(FULL_SWEEP_AUDIO_SRC)
  }

  function warmAllPlayers() {
    if (warmed) return
    warmed = true
    ensurePlayers()
    for (const player of [addPlayer, completePlayer, fullSweepPlayer]) {
      if (player) warmPlayer(player)
    }
  }

  function onTrustedGesture(event: Event) {
    if (!event.isTrusted) return
    detachWarmListeners()
    warmAllPlayers()
  }

  function attachWarmListeners() {
    window.addEventListener('pointerdown', onTrustedGesture, { capture: true })
    window.addEventListener('keydown', onTrustedGesture, { capture: true })
  }

  function detachWarmListeners() {
    window.removeEventListener('pointerdown', onTrustedGesture, { capture: true })
    window.removeEventListener('keydown', onTrustedGesture, { capture: true })
  }

  onMounted(() => {
    ensurePlayers()
    attachWarmListeners()
  })

  onBeforeUnmount(() => {
    detachWarmListeners()
  })

  function playAddChore() {
    ensurePlayers()
    playCue(addPlayer, FULL_VOLUME)
  }

  function playComplete(options: { soft?: boolean } = {}) {
    ensurePlayers()
    playCue(
      completePlayer,
      options.soft ? COMPLETE_SOFT_VOLUME : FULL_VOLUME,
    )
  }

  function playFullSweep() {
    ensurePlayers()
    playCue(fullSweepPlayer, FULL_VOLUME)
  }

  return { playAddChore, playComplete, playFullSweep }
}
