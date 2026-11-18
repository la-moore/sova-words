<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{ to: string; title: string; detail: string; featured?: boolean }>()
</script>

<template>
  <RouterLink :to="to" class="mode-card" :class="{ featured }">
    <span><strong>{{ title }}</strong><small>{{ detail }}</small></span>
    <span class="mode-arrow" aria-hidden="true">→</span>
  </RouterLink>
</template>
