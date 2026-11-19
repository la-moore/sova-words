<script setup lang="ts">
import { toRef } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import LevelResult from './components/LevelResult.vue'
import { useShareResult } from './composables/useShareResult'
import GameCanvas from './game/GameCanvas.vue'
import { useGameStore } from './stores/game'
import { useSettingsStore } from './stores/settings'

const route = useRoute()
const game = useGameStore()
const settings = useSettingsStore()
const { status, share } = useShareResult(toRef(game, 'result'))
</script>

<template>
  <RouterView />
  <!-- The canvas stays mounted for the whole app, so levels open without recreating the renderer. -->
  <GameCanvas />
  <LevelResult
    v-if="game.result && route.meta.result"
    :key="game.result.code"
    :result="game.result"
    :sound="settings.sound"
    @primary="game.continueLevel"
    @menu="game.goToMenu"
    @share="share"
    @sound="settings.toggleSound"
    @star="game.celebrateStar"
    @award="game.playAchievementSound"
  >
    <template #status><p v-if="status" role="status">{{ status }}</p></template>
  </LevelResult>
</template>
