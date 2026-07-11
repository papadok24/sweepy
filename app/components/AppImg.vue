<script setup lang="ts">
/**
 * Project default for static rasters (ADR-0005).
 * Wraps NuxtImg so lazy loading is inherited without repeating it.
 * Format/quality come from Nuxt Image config.
 */
withDefaults(
  defineProps<{
    loading?: 'lazy' | 'eager'
  }>(),
  { loading: 'lazy' },
)
</script>

<template>
  <NuxtImg :loading="loading" />
</template>
