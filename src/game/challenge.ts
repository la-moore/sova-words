import { decodeSeed, resolveSeed } from './seed'
import { resultStars, type SharedDetails, type SharedResult } from './share'
import type { applyTheme } from './theme'
import { DIFFICULTIES, loadDictionary } from './words'

export type Challenge = NonNullable<Awaited<ReturnType<typeof loadChallenge>>>

export async function loadChallenge(code: string, result: SharedResult, details: SharedDetails) {
  const seed = decodeSeed(code)
  if (!seed) return
  const daily = 'day' in seed
  if (!daily) await loadDictionary()
  const mode = resolveSeed(code)
  if (!mode) return
  return {
    ...mode, ...result, ...details, daily, code,
    title: daily ? mode.label : `Вызов: ${mode.label}`,
    stars: resultStars(result.found, result.total, Math.min(result.total, DIFFICULTIES[mode.difficulty].goal)),
    updated: Boolean(mode.level && mode.level.words.length !== result.total),
  }
}

/** Colours of the challenge page: those of the level it invites to. */
export function challengeTheme(challenge: Challenge): Parameters<typeof applyTheme>[0] {
  return challenge.themed?.palette ?? (challenge.daily ? 'daily' : DIFFICULTIES[challenge.difficulty].length)
}
