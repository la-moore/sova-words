import { defineComponent } from 'vue'
import { createRouter, type RouteMeta, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import { loadChallenge, type Challenge } from './game/challenge'
import { decodeChallenge } from './game/share'
import type { THEMED_MODES } from './game/words'
import ChallengePage from './pages/ChallengePage.vue'
import HomePage from './pages/HomePage.vue'
import { dailyPath, homePath, levelPath, modePath, regularModes, themedModes } from './paths'

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

/** Game routes render nothing: the canvas in App.vue reads the route meta and plays the level. */
const GameRoute = defineComponent({ name: 'GameRoute', inheritAttrs: false, render: () => null })

/** A mode's start, a level in it, and that level's result. */
function modeRoutes(path: string, meta: RouteMeta): RouteRecordRaw[] {
  return [
    { path, component: GameRoute, meta },
    { path: `${path}/:code`, component: GameRoute, meta: { ...meta, mode: path } },
    { path: `${path}/:code/result`, component: GameRoute, meta: { ...meta, mode: path, result: true } },
  ]
}

const dailyMeta: RouteMeta = { difficulty: 1, daily: true }

export function createGameRouter(history: RouterHistory) {
  const router = createRouter({
    history,
    routes: [
      { path: homePath, component: HomePage },
      ...regularModes.flatMap(mode => modeRoutes(mode.path, { difficulty: mode.difficulty })),
      ...themedModes.flatMap(mode => modeRoutes(mode.path, { difficulty: 1, theme: mode })),
      { path: dailyPath, component: GameRoute, meta: dailyMeta },
      { path: `${dailyPath}/result`, component: GameRoute, meta: { ...dailyMeta, result: true } },
      { path: `${dailyPath}/:code`, component: GameRoute, meta: { ...dailyMeta, mode: dailyPath } },
      {
        path: '/c/:token',
        component: ChallengePage,
        // The result is loaded before the page shows, so it opens complete instead of flashing a loader.
        beforeEnter: async to => {
          const decoded = decodeChallenge(String(to.params.token))
          if (!decoded) return homePath
          to.meta.challenge = await loadChallenge(decoded.code, decoded.result, decoded.details).catch(() => undefined)
        },
      },
      { path: '/:pathMatch(.*)*', redirect: homePath },
    ],
    scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
  })

  // Codes from another mode move to their own address; broken codes start the mode afresh.
  router.beforeEach(to => {
    const { mode } = to.meta
    if (!mode) return
    if (mode === dailyPath) return dailyPath
    const code = String(to.params.code)
    const actual = modePath(code)
    if (actual === mode) return
    return actual ? levelPath(code) : mode
  })

  return router
}
