<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import AchievementPreview from './badges/AchievementPreview.vue'
import AchievementThumbnail from './badges/AchievementThumbnail.vue'
import { achievement, achievements, loadAchievements, markSeen, unseen, type Achievement, type AchievementId } from './game/achievements'
import help from '@scarlab-icons/icons/base/help-lg.svg?raw'

const dateFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function displayAward(award: Achievement, locked: boolean) {
  if (!award.secret || !locked) return award
  return {
    ...award, title: '???', description: 'Секретная ачивка.',
    badge: { ...award.badge, id: `${award.id}-secret`, glyph: help },
  }
}

const emit = defineEmits<{ playSound: [] }>()

const state = shallowRef(loadAchievements())
const dialog = ref<HTMLDialogElement>()
const selected = ref<AchievementId>()
const queue = shallowRef<AchievementId[]>([])
const index = ref(0)

function close() {
  if (dialog.value?.open && selected.value) state.value = markSeen([selected.value])
  dialog.value?.close()
  selected.value = undefined
  queue.value = []
}

async function open(id: AchievementId) {
  selected.value = id
  await nextTick()
  const card = dialog.value
  if (!card?.isConnected || selected.value !== id) return
  card.showModal()
  const focus = queue.value.length ? '.achievement-next' : '.achievement-close'
  card.querySelector<HTMLButtonElement>(focus)?.focus()
}

onMounted(() => {
  queue.value = unseen(state.value)
  if (queue.value.length) void open(queue.value[0])
})
onBeforeUnmount(close)

function acknowledge() {
  if (!selected.value) return
  const next = queue.value[index.value + 1]
  if (!next) return close()
  state.value = markSeen([selected.value])
  index.value++
  selected.value = next
}

const opened = computed(() => state.value.unlocked)
const celebration = computed(() => queue.value.length > 0)
const award = computed(() => selected.value
  ? displayAward(achievement(selected.value), !opened.value[selected.value])
  : undefined)
const saved = computed(() => award.value && opened.value[award.value.id])
const unlockedCount = computed(() => achievements.filter(({ id }) => opened.value[id]).length)
const cards = computed(() => achievements.map(definition => {
  const progress = opened.value[definition.id]
  const card = displayAward(definition, !progress)
  return {
    ...card,
    locked: !progress,
    unseen: progress?.seen === false,
    label: `${card.title}. ${card.description}${progress?.seen === false ? ' Новая ачивка.' : ''}`,
  }
}))

const receivedDate = computed(() => saved.value
  ? dateFormat.format(new Date(`${saved.value.at}T00:00:00Z`)).replace(/\sг\.$/, '')
  : '')
</script>

<template>
  <section class="achievement-gallery">
    <h2>Ачивки · {{ unlockedCount }}/{{ achievements.length }}</h2>
    <div class="achievement-grid">
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        aria-haspopup="dialog"
        :aria-label="card.label"
        @click="open(card.id)"
      >
        <AchievementThumbnail :key="String(card.locked)" :badge="card.badge" :locked="card.locked" />
        <span v-if="card.unseen" class="achievement-unseen" aria-hidden="true"></span>
      </button>
    </div>

    <dialog ref="dialog" class="achievement-dialog" aria-labelledby="achievement-title" @cancel.prevent="close">
      <template v-if="award">
        <button type="button" class="achievement-close" aria-label="Закрыть" @click="close">×</button>
        <p v-if="celebration" class="achievement-new">Новая ачивка!</p>
        <AchievementPreview
          :key="award.id"
          :badge="award.badge"
          :locked="!saved"
          :celebrate="celebration"
          @reveal="emit('playSound')"
        />
        <h2 id="achievement-title">{{ award.title }}</h2>
        <p>{{ award.description }}</p>
        <button v-if="celebration" type="button" class="achievement-next" @click="acknowledge">
          {{ index + 1 < queue.length ? `Дальше · ${index + 1}/${queue.length}` : 'Круто!' }}
        </button>
        <p v-else class="achievement-date">{{ saved ? `Получено ${receivedDate}` : 'Ещё не получено' }}</p>
      </template>
    </dialog>
  </section>
</template>
