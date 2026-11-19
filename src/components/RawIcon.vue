<script setup lang="ts">
/** Decorative inline SVG from a `?raw` import; the surrounding control carries the accessible name. */
defineProps<{ svg: string }>()
</script>

<template>
  <span aria-hidden="true" v-html="svg"></span>
</template>
