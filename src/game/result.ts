import type { AchievementId } from './achievements'
import type { GridRow, SharedResult } from './share'

export interface PlayerResult extends SharedResult {
  code: string
  title: string
  modeLabel: string
  stars: number
  runScore: number
  record: boolean
  longest: string
  goldenFound: number
  goldenTotal: number
  bestCombo: number
  grid: GridRow[]
  awards: AchievementId[]
  missing: string[]
  daily: boolean
  friend?: SharedResult & { stars: number }
}
