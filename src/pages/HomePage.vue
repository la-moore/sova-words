<script setup lang="ts">
import AchievementGallery from '../components/AchievementGallery.vue'
import AppHeader from '../components/AppHeader.vue'
import InstallBanner from '../components/InstallBanner.vue'
import ModeCard from '../components/ModeCard.vue'
import { useDaily } from '../composables/useDaily'
import { dailyPath, regularModes, themedModes } from '../paths'
import { usePlayerStore } from '../stores/player'
import { useSettingsStore } from '../stores/settings'

const player = usePlayerStore()
const settings = useSettingsStore()
const daily = useDaily()

const record = (key: string | number) => player.records[key] ?? 0
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

    <AchievementGallery />

    <section>
      <h2>Сложность</h2>
      <div class="mode-grid">
        <ModeCard
          v-for="mode in regularModes"
          :key="mode.path"
          :to="mode.path"
          :title="mode.label"
          :detail="`${mode.length} букв · Рекорд ${record(mode.length)}`"
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
          :detail="`Рекорд ${record(mode.palette)}`"
        />
      </div>
    </section>

    <section class="home-panel">
      <h2>Настройки</h2>
      <div class="home-controls">
        <button type="button" :aria-pressed="settings.sound" @click="settings.toggleSound">Звук</button>
        <button
          v-if="settings.canVibrate"
          type="button"
          :aria-pressed="settings.vibration"
          @click="settings.toggleVibration"
        >Вибрация</button>
      </div>
    </section>

    <InstallBanner />
  </main>
</template>
