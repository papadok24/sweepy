export type WeekDayEntry = {
  choreId: number
  choreName: string
  choreNotes: string | null
  completed: boolean
  completedAt: number | null
}

export type WeekDay = {
  dayOfWeek: number
  assignments: WeekDayEntry[]
}

export type WeekView = {
  weekStart: string
  days: WeekDay[]
}

/** API day-of-week: 0 = Monday … 6 = Sunday. */
export function apiDayOfWeek(date = new Date()): number {
  return (date.getDay() + 6) % 7
}

const SYNC_NOTICE_MS = 4000

/**
 * Local-first this-week store (ADR-0006).
 * Hydrate once from GET /api/week; optimistic completion toggles;
 * failed writes rehydrate and set a subtle sync notice.
 *
 * SSR notes (see ADR-0006 “Hydration”):
 * - `week` is the `useAsyncData` payload itself (no mirrored useState).
 * - `todayIndex` is a `useState` seeded on the server so first client paint
 *   matches SSR HTML; after mount we realign to the browser clock.
 */
export function useWeekStore() {
  const syncNotice = useState<string | null>('week-sync-notice', () => null)
  const hydrateError = useState<string | null>('week-hydrate-error', () => null)

  // Seeded during SSR and serialized in the payload — do not call
  // apiDayOfWeek() ad hoc in setup for DOM branching (timezone mismatch).
  const todayIndex = useState('week-today-index', () => apiDayOfWeek())

  const {
    data: week,
    pending,
    error,
    refresh,
  } = useAsyncData('week-view', () => $fetch<WeekView>('/api/week'))

  let noticeTimer: ReturnType<typeof setTimeout> | undefined

  watch(
    week,
    (value) => {
      if (value) hydrateError.value = null
    },
    { immediate: true },
  )

  watch(
    error,
    (err) => {
      if (err && !week.value) {
        hydrateError.value = 'Couldn’t load this week. Try again.'
      }
    },
    { immediate: true },
  )

  // After hydration is safe, prefer the device-local “today”.
  if (import.meta.client) {
    onMounted(() => {
      todayIndex.value = apiDayOfWeek()
    })
  }

  function dismissSyncNotice() {
    syncNotice.value = null
    if (noticeTimer !== undefined) {
      clearTimeout(noticeTimer)
      noticeTimer = undefined
    }
  }

  function showSyncNotice(message: string) {
    syncNotice.value = message
    if (!import.meta.client) return
    if (noticeTimer !== undefined) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => {
      syncNotice.value = null
      noticeTimer = undefined
    }, SYNC_NOTICE_MS)
  }

  function setCompleted(choreId: number, dayOfWeek: number, completed: boolean) {
    const snapshot = week.value
    if (!snapshot) return
    const day = snapshot.days.find(d => d.dayOfWeek === dayOfWeek)
    const entry = day?.assignments.find(a => a.choreId === choreId)
    if (!entry) return
    entry.completed = completed
    entry.completedAt = completed ? Date.now() : null
    // Nuxt 4's useAsyncData returns a shallowRef, so deep mutations don't
    // notify subscribers on their own — trigger explicitly.
    triggerRef(week)
  }

  async function rehydrateFromServer() {
    const fresh = await $fetch<WeekView>('/api/week')
    week.value = fresh
    return fresh
  }

  function toggleCompletion(choreId: number, dayOfWeek: number) {
    const snapshot = week.value
    if (!snapshot) return

    const entry = snapshot.days
      .find(d => d.dayOfWeek === dayOfWeek)
      ?.assignments.find(a => a.choreId === choreId)
    if (!entry) return

    const next = !entry.completed
    setCompleted(choreId, dayOfWeek, next)

    void $fetch('/api/completions', {
      method: next ? 'POST' : 'DELETE',
      body: { choreId, dayOfWeek },
    }).catch(async () => {
      try {
        await rehydrateFromServer()
      }
      catch {
        // Still notify even if rehydrate fails.
      }
      showSyncNotice('Couldn’t save that check — board refreshed.')
    })
  }

  async function retryHydrate() {
    hydrateError.value = null
    try {
      await refresh()
      if (!week.value) {
        await rehydrateFromServer()
      }
    }
    catch {
      week.value = null
      hydrateError.value = 'Couldn’t load this week. Try again.'
    }
  }

  return {
    week,
    todayIndex,
    syncNotice,
    hydrateError,
    pending,
    toggleCompletion,
    retryHydrate,
    dismissSyncNotice,
  }
}
