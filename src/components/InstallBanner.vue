<script setup lang="ts">
import { computed, ref } from 'vue'
import { APP_ICON_URL } from '../utils/assets'

type Platform = 'iphone' | 'android'

const platforms: { id: Platform; label: string; steps: string[] }[] = [
  { id: 'iphone', label: 'iPhone', steps: ['Safari', '«Поделиться»', '«На экран Домой»', '«Добавить»'] },
  { id: 'android', label: 'Android', steps: ['Chrome', '⋮', '«Добавить на главный экран»', '«Установить»'] },
]

const platform = ref<Platform>('iphone')
const steps = computed(() => platforms.find(({ id }) => id === platform.value)!.steps)
</script>

<template>
  <section class="install-banner" aria-labelledby="install-title">
    <div class="install-hero">
      <img :src="APP_ICON_URL" alt="" width="72" height="72">
      <div>
        <span class="install-kicker">Приложение</span>
        <h2 id="install-title">Sova на главном экране</h2>
        <p>Запуск в одно касание, на весь экран и без адресной строки.</p>
      </div>
    </div>
    <div class="install-tabs" role="group" aria-label="Платформа">
      <button
        v-for="option in platforms"
        :key="option.id"
        type="button"
        :aria-pressed="platform === option.id"
        @click="platform = option.id"
      >{{ option.label }}</button>
    </div>
    <ol class="install-steps">
      <li v-for="step in steps" :key="step">{{ step }}</li>
    </ol>
    <p v-if="platform === 'iphone'" class="install-note">Перед добавлением включите «Открыть как веб-приложение».</p>
  </section>
</template>
