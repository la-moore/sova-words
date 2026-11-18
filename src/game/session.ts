import type { AchievementId } from './achievements'
import type { PlayerResult } from './result'

const KEY = 'sova-level'

/** Progress of the level currently open in this tab, so a reload restores it. */
export interface LevelProgress {
  code: string
  levelNumber: number
  score: number
  levelScore: number
  found: string[]
  finished: boolean
  hint?: { word: string; count: number }
  hintUsed?: boolean
  comboIndex?: number
  comboUntil?: number
  bestCombo?: number
  awards?: AchievementId[]
  recordBeforeLevel?: number
  friend?: PlayerResult['friend']
}

export function loadLevel(code: string): LevelProgress | undefined {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as LevelProgress | null
    return saved?.code === code ? saved : undefined
  } catch {
    return undefined
  }
}

export function saveLevel(progress: LevelProgress): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(progress)) } catch { /* storage unavailable */ }
}

/** Remembers the friend's result for a level opened from a shared link. */
export function startChallenge(code: string, friend: NonNullable<LevelProgress['friend']>): void {
  const saved = loadLevel(code)
  saveLevel(saved
    ? { ...saved, friend }
    : { code, levelNumber: 1, score: 0, levelScore: 0, found: [], finished: false, friend })
}
