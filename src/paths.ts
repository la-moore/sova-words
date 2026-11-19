import { decodeSeed, PALETTES } from './game/seed'
import { DIFFICULTIES, THEMED_MODES } from './game/words'

/** Addresses of every screen; kept apart from the router so pages can link without importing it. */

export const homePath = '/'
export const dailyPath = '/play/daily'

export const regularModes = DIFFICULTIES.map((mode, difficulty) => ({
  ...mode,
  difficulty,
  path: `/play/${mode.length}`,
}))

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
