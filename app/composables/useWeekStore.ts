import type { WeekView } from '#shared/types/week'

export type { WeekDayEntry, WeekDay, WeekView } from '#shared/types/week'

/**
 * Local-first this-week store (ADR-0006).
 * Hydrate once from GET /api/week; optimistic completion toggles and Edit Save;
 * failed writes rehydrate and set a subtle sync notice. Archive and Rain check
 * await then refresh.
 *
 * SSR notes (see ADR-0006 “Hydration” + ADR 0008):
 * - `week` is the `useAsyncData` payload itself (no mirrored useState).
 * - Household “today” comes from `week.todayDayOfWeek` — never browser Date
 *   for shared-board markup (device snap removed).
 */
export function useWeekStore() {
  const syncNotice = useState<string | null>('week-sync-notice', () => null)
  const hydrateError = useState<string | null>('week-hydrate-error', () => null)

  const {
    data: week,
    pending,
    error,
    refresh,
  } = useAsyncData('week-view', () => $fetch<WeekView>('/api/week'))

  /** Household today from Week payload only — undefined until week hydrates. */
  const todayIndex = computed(() => week.value?.todayDayOfWeek)

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

  function dismissSyncNotice() {
    syncNotice.value = null
    if (noticeTimer !== undefined) {
      clearTimeout(noticeTimer)
    }
    noticeTimer = undefined
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
    if (entry.rainChecked) return

    const next = !entry.completed
    setCompleted(choreId, dayOfWeek, next)

    // Uncheck uses path params — DELETE with a JSON body hangs on Cloudflare
    // Workers (Error 1101). See ADR 0001.
    void (next
      ? $fetch('/api/completions', {
          method: 'POST',
          body: { choreId, dayOfWeek },
        })
      : $fetch(`/api/completions/${choreId}/${dayOfWeek}`, {
          method: 'DELETE',
        })
    ).catch(async () => {
      try {
        await rehydrateFromServer()
      }
      catch {
        // Still notify even if rehydrate fails.
      }
      showSyncNotice('Couldn’t save that check — board refreshed.')
    })
  }

  function currentDaysForChore(choreId: number): number[] {
    const snapshot = week.value
    if (!snapshot) return []
    return snapshot.days
      .filter(d => d.assignments.some(a => a.choreId === choreId))
      .map(d => d.dayOfWeek)
      .sort((a, b) => a - b)
  }

  function applyChoreEditLocally(input: {
    choreId: number
    name: string
    notes: string | null
    days: number[]
  }) {
    const snapshot = week.value
    if (!snapshot) return

    const desired = new Set(input.days)
    const existingListItems = snapshot.days
      .flatMap(d => d.assignments)
      .find(a => a.choreId === input.choreId)
      ?.choreListItems ?? []
    const rainChecked = snapshot.days
      .flatMap(d => d.assignments)
      .find(a => a.choreId === input.choreId)
      ?.rainChecked ?? false

    for (const day of snapshot.days) {
      const existing = day.assignments.find(a => a.choreId === input.choreId)
      if (desired.has(day.dayOfWeek)) {
        if (existing) {
          existing.choreName = input.name
          existing.choreNotes = input.notes
        }
        else {
          day.assignments.push({
            choreId: input.choreId,
            choreName: input.name,
            choreNotes: input.notes,
            choreListItems: [...existingListItems],
            completed: false,
            completedAt: null,
            rainChecked,
          })
        }
      }
      else if (existing) {
        day.assignments = day.assignments.filter(a => a.choreId !== input.choreId)
      }
    }
    triggerRef(week)
  }

  /**
   * Optimistic Edit Save (ADR 0006): patch local Week, then fire PATCH +
   * composed per-day Assignment add/remove. Failure → rehydrate + notice.
   */
  function saveChoreEdit(input: {
    choreId: number
    name: string
    notes: string | null
    days: number[]
  }) {
    const beforeDays = currentDaysForChore(input.choreId)
    applyChoreEditLocally(input)

    const toAdd = input.days.filter(d => !beforeDays.includes(d))
    const toRemove = beforeDays.filter(d => !input.days.includes(d))

    void Promise.all([
      $fetch(`/api/chores/${input.choreId}`, {
        method: 'PATCH',
        body: {
          name: input.name,
          notes: input.notes,
        },
      }),
      ...toAdd.map(dayOfWeek =>
        $fetch(`/api/chores/${input.choreId}/assignments`, {
          method: 'POST',
          body: { dayOfWeek },
        }),
      ),
      ...toRemove.map(dayOfWeek =>
        $fetch(`/api/chores/${input.choreId}/assignments/${dayOfWeek}`, {
          method: 'DELETE',
        }),
      ),
    ]).catch(async () => {
      try {
        await rehydrateFromServer()
      }
      catch {
        // Still notify even if rehydrate fails.
      }
      showSyncNotice('Couldn’t save that edit — board refreshed.')
    })
  }

  /**
   * Patch List labels on every Week membership for a Chore.
   * Used after await-settled List add/remove (cue count must not lie).
   */
  function applyListItemsLocally(choreId: number, listItems: string[]) {
    const snapshot = week.value
    if (!snapshot) return

    for (const day of snapshot.days) {
      const entry = day.assignments.find(a => a.choreId === choreId)
      if (entry) entry.choreListItems = [...listItems]
    }
    triggerRef(week)
  }

  async function settleListMutation(
    choreId: number,
    request: Promise<{ listItems: string[] }>,
  ) {
    const result = await request
    applyListItemsLocally(choreId, result.listItems)
    return result.listItems
  }

  /**
   * Await List prepend, then patch local Week (ADR 0006 honesty for Today cue).
   * Soft-cap / validation errors propagate to the caller.
   */
  async function addChoreListItem(choreId: number, label: string) {
    return settleListMutation(
      choreId,
      $fetch<{ listItems: string[] }>(`/api/chores/${choreId}/list-items`, {
        method: 'POST',
        body: { label },
      }),
    )
  }

  /** Await List remove-by-index, then patch local Week. */
  async function removeChoreListItem(choreId: number, index: number) {
    return settleListMutation(
      choreId,
      $fetch<{ listItems: string[] }>(
        `/api/chores/${choreId}/list-items/${index}`,
        { method: 'DELETE' },
      ),
    )
  }

  /** Await-and-refresh Archive (same settlement family as Add Chore). */
  async function archiveChore(choreId: number) {
    await $fetch(`/api/chores/${choreId}/archive`, { method: 'POST' })
    await rehydrateFromServer()
  }

  /** Await-and-refresh Rain check take (Edit-drawer lifecycle). */
  async function takeRainCheck(choreId: number) {
    await $fetch(`/api/chores/${choreId}/rain-check`, { method: 'POST' })
    await rehydrateFromServer()
  }

  /** Await-and-refresh Rain check clear (Edit-drawer lifecycle). */
  async function clearRainCheck(choreId: number) {
    await $fetch(`/api/chores/${choreId}/rain-check`, { method: 'DELETE' })
    await rehydrateFromServer()
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
      week.value = undefined
      hydrateError.value = 'Couldn’t load this week. Try again.'
    }
  }

  /** Non-optimistic board refresh after create/archive (not Edit Save). */
  async function refreshWeek() {
    await rehydrateFromServer()
  }

  return {
    week,
    todayIndex,
    syncNotice,
    hydrateError,
    pending,
    toggleCompletion,
    saveChoreEdit,
    addChoreListItem,
    removeChoreListItem,
    archiveChore,
    takeRainCheck,
    clearRainCheck,
    retryHydrate,
    refreshWeek,
    dismissSyncNotice,
  }
}

const SYNC_NOTICE_MS = 4000
