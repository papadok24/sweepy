<script setup lang="ts">
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const demoChores = [
  { id: 1, name: 'Dishes', done: true },
  { id: 2, name: 'Vacuum living room', done: false },
  { id: 3, name: 'Wipe counters', done: false },
] as const

const celebratingId = ref<number | null>(1)
</script>

<template>
  <div class="app-shell" data-design-shell>
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

    <section id="today" class="today-shell surface" aria-labelledby="today-heading">
      <div class="today-shell__header">
        <h1 id="today-heading">Today</h1>
        <p class="brand-lockup__tag">Monday · current day bucket</p>
      </div>

      <ul class="chore-list">
        <li
          v-for="chore in demoChores"
          :key="chore.id"
          class="chore-slot surface"
        >
          <button
            type="button"
            class="completion control"
            :class="{
              celebrate: chore.done && celebratingId === chore.id,
              'celebrate--soft': chore.done && celebratingId !== chore.id,
            }"
            role="checkbox"
            :aria-checked="chore.done"
            :aria-label="`Mark ${chore.name} complete`"
          >
            <span class="completion__mark" aria-hidden="true" />
          </button>
          <span class="chore-slot__name">{{ chore.name }}</span>
        </li>
      </ul>

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
    </section>

    <section id="week" class="week-board surface" aria-labelledby="week-heading">
      <h2 id="week-heading">Week</h2>
      <div class="week-board__days">
        <article
          v-for="(label, dayOfWeek) in dayLabels"
          :key="label"
          class="day-bucket surface"
          :class="{ 'day-bucket--quiet': dayOfWeek === 0 }"
        >
          <h3 class="day-bucket__label">{{ label }}</h3>
          <div
            v-if="dayOfWeek === 0"
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
            v-else-if="dayOfWeek === 2"
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
          <p v-else-if="dayOfWeek === 1" class="brand-lockup__tag">
            Dishes · Vacuum living room
          </p>
          <p v-else class="brand-lockup__tag">No chores assigned</p>
        </article>
      </div>
    </section>
  </div>
</template>
