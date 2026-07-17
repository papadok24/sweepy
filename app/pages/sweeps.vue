<script setup lang="ts">
type SweepsFilter = 'lately' | 'awhile' | 'forever'

type SweepsWeek = {
  weekId: string
  label: string
  sparkles: number
  isCurrent: boolean
}

type SweepsSnapshot = {
  filter: SweepsFilter
  definition: string
  totalSparkles: number
  weeks: SweepsWeek[]
  chores: Array<{
    choreId: number
    name: string
    sparkles: number
    archived?: boolean
  }>
  peak: SweepsWeek | null
  empty: boolean
}

const FILTERS: { key: SweepsFilter, label: string }[] = [
  { key: 'lately', label: 'Lately' },
  { key: 'awhile', label: 'A while' },
  { key: 'forever', label: 'Forever' },
]

const filter = ref<SweepsFilter>('lately')

const {
  data: snapshot,
  pending,
  error,
  refresh,
} = await useAsyncData(
  'sweeps-snapshot',
  () => $fetch<SweepsSnapshot>('/api/sweeps', { query: { filter: filter.value } }),
  { watch: [filter] },
)

function setFilter(next: SweepsFilter) {
  if (filter.value === next) return
  filter.value = next
}

function weekCardLabel(week: SweepsWeek) {
  if (week.sparkles === 0) return `${week.label}, a quiet Week`
  return `${week.label}, ${week.sparkles} sparkles`
}
</script>

<template>
  <div class="app-shell" data-design-shell data-sweeps-page>
    <AppPrimaryNav active="sweeps" add-href="/?add=1" />

    <div class="sweeps">
      <header class="sweeps-head">
        <div class="sweeps-head__brand">
          <AppImg
            class="sweepy-mascot sweepy-mascot--sm sweepy-mascot--idle"
            data-sweepy-expression="idle"
            src="/img/sweepy.png"
            alt=""
            width="56"
            height="56"
            loading="eager"
            aria-hidden="true"
          />
          <div>
            <h1 class="sweeps__title">Sweeps</h1>
            <p class="sweeps__lede">Little memories from the board.</p>
          </div>
        </div>

        <div
          class="sweeps__filters"
          role="group"
          aria-label="Time window"
        >
          <button
            v-for="f in FILTERS"
            :key="f.key"
            type="button"
            class="sweeps-chip control"
            :class="{ 'sweeps-chip--on': filter === f.key }"
            :aria-pressed="filter === f.key"
            :disabled="pending"
            @click="setFilter(f.key)"
          >
            {{ f.label }}
          </button>
        </div>

        <div
          v-if="snapshot"
          class="sweeps-bubble surface"
          aria-live="polite"
        >
          <p class="sweeps-bubble__label">
            {{ FILTERS.find(f => f.key === filter)?.label }}
          </p>
          <p class="sweeps-bubble__body">{{ snapshot.definition }}</p>
        </div>
      </header>

      <div
        v-if="error"
        class="empty-state surface"
        role="alert"
      >
        <p class="empty-state__title">Couldn’t load Sweeps</p>
        <p class="empty-state__body">Try again in a moment.</p>
        <button
          type="button"
          class="btn control btn--secondary"
          @click="refresh()"
        >
          Retry
        </button>
      </div>

      <template v-else-if="snapshot">
        <div
          v-if="snapshot.empty"
          class="empty-state surface sweeps__empty"
        >
          <AppImg
            class="sweepy-mascot sweepy-mascot--wink"
            data-sweepy-expression="wink"
            src="/img/sweepy.png"
            alt=""
            width="96"
            height="96"
            aria-hidden="true"
          />
          <p class="empty-state__title">Pages still blank</p>
          <p class="empty-state__body">
            When sparkles show up, this scrapbook fills with Week postcards.
          </p>
        </div>

        <template v-else>
          <section
            v-if="snapshot.peak"
            class="sweeps-postcard sweeps-postcard--peak surface"
            aria-labelledby="sweeps-peak-heading"
          >
            <h2 id="sweeps-peak-heading">Brightest Week</h2>
            <p class="sweeps-postcard__label">{{ snapshot.peak.label }}</p>
            <p class="sweeps-postcard__body">
              {{ snapshot.peak.sparkles }} sparkles — the household’s glow-up in this window.
            </p>
          </section>

          <section aria-labelledby="sweeps-cards-heading">
            <h2 id="sweeps-cards-heading" class="sweeps-section">
              Week postcards
            </h2>
            <div
              class="sweeps-cards"
              tabindex="0"
              role="region"
              aria-label="Week sparkle postcards"
            >
              <article
                v-for="week in snapshot.weeks"
                :key="week.weekId"
                class="sweeps-card surface"
                :class="{
                  'sweeps-card--empty': week.sparkles === 0,
                  'sweeps-card--current': week.isCurrent,
                  'sweeps-card--peak': snapshot.peak?.weekId === week.weekId,
                }"
                :aria-label="weekCardLabel(week)"
              >
                <p class="sweeps-card__label">{{ week.label }}</p>
                <p
                  v-if="week.sparkles === 0"
                  class="sweeps-card__quiet"
                >
                  A quiet Week
                </p>
                <p
                  v-else
                  class="sweeps-card__n"
                >
                  {{ week.sparkles }}
                  <span>sparkles</span>
                </p>
              </article>
            </div>
          </section>

          <section aria-labelledby="sweeps-stickers-heading">
            <h2 id="sweeps-stickers-heading" class="sweeps-section">
              Sticker shelf
            </h2>
            <p class="sweeps-shelf__hint">
              Chores that sparked · {{ snapshot.totalSparkles }} sparkles
            </p>
            <ul class="sweeps-stickers">
              <li
                v-for="chore in snapshot.chores"
                :key="chore.choreId"
                class="sweeps-sticker"
                :class="{ 'sweeps-sticker--archived': chore.archived }"
              >
                <span class="sweeps-sticker__name">{{ chore.name }}</span>
                <span class="sweeps-sticker__n">{{ chore.sparkles }}</span>
                <span
                  v-if="chore.archived"
                  class="sweeps-archived"
                >archived</span>
              </li>
            </ul>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>
