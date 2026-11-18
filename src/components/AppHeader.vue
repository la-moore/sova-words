<script setup lang="ts">
/** Sova logo with the game name; the name is the page heading only where nothing else is. */
const { heading = false } = defineProps<{ heading?: boolean }>()
</script>

<template>
  <header class="home-header">
    <img :src="'./icons/sova-192.png'" alt="" width="56" height="56">
    <div>
      <component :is="heading ? 'h1' : 'p'" class="home-header-name">Sova</component>
      <p class="home-header-tagline">Игра в слова</p>
    </div>
    <slot />
  </header>
</template>
