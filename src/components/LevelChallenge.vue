<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './AppHeader.vue'
import ResultGrid from './ResultGrid.vue'
import { startChallenge } from '../game/session'
import { starText } from '../game/share'
import { dailyPath, levelPath } from '../routes'

/** A friend's result from a shared link; "Попробовать" opens the level itself. */
const route = useRoute()
const router = useRouter()
/** Loaded by the route before the page opens. */
const challenge = computed(() => route.meta.challenge)

function play() {
  const data = challenge.value
  if (!data) return
  if (data.daily) return void router.push(dailyPath)
  const { code, score, found, total, stars } = data
  startChallenge(code, { score, found, total, stars })
  void router.push(levelPath(code)!)
}
</script>

<template>
  <main class="level-result">
    <div class="level-result-body">
      <AppHeader />
      <template v-if="challenge">
        <section class="level-result-panel level-result-hero">
          <h1>{{ challenge.title }}</h1>
          <p class="level-result-stars" :aria-label="`Звёзды: ${challenge.stars} из 3`">
            <span v-for="(star, index) in starText(challenge.stars)" :key="index" aria-hidden="true"
              :class="{ 'level-result-star-on': star === '★' }">★</span>
          </p>
          <p class="level-result-score" :aria-label="`Очки друга: ${challenge.score}`">{{ challenge.score.toLocaleString('ru-RU') }}</p>
          <p class="level-result-score-label">очков у друга</p>
          <p v-if="challenge.updated">Уровень обновился с тех пор</p>
        </section>

        <dl class="level-result-stats">
          <div><dt>Друг нашёл</dt><dd>{{ challenge.found }}<small>/{{ challenge.total }}</small></dd></div>
          <div v-if="challenge.golden"><dt>Золотые</dt><dd>{{ challenge.golden.found }}<small>/{{ challenge.golden.total }}</small></dd></div>
          <div v-if="challenge.combo"><dt>Комбо</dt><dd>×{{ challenge.combo.toLocaleString('ru-RU') }}</dd></div>
          <div v-if="challenge.grid" class="level-result-stats-wide"><dt>Слова по длине</dt><dd><ResultGrid :rows="challenge.grid" /></dd></div>
        </dl>

        <footer class="level-result-actions">
          <button type="button" class="level-result-primary" @click="play">{{ challenge.daily ? 'Сыграть слово дня' : 'Попробовать' }}</button>
          <button type="button" @click="router.push('/')">На главную</button>
        </footer>
      </template>

      <section v-else class="level-result-panel level-result-hero">
        <h1>Этот уровень устарел</h1>
        <button type="button" class="level-result-primary" @click="router.push('/')">На главную</button>
      </section>
    </div>
  </main>
</template>
