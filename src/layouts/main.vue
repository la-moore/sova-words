<template>
  <div class="h-screen flex flex-col select-none overflow-y-auto">
    <div class="bg-white sticky top-0 z-20 shadow dark:bg-neutral-800 dark:text-white">
      <div class="h-14 flex items-center">
        <div class="flex-1" />
        <div class="text-lg font-black">
          {{ title }}
        </div>
        <div class="flex-1" />
      </div>
    </div>
    <div class="bg-neutral-100 flex flex-col flex-1 border-t relative border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800">
      <RouterView />
      <slot/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = ref(route.meta.title)
</script>
