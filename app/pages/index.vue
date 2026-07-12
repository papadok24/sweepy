<script setup lang="ts">
import type { WeekDayEntry } from '~/composables/useWeekStore'

/** Monday-first labels aligned with API dayOfWeek (0 = Mon … 6 = Sun). */
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const {
  week,
  todayIndex,
  syncNotice,
  hydrateError,
  pending,
  toggleCompletion,
  retryHydrate,
  refreshWeek,
  dismissSyncNotice,
} = useWeekStore()

const todayLabel = computed(() => dayLabels[todayIndex.value] ?? 'Today')

/** Add-chore bottom drawer (issue #27) — await-and-refresh, not optimistic. */
const drawerRef = ref<HTMLDialogElement | null>(null)
const addChoreOpenBtn = ref<HTMLButtonElement | null>(null)
const choreName = ref('')
const choreNotes = ref('')
const selectedDays = ref<number[]>([])
const formError = ref<string | null>(null)
const saving = ref(false)

function resetAddChoreForm() {
  choreName.value = ''
  choreNotes.value = ''
  selectedDays.value = []
  formError.value = null
  saving.value = false
}

function openAddChore() {
  resetAddChoreForm()
  drawerRef.value?.showModal()
}

function closeAddChore() {
  drawerRef.value?.close()
}

function onDrawerClose() {
  resetAddChoreForm()
  addChoreOpenBtn.value?.focus()
}

function onDrawerClick(event: MouseEvent) {
  if (event.target === drawerRef.value) closeAddChore()
}

function toggleDay(day: number) {
  const next = new Set(selectedDays.value)
  if (next.has(day)) next.delete(day)
  else next.add(day)
  selectedDays.value = [...next].sort((a, b) => a - b)
}

function isDaySelected(day: number) {
  return selectedDays.value.includes(day)
}

async function submitAddChore() {
  const name = choreName.value.trim()
  if (!name) {
    formError.value = 'Enter a chore name.'
    return
  }
  if (selectedDays.value.length === 0) {
    formError.value = 'Pick at least one day.'
    return
  }

  formError.value = null
  saving.value = true
  try {
    const notes = choreNotes.value.trim()
    await $fetch('/api/chores', {
      method: 'POST',
      body: {
        name,
        ...(notes ? { notes } : {}),
        days: selectedDays.value,
      },
    })
    await refreshWeek()
    closeAddChore()
  }
  catch {
    formError.value = 'Couldn’t save that chore. Try again.'
  }
  finally {
    saving.value = false
  }
}

/**
 * One-shot celebration state (design.md "Delight with kindness"):
 * full sparkle on a completion after a quiet gap, soft sparkle on rapid
 * repeats. Cleared once the animation has played so completed rows rest
 * with no lingering pseudo-element to flicker on unrelated re-renders.
 */
const RAPID_REPEAT_MS = 1500
const CELEBRATE_CLEAR_MS = 400 // > --motion-med (280ms)

const celebratingKey = ref<string | null>(null)
const celebrateSoft = ref(false)
let lastCompletedAt = 0
let celebrateTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => {
  if (celebrateTimer !== undefined) clearTimeout(celebrateTimer)
})

function celebrationClass(choreId: number, dayOfWeek: number, entry: WeekDayEntry) {
  const active = entry.completed
    && celebratingKey.value === completionKey(choreId, dayOfWeek)
  return {
    celebrate: active && !celebrateSoft.value,
    'celebrate--soft': active && celebrateSoft.value,
  }
}

const todayAssignments = computed(() => {
  if (!week.value) return [] as WeekDayEntry[]
  return week.value.days.find(d => d.dayOfWeek === todayIndex.value)?.assignments ?? []
})

const canToggle = computed(() => Boolean(week.value) && !hydrateError.value)

function completionKey(choreId: number, dayOfWeek: number) {
  return `${choreId}:${dayOfWeek}`
}

function ariaLabelFor(entry: WeekDayEntry) {
  return entry.completed
    ? `${entry.choreName}, completed`
    : `${entry.choreName}, not completed`
}

function onToggle(choreId: number, dayOfWeek: number, entry: WeekDayEntry) {
  if (!canToggle.value) return
  const willComplete = !entry.completed
  toggleCompletion(choreId, dayOfWeek)

  if (celebrateTimer !== undefined) clearTimeout(celebrateTimer)

  if (!willComplete) {
    celebratingKey.value = null
    return
  }

  const now = Date.now()
  celebrateSoft.value = now - lastCompletedAt < RAPID_REPEAT_MS
  lastCompletedAt = now
  celebratingKey.value = completionKey(choreId, dayOfWeek)
  celebrateTimer = setTimeout(() => {
    celebratingKey.value = null
    celebrateTimer = undefined
  }, CELEBRATE_CLEAR_MS)
}
</script>

<template>
  <div
    class="app-shell"
    data-design-shell
    :data-week-ready="week ? 'true' : 'false'"
  >
    <header class="brand-lockup">
      <AppImg
        class="sweepy-mascot sweepy-mascot--sm sweepy-mascot--idle"
        data-sweepy-expression="idle"
        src="/img/sweepy.png"
        alt=""
        width="48"
        height="48"
        loading="eager"
        aria-hidden="true"
        title="Sweepy"
      />
      <div>
        <p class="brand-lockup__title">Sweepy</p>
        <p class="brand-lockup__tag">Household chores, day by day</p>
      </div>
    </header>

    <nav class="shell-nav" aria-label="Primary">
      <a class="btn control btn--primary" href="#today">
        <Icon name="mingcute:calendar-day-line" data-design-icon aria-hidden="true" />
        Today
      </a>
      <a class="btn control btn--secondary" href="#week">
        <Icon name="mingcute:calendar-week-line" aria-hidden="true" />
        Week
      </a>
      <button
        ref="addChoreOpenBtn"
        type="button"
        class="btn control btn--secondary"
        data-add-chore-open
        @click="openAddChore"
      >
        <Icon name="mingcute:add-line" aria-hidden="true" />
        Add chore
      </button>
    </nav>

    <div
      v-if="syncNotice"
      class="sync-notice"
      data-sync-notice
      role="status"
    >
      <p class="sync-notice__copy">{{ syncNotice }}</p>
      <button
        type="button"
        class="btn control btn--secondary sync-notice__dismiss"
        aria-label="Dismiss sync notice"
        @click="dismissSyncNotice"
      >
        Dismiss
      </button>
    </div>

    <section id="today" class="today-shell surface" aria-labelledby="today-heading">
      <div class="today-shell__header">
        <h1 id="today-heading">Today</h1>
        <p class="brand-lockup__tag">{{ todayLabel }} · current day bucket</p>
      </div>

      <div
        v-if="hydrateError"
        class="empty-state"
        data-week-error
      >
        <span
          class="sweepy-mascot sweepy-mascot--idle"
          data-sweepy-expression="idle"
          aria-hidden="true"
          title="Sweepy at rest"
        />
        <p class="empty-state__title">Week unavailable</p>
        <p class="empty-state__body">{{ hydrateError }}</p>
        <button
          type="button"
          class="btn control btn--primary"
          :disabled="pending"
          @click="retryHydrate"
        >
          Try again
        </button>
      </div>

      <div
        v-else-if="pending && !week"
        class="empty-state"
        data-week-loading
      >
        <p class="empty-state__title">Loading this week…</p>
      </div>

      <template v-else>
        <ul
          v-if="todayAssignments.length > 0"
          class="chore-list"
        >
          <li
            v-for="entry in todayAssignments"
            :key="entry.choreId"
            class="chore-slot surface"
          >
            <button
              type="button"
              class="completion control"
              :class="celebrationClass(entry.choreId, todayIndex, entry)"
              role="checkbox"
              :aria-checked="entry.completed"
              :aria-label="ariaLabelFor(entry)"
              :disabled="!canToggle"
              :data-week-chore="entry.choreId"
              :data-day-of-week="todayIndex"
              @click="onToggle(entry.choreId, todayIndex, entry)"
            >
              <span class="completion__mark" aria-hidden="true" />
            </button>
            <span class="chore-slot__name">{{ entry.choreName }}</span>
          </li>
        </ul>

        <div
          v-else
          class="empty-state"
        >
          <span
            class="sweepy-mascot sweepy-mascot--wink"
            data-sweepy-expression="wink"
            aria-hidden="true"
            title="Sweepy wink"
          />
          <p class="empty-state__title">All clear</p>
          <p class="empty-state__body">
            No chores assigned to today’s day bucket.
          </p>
        </div>

        <div class="celebrate-beat surface" data-celebrate-beat>
          <span
            class="sweepy-mascot sweepy-mascot--sm sweepy-mascot--cheer"
            data-sweepy-expression="cheer"
            aria-hidden="true"
            title="Sweepy cheer"
          />
          <p class="celebrate-beat__copy">Nice — chore complete!</p>
        </div>
      </template>
    </section>

    <dialog
      ref="drawerRef"
      class="add-chore-drawer"
      data-add-chore-drawer
      aria-labelledby="add-chore-heading"
      @close="onDrawerClose"
      @click="onDrawerClick"
    >
      <form
        class="add-chore-drawer__panel surface"
        @submit.prevent="submitAddChore"
      >
        <div class="add-chore-drawer__header">
          <h2 id="add-chore-heading">Add chore</h2>
          <button
            type="button"
            class="btn control btn--secondary"
            data-add-chore-close
            aria-label="Close add chore"
            @click="closeAddChore"
          >
            Close
          </button>
        </div>

        <label class="add-chore-drawer__label" for="add-chore-name">Name</label>
        <input
          id="add-chore-name"
          v-model="choreName"
          class="field control"
          data-add-chore-name
          name="name"
          type="text"
          autocomplete="off"
          placeholder="e.g. Dishes"
          :disabled="saving"
        >

        <label class="add-chore-drawer__label" for="add-chore-notes">Notes (optional)</label>
        <input
          id="add-chore-notes"
          v-model="choreNotes"
          class="field control"
          data-add-chore-notes
          name="notes"
          type="text"
          autocomplete="off"
          placeholder="e.g. use the wood cleaner"
          :disabled="saving"
        >

        <p class="add-chore-drawer__label" id="add-chore-days-label">Days</p>
        <div
          class="add-chore-drawer__days"
          role="group"
          aria-labelledby="add-chore-days-label"
        >
          <button
            v-for="(label, day) in dayLabels"
            :key="day"
            type="button"
            class="btn control add-chore-day"
            :class="{ 'add-chore-day--selected': isDaySelected(day) }"
            :data-add-chore-day="day"
            :aria-pressed="isDaySelected(day)"
            :disabled="saving"
            @click="toggleDay(day)"
          >
            {{ label }}
          </button>
        </div>

        <p
          v-if="formError"
          class="add-chore-drawer__error"
          data-add-chore-error
          role="alert"
        >
          {{ formError }}
        </p>

        <button
          type="submit"
          class="btn control btn--primary"
          data-add-chore-submit
          :disabled="saving"
          :aria-busy="saving"
        >
          {{ saving ? 'Saving…' : 'Save chore' }}
        </button>
      </form>
    </dialog>

    <section id="week" class="week-board surface" aria-labelledby="week-heading">
      <h2 id="week-heading">Week</h2>
      <div
        v-if="hydrateError"
        class="empty-state"
      >
        <p class="empty-state__title">Week unavailable</p>
        <p class="empty-state__body">{{ hydrateError }}</p>
      </div>
      <div
        v-else-if="pending && !week"
        class="empty-state"
      >
        <p class="empty-state__title">Loading this week…</p>
      </div>
      <div
        v-else-if="week"
        class="week-board__days"
      >
        <article
          v-for="day in week.days"
          :key="day.dayOfWeek"
          class="day-bucket surface"
          :class="{ 'day-bucket--quiet': day.dayOfWeek === 6 }"
        >
          <h3 class="day-bucket__label">{{ dayLabels[day.dayOfWeek] }}</h3>

          <div
            v-if="day.dayOfWeek === 6 && day.assignments.length === 0"
            class="empty-state"
          >
            <span
              class="sweepy-mascot sweepy-mascot--idle"
              data-sweepy-expression="idle"
              aria-hidden="true"
              title="Sweepy at rest"
            />
            <p class="empty-state__title">Rest day</p>
            <p class="empty-state__body">
              Sunday is usually kept free — assignments are still allowed.
            </p>
          </div>

          <div
            v-else-if="day.assignments.length === 0"
            class="empty-state"
          >
            <span
              class="sweepy-mascot sweepy-mascot--wink"
              data-sweepy-expression="wink"
              aria-hidden="true"
              title="Sweepy wink"
            />
            <p class="empty-state__title">All clear</p>
            <p class="empty-state__body">
              No chores assigned to this day bucket.
            </p>
          </div>

          <ul
            v-else
            class="chore-list"
          >
            <li
              v-for="entry in day.assignments"
              :key="`${day.dayOfWeek}-${entry.choreId}`"
              class="chore-slot surface"
            >
              <button
                type="button"
                class="completion control"
                :class="celebrationClass(entry.choreId, day.dayOfWeek, entry)"
                role="checkbox"
                :aria-checked="entry.completed"
                :aria-label="ariaLabelFor(entry)"
                :disabled="!canToggle"
                :data-week-chore="entry.choreId"
                :data-day-of-week="day.dayOfWeek"
                @click="onToggle(entry.choreId, day.dayOfWeek, entry)"
              >
                <span class="completion__mark" aria-hidden="true" />
              </button>
              <span class="chore-slot__name">{{ entry.choreName }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>
