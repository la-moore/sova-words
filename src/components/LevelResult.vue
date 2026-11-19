<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import AchievementPreview from '../badges/AchievementPreview.vue'
import AchievementThumbnail from '../badges/AchievementThumbnail.vue'
import { useEventListener } from '../composables/useEventListener'
import { useNow } from '../composables/useNow'
import { useTimeouts } from '../composables/useTimeouts'
import { achievement, type Achievement, type AchievementId } from '../game/achievements'
import { timeUntilTomorrow } from '../game/daily'
import { soundOff, soundOn } from '../game/icons'
import type { PlayerResult } from '../game/result'
import { challengePhrase, starText } from '../game/share'
import { APP_ICON_URL } from '../utils/assets'
import { formatNumber } from '../utils/format'
import { prefersReducedMotion } from '../utils/motion'
import AchievementDialog from './AchievementDialog.vue'
import RawIcon from './RawIcon.vue'
import StarRating from './StarRating.vue'

const { result, sound = false } = defineProps<{
  result: PlayerResult
  sound?: boolean
}>()
const emit = defineEmits<{
  primary: []
  menu: []
  share: []
  sound: []
  /** A star popped in: the game plays its note and a burst. */
  star: [index: number]
  /** A new badge appeared on screen. */
  award: []
}>()

// Reveal timeline: stars one by one, then the score counts up, then the record and the badges.
const STAR_STEP = 135
const SCORE_DURATION = 420
const RECORD_AFTER_SCORE = 440
const BADGES_AFTER_RECORD = 140

const reducedMotion = prefersReducedMotion()
const scoreDelay = computed(() => result.stars * STAR_STEP)
const recordDelay = computed(() => scoreDelay.value + RECORD_AFTER_SCORE)
const badgeDelay = (index: number) => recordDelay.value + BADGES_AFTER_RECORD + index * STAR_STEP

const shownScore = ref(reducedMotion ? result.score : 0)
const now = useNow()
const countdown = computed(() => timeUntilTomorrow(now.value))
const primaryText = computed(() => result.friend ? 'Играть дальше' : 'Следующий уровень')
const awards = computed(() => result.awards.map(achievement))

const badgeDialog = useTemplateRef('badgeDialog')
const selected = shallowRef<Achievement>()
const { after, frame } = useTimeouts()

async function openBadge(id: AchievementId) {
  selected.value = achievement(id)
  await nextTick()
  badgeDialog.value?.open()
}

function countUpScore() {
  const start = performance.now()
  const step = (time: number) => {
    const progress = Math.min(1, (time - start) / SCORE_DURATION)
    shownScore.value = Math.round(result.score * (1 - (1 - progress) ** 3))
    if (progress < 1) frame(step)
  }
  frame(step)
}

/** Enter anywhere outside a control continues: next level, or sharing for the daily word. */
function onKey(event: KeyboardEvent) {
  const modified = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
  const inControl = event.target instanceof Element &&
    event.target.closest('button, a, summary, input, [contenteditable]')
  if (event.key !== 'Enter' || event.repeat || event.defaultPrevented || event.isComposing ||
    modified || inControl || selected.value) return
  event.preventDefault()
  if (result.daily) emit('share')
  else emit('primary')
}
useEventListener(window, 'keydown', onKey)

onMounted(() => {
  if (!reducedMotion) {
    for (let index = 0; index < result.stars; index++) after(index * STAR_STEP, () => emit('star', index))
    after(scoreDelay.value, countUpScore)
  }
  result.awards.forEach((_, index) => {
    after(reducedMotion ? index * STAR_STEP : badgeDelay(index), () => emit('award'))
  })
})
</script>

<template>
  <main class="level-result level-result-overlay">
    <div class="level-result-body">
      <header class="level-result-toolbar">
        <button type="button" @click="emit('menu')">← Назад</button>
        <button type="button" class="level-result-sound" aria-label="Звук" :aria-pressed="sound" @click="emit('sound')">
          <RawIcon :svg="sound ? soundOn : soundOff" />
        </button>
      </header>

      <section class="level-result-panel level-result-hero">
        <p v-if="result.record" class="level-result-record" :style="{ '--delay': `${recordDelay}ms` }">Новый рекорд!</p>
        <h1>{{ result.title }}</h1>
        <StarRating :stars="result.stars" :step="STAR_STEP" />
        <p class="level-result-score" :aria-label="`Очки за уровень: ${result.score}`">{{ formatNumber(shownScore) }}</p>
        <p class="level-result-score-label">очков за уровень</p>
        <div v-if="!result.daily || result.friend" class="level-result-chips">
          <span v-if="!result.daily">Забег · {{ formatNumber(result.runScore) }}</span>
          <span v-if="result.friend">Друг · {{ starText(result.friend.stars) }} {{ result.friend.score }}</span>
        </div>
      </section>

      <dl class="level-result-stats">
        <div><dt>Найдено</dt><dd>{{ result.found }}<small>/{{ result.total }}</small></dd></div>
        <div><dt>Золотые</dt><dd>{{ result.goldenFound }}<small>/{{ result.goldenTotal }}</small></dd></div>
        <div><dt>Комбо</dt><dd>×{{ formatNumber(result.bestCombo) }}</dd></div>
        <div v-if="result.longest" class="level-result-stats-wide">
          <dt>Длинное слово</dt><dd class="level-result-word">{{ result.longest }}</dd>
        </div>
      </dl>

      <section v-if="awards.length" class="level-result-panel">
        <h2>Значки за уровень</h2>
        <div class="level-result-badges">
          <button
            v-for="(award, index) in awards"
            :key="award.id"
            type="button"
            class="level-result-badge"
            aria-haspopup="dialog"
            :aria-label="award.title"
            :style="{ '--delay': `${badgeDelay(index)}ms` }"
            @click="openBadge(award.id)"
          >
            <AchievementThumbnail :badge="award.badge" :locked="false" />
            <span class="level-result-badge-title" aria-hidden="true">{{ award.title }}</span>
          </button>
        </div>
      </section>

      <section class="level-result-cta">
        <img :src="APP_ICON_URL" alt="" width="64" height="64">
        <div class="level-result-cta-text">
          <h2>Брось вызов другу</h2>
          <p>{{ challengePhrase(result.found, result.total) }}</p>
        </div>
        <button type="button" class="level-result-cta-button" @click="emit('share')">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path d="M8.72 10.64 15 7.5M8.707 13.353l6.294 3.147" />
          </svg><span>Поделиться</span>
        </button>
        <div class="level-result-cta-status"><slot name="status" /></div>
      </section>

      <details v-if="result.missing.length" class="level-result-panel">
        <summary>Ненайденные слова ({{ result.missing.length }})</summary>
        <ul class="level-result-words"><li v-for="word in result.missing" :key="word">{{ word }}</li></ul>
      </details>

      <footer class="level-result-actions">
        <p v-if="result.daily" class="level-result-countdown">Следующее слово через {{ countdown }}</p>
        <button v-else type="button" class="level-result-primary" @click="emit('primary')">{{ primaryText }}</button>
        <button type="button" @click="emit('menu')">Меню</button>
      </footer>
    </div>

    <AchievementDialog v-if="awards.length" ref="badgeDialog" :award="selected" @close="selected = undefined">
      <template v-if="selected" #preview>
        <AchievementPreview :badge="selected.badge" />
      </template>
    </AchievementDialog>
  </main>
</template>
