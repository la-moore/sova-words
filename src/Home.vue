<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AchievementGallery from './AchievementGallery.vue'
import AppHeader from './components/AppHeader.vue'
import InstallBanner from './components/InstallBanner.vue'
import ModeCard from './components/ModeCard.vue'
import { activeStreak, loadDaily, loadDailyBest, loadStreak, localDate, timeUntilTomorrow } from './game/daily'
import { BEST_KEY, type AnagramGame } from './game/Game'
import { readStorage } from './game/rules'
import { dailyPath, regularModes, themedModes } from './routes'

const { game } = defineProps<{ game: AnagramGame }>()
const now = ref(Date.now())
const sound = ref(game.soundEnabled)
const vibration = ref(game.vibration)
const canVibrate = typeof navigator.vibrate === 'function'
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(timer))

const daily = computed(() => {
  const currentTime = new Date(now.value)
  const date = localDate(currentTime)
  return {
    streak: activeStreak(loadStreak(), date),
    finished: loadDaily(date)?.finished,
    countdown: timeUntilTomorrow(currentTime),
    best: loadDailyBest(),
  }
})

const records = readStorage<Record<string, number> | number>(BEST_KEY, {})
function regularBest(difficulty: number, length: number) {
  if (typeof records === 'number') return difficulty === 0 ? records : 0
  return records[length] ?? 0
}

function toggleSound() {
  game.toggleSound()
  sound.value = game.soundEnabled
}

function toggleVibration() {
  game.toggleVibration()
  vibration.value = game.vibration
}
</script>

<template>
  <main id="home" class="home">
    <AppHeader heading>
      <span v-if="daily.streak" class="streak">Серия · {{ daily.streak }}</span>
    </AppHeader>

    <section aria-label="Слово дня">
      <ModeCard
        :to="dailyPath"
        :title="daily.finished ? 'Результат слова дня' : 'Слово дня'"
        :detail="daily.finished ? `Следующее через ${daily.countdown}` : `Рекорд ${daily.best}`"
        featured
      />
    </section>

    <AchievementGallery @play-sound="game.playAchievementSound()" />

    <section>
      <h2>Сложность</h2>
      <div class="mode-grid">
        <ModeCard
          v-for="mode in regularModes"
          :key="mode.path"
          :to="mode.path"
          :title="mode.label"
          :detail="`${mode.length} букв · Рекорд ${regularBest(mode.difficulty, mode.length)}`"
        />
      </div>
    </section>

    <section>
      <h2>Тематические режимы</h2>
      <div class="mode-grid">
        <ModeCard
          v-for="mode in themedModes"
          :key="mode.path"
          :to="mode.path"
          :title="mode.menuLabel"
          :detail="`Рекорд ${readStorage(mode.bestKey, 0)}`"
        />
      </div>
    </section>

    <section class="home-panel">
      <h2>Настройки</h2>
      <div class="home-controls">
        <button type="button" :aria-pressed="sound" @click="toggleSound">Звук</button>
        <button v-if="canVibrate" type="button" :aria-pressed="vibration" @click="toggleVibration">Вибрация</button>
      </div>
    </section>

    <InstallBanner />
  </main>
</template>
