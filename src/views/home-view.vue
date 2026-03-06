<template>
  <div class="max-w-2xl w-full mx-auto space-y-4 sm:space-y-6 p-6">
    <template
      v-for="game in list"
      :key="game.id"
    >
      <RouterLink
        :to="{ name: 'game', params: { id: game.id } }"
        class="block"
      >
        <div
          class="rounded-xl overflow-hidden border-4 bg-cover bg-center"
          :style="{ borderColor: game.color, backgroundImage: `url(${game.card})` }"
        >
          <div
            class="px-6 py-4 sm:px-16 sm:py-10 relative"
            :style="{ color: game.color }"
          >
            <div class="font-black text-lg">
              {{ game.name }}
            </div>
            <div class="font-medium text-sm">
              {{ game.description }}
            </div>
            <BaseButton
              size="sm"
              class="mt-3"
              :style="{ backgroundColor: game.contrast, color: game.color }"
            >
              Начать
            </BaseButton>
          </div>
        </div>
      </RouterLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useGames } from '~/state/games.ts'
import BaseButton from '~/components/base-button.vue'

const { list } = useGames()
</script>
