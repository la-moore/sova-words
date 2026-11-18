<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import LevelResult from './components/LevelResult.vue'
import type { AnagramGame } from './game/Game'
import GameCanvas from './game/GameCanvas.vue'
import type { PlayerResult } from './game/result'
import { encodeChallenge, shareResult } from './game/share'
import { challengePath } from './routes'

const route = useRoute()
const router = useRouter()
const game = shallowRef<AnagramGame>()
const result = shallowRef<PlayerResult>()
const sound = ref(false)
const status = ref('')
const sharing = ref(false)

function showResult(value?: PlayerResult) {
  status.value = ''
  sharing.value = false
  sound.value = game.value?.soundEnabled ?? false
  result.value = value
}

function toggleSound() {
  game.value?.toggleSound()
  sound.value = game.value?.soundEnabled ?? false
}

async function share() {
  const data = result.value
  if (!data || sharing.value) return
  const { href } = router.resolve(challengePath(encodeChallenge(data.code, data)))
  const url = new URL(href, location.href).href
  sharing.value = true
  status.value = ''
  try {
    const outcome = await shareResult(url)
    if (result.value === data && outcome === 'copied') status.value = 'Скопировано'
  } catch {
    if (result.value === data) status.value = 'Не удалось скопировать ссылку'
  } finally {
    if (result.value === data) sharing.value = false
  }
}
</script>

<template>
  <RouterView v-if="game" :game="game" />
  <GameCanvas @ready="game = $event" @result="showResult" />
  <LevelResult v-if="result && route.meta.result" :key="result.code" :result="result" :sound="sound"
    @primary="game?.continueLevel()" @menu="game?.goToMenu()" @share="share" @sound="toggleSound"
    @star="game?.celebrateStar($event)" @award="game?.playAchievementSound()">
    <template #status><p v-if="status" role="status">{{ status }}</p></template>
  </LevelResult>
</template>
