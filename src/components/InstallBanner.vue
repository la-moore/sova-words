<script setup lang="ts">
import { ref } from 'vue'

const platform = ref<'iphone' | 'android'>('iphone')
const steps = {
  iphone: ['Safari', '«Поделиться»', '«На экран Домой»', '«Добавить»'],
  android: ['Chrome', '⋮', '«Добавить на главный экран»', '«Установить»'],
}
</script>

<template>
  <section class="install-banner" aria-labelledby="install-title">
    <div class="install-hero">
      <img :src="'./icons/sova-192.png'" alt="" width="72" height="72">
      <div>
        <span class="install-kicker">Приложение</span>
        <h2 id="install-title">Sova на главном экране</h2>
        <p>Запуск в одно касание, на весь экран и без адресной строки.</p>
      </div>
    </div>
    <div class="install-tabs" role="group" aria-label="Платформа">
      <button type="button" :aria-pressed="platform === 'iphone'" @click="platform = 'iphone'">iPhone</button>
      <button type="button" :aria-pressed="platform === 'android'" @click="platform = 'android'">Android</button>
    </div>
    <ol class="install-steps">
      <li v-for="step in steps[platform]" :key="step">{{ step }}</li>
    </ol>
    <p v-if="platform === 'iphone'" class="install-note">Перед добавлением включите «Открыть как веб-приложение».</p>
  </section>
</template>
