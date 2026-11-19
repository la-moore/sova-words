<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import ResultGrid from '../components/ResultGrid.vue'
import StarRating from '../components/StarRating.vue'
import { startChallenge } from '../game/session'
import { dailyPath, homePath, levelPath } from '../paths'
import { formatNumber } from '../utils/format'

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

const goHome = () => router.push(homePath)
</script>

<template>
  <main class="level-result">
    <div class="level-result-body">
      <AppHeader />
      <template v-if="challenge">
        <section class="level-result-panel level-result-hero">
          <h1>{{ challenge.title }}</h1>
          <StarRating :stars="challenge.stars" />
          <p class="level-result-score" :aria-label="`Очки друга: ${challenge.score}`">{{ formatNumber(challenge.score) }}</p>
          <p class="level-result-score-label">очков у друга</p>
          <p v-if="challenge.updated">Уровень обновился с тех пор</p>
        </section>

        <dl class="level-result-stats">
          <div><dt>Друг нашёл</dt><dd>{{ challenge.found }}<small>/{{ challenge.total }}</small></dd></div>
          <div v-if="challenge.golden">
            <dt>Золотые</dt><dd>{{ challenge.golden.found }}<small>/{{ challenge.golden.total }}</small></dd>
          </div>
          <div v-if="challenge.combo"><dt>Комбо</dt><dd>×{{ formatNumber(challenge.combo) }}</dd></div>
          <div v-if="challenge.grid" class="level-result-stats-wide">
            <dt>Слова по длине</dt><dd><ResultGrid :rows="challenge.grid" /></dd>
          </div>
        </dl>

        <footer class="level-result-actions">
          <button type="button" class="level-result-primary" @click="play">
            {{ challenge.daily ? 'Сыграть слово дня' : 'Попробовать' }}
          </button>
          <button type="button" @click="goHome">На главную</button>
        </footer>
      </template>

      <section v-else class="level-result-panel level-result-hero">
        <h1>Этот уровень устарел</h1>
        <button type="button" class="level-result-primary" @click="goHome">На главную</button>
      </section>
    </div>
  </main>
</template>
