<script setup lang="ts">
const MAX_STARS = 3

const { stars, step } = defineProps<{
  stars: number
  /** Milliseconds between earned stars popping in; without it the stars are static. */
  step?: number
}>()
</script>

<template>
  <p class="level-result-stars" :aria-label="`Звёзды: ${stars} из ${MAX_STARS}`">
    <span
      v-for="index in MAX_STARS"
      :key="index"
      aria-hidden="true"
      :class="{ 'level-result-star-on': index <= stars, 'level-result-star-pop': step !== undefined && index <= stars }"
      :style="step !== undefined ? { '--delay': `${(index - 1) * step}ms` } : undefined"
    >★</span>
  </p>
</template>
