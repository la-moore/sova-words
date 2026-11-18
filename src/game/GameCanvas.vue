<script setup lang="ts">
import { Application } from '@cynfas/core'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { levelPath, resultPath } from '../routes'
import { challengeTheme } from './challenge'
import { applyTheme } from './theme'
import { AnagramGame, DESIGN } from './Game'
import type { PlayerResult } from './result'
import { localDate } from './daily'
import { registerGlass } from './glass'

const emit = defineEmits<{ ready: [game: AnagramGame]; result: [result?: PlayerResult] }>()
const route = useRoute()
const router = useRouter()
const host = ref<HTMLDivElement>()
const probe = ref<HTMLDivElement>()
const playing = computed(() => route.meta.difficulty !== undefined)

let app: Application
let game: AnagramGame
/** The address the game itself moved to; reaching it must not restart the level. */
let synced = ''

function sync(path?: string) {
  if (!path) return
  synced = path
  if (route.path !== path) void router.replace(path)
}

/**
 * Design units below the lowest controls that may sit under the bottom inset (home indicator):
 * the design already keeps a margin under its buttons, so it need not be stacked on top of the inset.
 */
const BOTTOM_OVERLAP = 28
/** CSS pixels kept clear below the status bar, matching `--status-bar-edge` in style.css. */
const STATUS_BAR_EDGE = 24

/**
 * Fits the design into the full-screen canvas outside the safe-area insets. The bottom inset may cover
 * the design's own bottom margin; spare height is handed to the game, which grows its word list so the
 * header stays at the top and the controls at the bottom.
 */
function fitSafeArea() {
  const style = probe.value ? getComputedStyle(probe.value) : undefined
  const inset = (side: string) => parseFloat(style?.getPropertyValue(`padding-${side}`) ?? '') || 0
  const [statusBar, right, bottom, left] = ['top', 'right', 'bottom', 'left'].map(inset)
  // iOS blurs a band just below the status bar, so the header starts past it.
  const top = statusBar > 0 ? statusBar + STATUS_BAR_EDGE : 0
  const height = Math.max(1, app.height - top)
  const zoom = Math.max(0.001, Math.min(
    Math.max(1, app.width - left - right) / DESIGN.width,
    height / DESIGN.height,
    Math.max(1, height - bottom) / (DESIGN.height - BOTTOM_OVERLAP),
  ))
  const bottomEdge = app.height - Math.max(0, bottom - BOTTOM_OVERLAP * zoom)
  const designHeight = Math.max(DESIGN.height, Math.floor((bottomEdge - top) / zoom))
  app.viewport.zoom = zoom
  app.viewport.position.set(
    DESIGN.width / 2 - (left - right) / 2 / zoom,
    designHeight - (bottomEdge - app.height / 2) / zoom,
  )
  game?.setHeight(designHeight)
}

function updateScene() {
  const { difficulty, daily, theme } = route.meta
  document.documentElement.classList.toggle('playing', playing.value)
  if (!playing.value || difficulty === undefined) {
    synced = ''
    game.leave()
    // Pages outside the game take the menu colours, a challenge those of its level.
    const { challenge } = route.meta
    applyTheme(challenge ? challengeTheme(challenge) : 'menu')
    return
  }
  if (route.path === synced) return
  synced = ''
  const container = host.value!
  app.resize(container.clientWidth, container.clientHeight)
  const code = typeof route.params.code === 'string' ? route.params.code : undefined
  void game.begin(difficulty, daily ? localDate() : '', theme, code)
  app.start()
}

onMounted(() => {
  app = new Application({ container: host.value!, designSize: DESIGN, autoStart: false })
  // Application keeps this fit private; replace it so every resize respects the safe area.
  Object.assign(app, { _fitViewport: fitSafeArea })
  fitSafeArea()
  registerGlass(app.renderer)
  game = new AnagramGame(app, () => {
    if (router.options.history.state.back === '/') router.back()
    else void router.replace('/')
  }, result => {
    emit('result', result)
    if (result) sync(resultPath(result.code))
  }, code => sync(levelPath(code)))
  Object.assign(window, { app, game })
  emit('ready', game)
  updateScene()
})

watch(() => route.fullPath, updateScene, { flush: 'post' })

onBeforeUnmount(() => {
  game.leave()
  app.destroy()
  document.documentElement.classList.remove('playing')
})
</script>

<template>
  <div id="app" ref="host" :hidden="!playing"></div>
  <div ref="probe" class="safe-area-probe" aria-hidden="true"></div>
</template>
