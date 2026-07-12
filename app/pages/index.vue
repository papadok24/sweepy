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
  dismissSyncNotice,
} = useWeekStore()

const todayLabel = computed(() => dayLabels[todayIndex.value] ?? 'Today')

const celebratingKey = ref<string | null>(null)

const todayAssignments = computed(() => {
  if (!week.value) return [] as WeekDayEntry[]
  return week.value.days.find(d => d.dayOfWeek === todayIndex.value)?.assignments ?? []
})

const canToggle = computed(() => week.value !== null && !hydrateError.value)

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
  celebratingKey.value = willComplete
    ? completionKey(choreId, dayOfWeek)
    : null
}
</script>

<template>
  <div
    class="app-shell"
    data-design-shell
    :data-week-ready="week ? 'true' : 'false'"
  >
    <header class="brand-lockup">
      <span
        class="sweepy-mascot sweepy-mascot--sm sweepy-mascot--idle"
        data-sweepy-expression="idle"
        aria-hidden="true"
        title="Sweepy idle"
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
              :class="{
                celebrate:
                  entry.completed
                  && celebratingKey === completionKey(entry.choreId, todayIndex),
                'celebrate--soft':
                  entry.completed
                  && celebratingKey !== completionKey(entry.choreId, todayIndex),
              }"
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

        <form class="chore-list" @submit.prevent>
          <label class="sr-only" for="chore-name">Chore name</label>
          <input
            id="chore-name"
            class="field control"
            name="name"
            type="text"
            placeholder="Add a chore name"
          >
          <button type="submit" class="btn control btn--primary">
            Save chore
          </button>
        </form>
      </template>
    </section>

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
                :class="{
                  celebrate:
                    entry.completed
                    && celebratingKey === completionKey(entry.choreId, day.dayOfWeek),
                  'celebrate--soft':
                    entry.completed
                    && celebratingKey !== completionKey(entry.choreId, day.dayOfWeek),
                }"
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
