<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import AchievementPreview from '../badges/AchievementPreview.vue'
import AchievementThumbnail from '../badges/AchievementThumbnail.vue'
import type { AchievementId } from '../game/achievements'
import { useAchievementsStore } from '../stores/achievements'
import { useGameStore } from '../stores/game'
import { formatDay } from '../utils/format'
import AchievementDialog from './AchievementDialog.vue'

const achievements = useAchievementsStore()
const game = useGameStore()
const awardDialog = useTemplateRef('awardDialog')

const selected = ref<AchievementId>()
/** New badges shown one after another, then `position` is the one on screen. */
const queue = ref<AchievementId[]>([])
const position = ref(0)
/** Whether the badge on screen was new when it appeared: drives the reveal animation and glow. */
const celebrating = ref(false)

const award = computed(() => achievements.cards.find(card => card.id === selected.value))
const earnedAt = computed(() => selected.value && achievements.unlocked[selected.value]?.at)
const nextLabel = computed(() => position.value + 1 < queue.value.length
  ? `Дальше · ${position.value + 1}/${queue.value.length}`
  : 'Круто!')

function cardLabel(card: typeof achievements.cards[number]): string {
  return `${card.title}. ${card.description}${card.unseen ? ' Новая ачивка.' : ''}`
}

/** A badge counts as seen once it has been shown in the dialog, not when it was earned. */
function show(id: AchievementId) {
  celebrating.value = achievements.isUnseen(id)
  selected.value = id
  if (celebrating.value) achievements.markSeen([id])
}

async function open(id: AchievementId, list: AchievementId[] = []) {
  queue.value = list
  position.value = 0
  show(id)
  await nextTick()
  if (selected.value === id) awardDialog.value?.open(celebrating.value ? '.achievement-next' : undefined)
}

function reset() {
  selected.value = undefined
  queue.value = []
  position.value = 0
  celebrating.value = false
}

function acknowledge() {
  const next = queue.value[position.value + 1]
  if (!next) return awardDialog.value?.close()
  position.value++
  show(next)
}

onMounted(() => {
  const [first] = achievements.unseen
  if (first) void open(first, achievements.unseen)
})
onBeforeUnmount(reset)
</script>

<template>
  <section class="achievement-gallery">
    <h2>Ачивки · {{ achievements.unlockedCount }}/{{ achievements.total }}</h2>
    <div class="achievement-grid">
      <button
        v-for="card in achievements.cards"
        :key="card.id"
        type="button"
        aria-haspopup="dialog"
        :aria-label="cardLabel(card)"
        @click="open(card.id)"
      >
        <AchievementThumbnail :key="String(card.locked)" :badge="card.badge" :locked="card.locked" />
        <span v-if="card.unseen" class="achievement-unseen" aria-hidden="true"></span>
      </button>
    </div>

    <AchievementDialog ref="awardDialog" :award="award" @close="reset">
      <template #header>
        <p v-if="celebrating" class="achievement-new">Новая ачивка!</p>
      </template>
      <template v-if="award" #preview>
        <AchievementPreview
          :key="award.id"
          :badge="award.badge"
          :locked="!earnedAt"
          :celebrate="celebrating"
          @reveal="game.playAchievementSound()"
        />
      </template>
      <button v-if="celebrating" type="button" class="achievement-next" @click="acknowledge">{{ nextLabel }}</button>
      <p v-else class="achievement-date">{{ earnedAt ? `Получено ${formatDay(earnedAt)}` : 'Ещё не получено' }}</p>
    </AchievementDialog>
  </section>
</template>
