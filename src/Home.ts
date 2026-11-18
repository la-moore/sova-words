import { defineComponent, h, onMounted, onUnmounted, ref, type PropType } from 'vue'
import { RouterLink } from 'vue-router'
import { activeStreak, loadDaily, loadDailyBest, loadStreak, localDate, timeUntilTomorrow } from './game/daily'
import { BEST_KEY, type AnagramGame } from './game/Game'
import { dailyPath, regularModes, themedModes } from './routes'
import { readStorage } from './game/rules'

function modeLink(path: string, title: string, detail: string, featured = false) {
  return h(RouterLink, { to: path, class: ['mode-card', { featured }] }, () => [
    h('span', [h('strong', title), h('small', detail)]),
    h('span', { class: 'mode-arrow', 'aria-hidden': 'true' }, '→'),
  ])
}

export const Home = defineComponent({
  props: {
    game: { type: Object as PropType<AnagramGame>, required: true },
  },
  setup({ game }) {
    const now = ref(Date.now())
    const sound = ref(game.soundEnabled)
    const vibration = ref(game.vibration)
    const platform = ref<'iphone' | 'android'>('iphone')
    let timer: ReturnType<typeof setInterval>
    onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
    onUnmounted(() => clearInterval(timer))

    return () => {
      const date = localDate(new Date(now.value))
      const streak = activeStreak(loadStreak(), date)
      const finished = loadDaily(date)?.finished
      const records = readStorage<Record<string, number> | number>(BEST_KEY, {})
      const iPhone = platform.value === 'iphone'
      return h('main', { class: 'home', id: 'home' }, [
        h('header', { class: 'home-header' }, [
          h('img', { src: './icons/sova-192.png', alt: '', width: 56, height: 56 }),
          h('div', [h('h1', 'Sova'), h('p', 'Игра в слова')]),
          streak ? h('span', { class: 'streak' }, `Серия · ${streak}`) : null,
        ]),
        h('section', { 'aria-label': 'Слово дня' }, [
          modeLink(dailyPath, finished ? 'Результат слова дня' : 'Слово дня',
            finished ? `Следующее через ${timeUntilTomorrow()}` : `Рекорд ${loadDailyBest()}`, true),
        ]),
        h('section', [
          h('h2', 'Сложность'),
          h('div', { class: 'mode-grid' }, regularModes.map(mode => {
            const best = typeof records === 'number'
              ? (mode.difficulty === 0 ? records : 0)
              : records[mode.length] ?? 0
            return modeLink(mode.path, mode.label, `${mode.length} букв · Рекорд ${best}`)
          })),
        ]),
        h('section', [
          h('h2', 'Тематические режимы'),
          h('div', { class: 'mode-grid' }, themedModes.map(mode =>
            modeLink(mode.path, mode.menuLabel, `Рекорд ${readStorage(mode.bestKey, 0)}`))),
        ]),
        h('section', { class: 'home-panel' }, [
          h('h2', 'Настройки'),
          h('div', { class: 'home-controls' }, [
            h('button', {
              type: 'button', 'aria-pressed': sound.value,
              onClick: () => { game.toggleSound(); sound.value = game.soundEnabled },
            }, 'Звук'),
            typeof navigator.vibrate === 'function' ? h('button', {
              type: 'button', 'aria-pressed': vibration.value,
              onClick: () => { game.toggleVibration(); vibration.value = game.vibration },
            }, 'Вибрация') : null,
          ]),
        ]),
        h('section', { class: 'home-panel' }, [
          h('h2', 'Установить Sova'),
          h('div', { class: 'home-controls' }, [
            h('button', { type: 'button', 'aria-pressed': iPhone, onClick: () => { platform.value = 'iphone' } }, 'iPhone'),
            h('button', { type: 'button', 'aria-pressed': !iPhone, onClick: () => { platform.value = 'android' } }, 'Android'),
          ]),
          h('p', iPhone
            ? 'Safari → «Поделиться» → «На экран Домой». Включите «Открыть как веб-приложение» и нажмите «Добавить».'
            : 'Chrome → ⋮ → «Добавить на главный экран». Нажмите «Установить».'),
        ]),
      ])
    }
  },
})
