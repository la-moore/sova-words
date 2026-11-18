<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { bakeThumbnail, type BadgeSpec } from './bake'

const props = defineProps<{ badge: BadgeSpec; locked: boolean }>()
const host = ref<HTMLSpanElement>()

onMounted(async () => {
  try {
    const canvas = await bakeThumbnail(props.badge, 96, props.locked)
    host.value?.append(canvas)
  } catch {
    // The card's accessible name remains available.
  }
})
</script>

<template>
  <span ref="host" class="achievement-thumbnail" aria-hidden="true"></span>
</template>
