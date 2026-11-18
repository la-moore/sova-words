import { defineComponent, type Component } from 'vue'
import { createRouter, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import LevelChallenge from './components/LevelChallenge.vue'
import { loadChallenge, type Challenge } from './game/challenge'
import { decodeSeed, PALETTES } from './game/seed'
import { decodeChallenge } from './game/share'
import { DIFFICULTIES, THEMED_MODES } from './game/words'

export const regularModes = DIFFICULTIES.map((mode, difficulty) => ({
  ...mode,
  difficulty,
  path: `/play/${mode.length}`,
}))

export const dailyPath = '/play/daily'
export const themedModes = THEMED_MODES.map(mode => ({
  ...mode,
  path: `/play/${mode.palette === 'newYear' ? 'new-year' : mode.palette}`,
}))

/** Path of the mode a level code belongs to, e.g. `/play/6`. */
export function modePath(code: string): string | undefined {
  const seed = decodeSeed(code)
  if (!seed) return
  if ('day' in seed) return dailyPath
  if (seed.mode < regularModes.length) return regularModes[seed.mode].path
  return themedModes.find(mode => mode.palette === PALETTES[seed.mode - regularModes.length])?.path
}

/** Where the level is played; the daily word has a single address. */
export function levelPath(code: string): string | undefined {
  const mode = modePath(code)
  return mode === dailyPath ? mode : mode && `${mode}/${code}`
}

export function resultPath(code: string): string | undefined {
  const path = levelPath(code)
  return path && `${path}/result`
}

/** Short link for a friend: the level code and the player's result hidden in one token. */
export function challengePath(token: string): string {
  return `/c/${token}`
}

export function createGameRouter(history: RouterHistory, home: Component) {
  const game = defineComponent({ inheritAttrs: false, render: () => null })

  function modeRoutes(path: string, meta: RouteRecordRaw['meta']): RouteRecordRaw[] {
    return [
      { path, component: game, meta },
      { path: `${path}/:code`, component: game, meta: { ...meta, mode: path } },
      { path: `${path}/:code/result`, component: game, meta: { ...meta, mode: path, result: true } },
    ]
  }

  const router = createRouter({
    history,
    routes: [
      { path: '/', component: home },
      ...regularModes.flatMap(mode => modeRoutes(mode.path, { difficulty: mode.difficulty })),
      ...themedModes.flatMap(mode => modeRoutes(mode.path, { difficulty: 1, theme: mode })),
      { path: dailyPath, component: game, meta: { difficulty: 1, daily: true } },
      { path: `${dailyPath}/result`, component: game, meta: { difficulty: 1, daily: true, result: true } },
      { path: `${dailyPath}/:code`, component: game, meta: { difficulty: 1, daily: true, mode: dailyPath } },
      {
        path: '/c/:token',
        component: LevelChallenge,
        // The result is loaded before the page shows, so it opens complete instead of flashing a loader.
        beforeEnter: async to => {
          const decoded = decodeChallenge(String(to.params.token))
          if (!decoded) return '/'
          to.meta.challenge = await loadChallenge(decoded.code, decoded.result, decoded.details).catch(() => undefined)
        },
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
  })

  // Codes from another mode move to their own address; broken codes start the mode afresh.
  router.beforeEach(to => {
    const { mode } = to.meta
    if (!mode) return
    const code = String(to.params.code)
    if (mode === dailyPath) return dailyPath
    const actual = modePath(code)
    if (actual === mode) return
    return actual ? levelPath(code) : mode
  })
  return router
}

declare module 'vue-router' {
  interface RouteMeta {
    difficulty?: number
    /** Mode address of a route that carries a level code. */
    mode?: string
    daily?: boolean
    result?: boolean
    theme?: typeof THEMED_MODES[number]
    /** The friend's result on the challenge page; missing when the level is gone. */
    challenge?: Challenge
  }
}
