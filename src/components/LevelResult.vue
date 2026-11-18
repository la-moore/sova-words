<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AchievementPreview from '../badges/AchievementPreview.vue'
import AchievementThumbnail from '../badges/AchievementThumbnail.vue'
import { achievement, markSeen, type AchievementId } from '../game/achievements'
import { timeUntilTomorrow } from '../game/daily'
import { soundOff, soundOn } from '../game/icons'
import type { PlayerResult } from '../game/result'
import { challengePhrase, starText } from '../game/share'

const props = defineProps<{
  result: PlayerResult
  sound?: boolean
}>()
const emit = defineEmits<{
  primary: []
  menu: []
  share: []
  sound: []
  star: [index: number]
  award: []
}>()
const shownScore = ref(props.result.score)
const countdown = ref(timeUntilTomorrow())
const preview = ref<HTMLDialogElement>()
const selected = ref<ReturnType<typeof achievement>>()
const timers: number[] = []
let clock: number | undefined
let frame: number | undefined
const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const starStep = 135
const scoreDelay = computed(() => props.result.stars * starStep)
const recordDelay = computed(() => scoreDelay.value + 440)
const primaryText = computed(() => props.result.friend ? 'Играть дальше' : 'Следующий уровень')

async function openBadge(id: AchievementId) {
  selected.value = achievement(id)
  await nextTick()
  preview.value?.showModal()
}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.repeat || event.defaultPrevented || event.isComposing ||
    event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || preview.value?.open ||
    (event.target instanceof Element && event.target.closest('button, a, summary, input, [contenteditable]'))) return
  event.preventDefault()
  if (props.result.daily) emit('share')
  else emit('primary')
}

onMounted(() => {
  const data = props.result
  markSeen(data.awards)
  window.addEventListener('keydown', onKey)
  if (data.daily) clock = window.setInterval(() => { countdown.value = timeUntilTomorrow() }, 1000)
  if (!motion) {
    shownScore.value = 0
    for (let index = 0; index < data.stars; index++) {
      timers.push(window.setTimeout(() => emit('star', index), index * starStep))
    }
    timers.push(window.setTimeout(() => {
      const start = performance.now()
      const score = data.score
      function animate(now: number) {
        const fraction = Math.min(1, (now - start) / 420)
        shownScore.value = Math.round(score * (1 - (1 - fraction) ** 3))
        if (fraction < 1) frame = requestAnimationFrame(animate)
      }
      frame = requestAnimationFrame(animate)
    }, scoreDelay.value))
  }
  data.awards.forEach((_, index) => {
    timers.push(window.setTimeout(() => emit('award'), motion ? index * starStep : recordDelay.value + 140 + index * starStep))
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.clearInterval(clock)
  timers.forEach(timer => window.clearTimeout(timer))
  if (frame !== undefined) cancelAnimationFrame(frame)
})
</script>

<template>
  <main class="level-result level-result-overlay">
    <div class="level-result-body">
      <header class="level-result-toolbar">
        <button type="button" @click="emit('menu')">← Назад</button>
        <button type="button" class="level-result-sound" aria-label="Звук" :aria-pressed="sound ?? false" @click="emit('sound')">
          <span aria-hidden="true" v-html="sound ? soundOn : soundOff"></span>
        </button>
      </header>

      <section class="level-result-panel level-result-hero">
        <p v-if="result.record" class="level-result-record" :style="{ '--delay': recordDelay + 'ms' }">Новый рекорд!</p>
        <h1>{{ result.title }}</h1>
        <p class="level-result-stars" :aria-label="`Звёзды: ${result.stars} из 3`">
          <span v-for="(star, index) in starText(result.stars)" :key="index" aria-hidden="true"
            :class="{ 'level-result-star-on': star === '★', 'level-result-star-pop': star === '★' }"
            :style="{ '--delay': index * starStep + 'ms' }">★</span>
        </p>
        <p class="level-result-score" :aria-label="`Очки за уровень: ${result.score}`">{{ shownScore.toLocaleString('ru-RU') }}</p>
        <p class="level-result-score-label">очков за уровень</p>
        <div v-if="!result.daily || result.friend" class="level-result-chips">
          <span v-if="!result.daily">Забег · {{ result.runScore.toLocaleString('ru-RU') }}</span>
          <span v-if="result.friend">Друг · {{ starText(result.friend.stars) }} {{ result.friend.score }}</span>
        </div>
      </section>

      <dl class="level-result-stats">
        <div><dt>Найдено</dt><dd>{{ result.found }}<small>/{{ result.total }}</small></dd></div>
        <div><dt>Золотые</dt><dd>{{ result.goldenFound }}<small>/{{ result.goldenTotal }}</small></dd></div>
        <div><dt>Комбо</dt><dd>×{{ result.bestCombo.toLocaleString('ru-RU') }}</dd></div>
        <div v-if="result.longest" class="level-result-stats-wide"><dt>Длинное слово</dt><dd class="level-result-word">{{ result.longest }}</dd></div>
      </dl>

      <section v-if="result.awards.length" class="level-result-panel">
        <h2>Значки за уровень</h2>
        <div class="level-result-badges">
          <button v-for="(id, index) in result.awards" :key="id" type="button" class="level-result-badge" aria-haspopup="dialog" :aria-label="achievement(id).title"
            :style="{ '--delay': recordDelay + 140 + index * starStep + 'ms' }" @click="openBadge(id)">
            <AchievementThumbnail :badge="achievement(id).badge" :locked="false" />
            <span class="level-result-badge-title" aria-hidden="true">{{ achievement(id).title }}</span>
          </button>
        </div>
      </section>
      <section class="level-result-cta">
        <img :src="'./icons/sova-192.png'" alt="" width="64" height="64">
        <div class="level-result-cta-text">
          <h2>Брось вызов другу</h2>
          <p>{{ challengePhrase(result.found, result.total) }}</p>
        </div>
        <button type="button" class="level-result-cta-button" @click="emit('share')">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path d="M8.72 10.64 15 7.5M8.707 13.353l6.294 3.147" />
          </svg><span>Поделиться</span></button>
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

    <dialog v-if="result.awards.length" ref="preview" class="achievement-dialog" aria-labelledby="result-badge-title" @close="selected = undefined">
      <template v-if="selected">
        <button type="button" class="achievement-close" aria-label="Закрыть" @click="preview?.close()">×</button>
        <AchievementPreview :badge="selected.badge" />
        <h2 id="result-badge-title">{{ selected.title }}</h2>
        <p>{{ selected.description }}</p>
      </template>
    </dialog>
  </main>
</template>
