<template>
  <MainLayout>
    <div class="text-center py-12">
      <h3 class="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">404</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Такой страницы нет.</p>
      <div class="mt-6">
        <RouterLink to="/" class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500">
          На главную
        </RouterLink>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router"
import MainLayout from "~/layouts/main.vue"
</script>
