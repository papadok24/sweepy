/**
 * Client-only chore interaction sounds (issue #31).
 * Best-effort playback — never throws into chore/completion flows.
 */

const ADD_CHORE_AUDIO_SRC = '/audio/sweepy_add_chore.wav'
const COMPLETE_CHORE_AUDIO_SRC = '/audio/sweepy_chore_complete.wav'

/** Full cue gain for add-chore and normal Completion. */
const FULL_VOLUME = 1
/** Lower gain for rapid-repeat `complete-soft` within the shared celebration window. */
const COMPLETE_SOFT_VOLUME = 0.45

function playCue(audio: HTMLAudioElement | null, volume: number): void {
  if (!audio) return
  try {
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

export function useChoreSounds() {
  let addAudio: HTMLAudioElement | null = null
  let completeAudio: HTMLAudioElement | null = null

  function ensurePlayers() {
    if (!import.meta.client) return
    if (!addAudio) {
      addAudio = new Audio(ADD_CHORE_AUDIO_SRC)
      addAudio.preload = 'auto'
    }
    if (!completeAudio) {
      completeAudio = new Audio(COMPLETE_CHORE_AUDIO_SRC)
      completeAudio.preload = 'auto'
    }
  }

  onMounted(() => {
    ensurePlayers()
  })

  function playAddChore() {
    ensurePlayers()
    playCue(addAudio, FULL_VOLUME)
  }

  function playComplete(options: { soft?: boolean } = {}) {
    ensurePlayers()
    playCue(
      completeAudio,
      options.soft ? COMPLETE_SOFT_VOLUME : FULL_VOLUME,
    )
  }

  return { playAddChore, playComplete }
}
