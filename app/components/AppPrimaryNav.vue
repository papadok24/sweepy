<script setup lang="ts">
/**
 * Primary nav — four equal chunky controls in a wrap 2×2 (design.md / #63).
 * Today & Week stay board anchors; Sweeps is its own route; Add opens the board drawer
 * (or lands on `/?add=1` when already on Sweeps).
 */
const props = defineProps<{
  /** Active surface for aria-current. */
  active?: 'board' | 'sweeps'
  /**
   * When set, Add chore is a link (Sweeps → board Add flow).
   * When omitted, Add is a button that emits `add-chore`.
   */
  addHref?: string
}>()

const emit = defineEmits<{ 'add-chore': [] }>()

const addOpenBtn = ref<HTMLButtonElement | null>(null)
defineExpose({ addOpenBtn })

const todayHref = computed(() => (props.active === 'sweeps' ? '/#today' : '#today'))
const weekHref = computed(() => (props.active === 'sweeps' ? '/#week' : '#week'))
</script>

<template>
  <nav
    class="shell-nav shell-nav--wrap"
    aria-label="Primary"
    data-shell-nav="wrap"
  >
    <a
      class="btn control"
      :class="active === 'board' ? 'btn--primary' : 'btn--secondary'"
      :href="todayHref"
      :aria-current="active === 'board' ? 'page' : undefined"
    >
      <Icon name="mingcute:calendar-day-line" data-design-icon aria-hidden="true" />
      Today
    </a>
    <a
      class="btn control btn--secondary"
      :href="weekHref"
    >
      <Icon name="mingcute:calendar-week-line" aria-hidden="true" />
      Week
    </a>
    <NuxtLink
      class="btn control"
      :class="active === 'sweeps' ? 'btn--primary' : 'btn--secondary'"
      to="/sweeps"
      :aria-current="active === 'sweeps' ? 'page' : undefined"
      data-sweeps-nav
    >
      <Icon name="mingcute:sparkles-line" aria-hidden="true" />
      Sweeps
    </NuxtLink>
    <NuxtLink
      v-if="addHref"
      class="btn control btn--secondary"
      :to="addHref"
      data-add-chore-open
    >
      <Icon name="mingcute:add-line" aria-hidden="true" />
      Add chore
    </NuxtLink>
    <button
      v-else
      ref="addOpenBtn"
      type="button"
      class="btn control btn--secondary"
      data-add-chore-open
      @click="emit('add-chore')"
    >
      <Icon name="mingcute:add-line" aria-hidden="true" />
      Add chore
    </button>
  </nav>
</template>
