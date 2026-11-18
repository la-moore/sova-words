import type { AchievementId } from './achievements'
import { readStorage, writeStorage } from './rules'

const LAUNCH = '2026-11-18'
const DAY_MS = 86_400_000
const DAILY_KEY = 'cynfas-anagram-daily'
const DAILY_BEST_KEY = 'cynfas-anagram-daily-best'
const STREAK_KEY = 'cynfas-anagram-streak'

export interface Streak {
  current: number
  best: number
  lastDate: string
  freezeUsedWeek: string
}

export interface DailyProgress {
  date: string
  found: string[]
  score: number
  finished: boolean
  hintUsed?: boolean
  hint?: { word: string; count: number }
  comboIndex?: number
  comboUntil?: number
  bestCombo?: number
  awards?: AchievementId[]
  recordBeforeLevel?: number
}

export function localDate(date = new Date()): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-')
}

function dayNumber(date: string): number {
  return Date.parse(date) / DAY_MS
}

function weekOfDay(day: number): string {
  const weekday = new Date(day * DAY_MS).getUTCDay()
  return new Date((day - (weekday + 6) % 7) * DAY_MS).toISOString().slice(0, 10)
}

export function dailyNumber(date: string): number {
  return Math.max(1, dayNumber(date) - dayNumber(LAUNCH) + 1)
}

export function dailyRandom(date: string): () => number {
  let state = 2166136261
  for (const char of date) state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let value = Math.imul(state ^ state >>> 15, state | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function recordStreak(streak: Streak, date: string): Streak {
  if (streak.lastDate && date <= streak.lastDate) return streak
  const today = dayNumber(date)
  const gap = today - dayNumber(streak.lastDate)
  const missedWeek = weekOfDay(today - 1)
  const frozen = gap === 2 && streak.freezeUsedWeek !== missedWeek
  const current = gap === 1 || frozen ? streak.current + 1 : 1
  return {
    current,
    best: Math.max(streak.best, current),
    lastDate: date,
    freezeUsedWeek: frozen ? missedWeek : streak.freezeUsedWeek,
  }
}

export function loadStreak(): Streak {
  return readStorage(STREAK_KEY, { current: 0, best: 0, lastDate: '', freezeUsedWeek: '' })
}

export function completeDaily(date: string): Streak {
  const streak = recordStreak(loadStreak(), date)
  writeStorage(STREAK_KEY, streak)
  return streak
}

export function activeStreak(streak: Streak, date: string): number {
  const today = dayNumber(date)
  const gap = today - dayNumber(streak.lastDate)
  return gap <= 1 || (gap === 2 && streak.freezeUsedWeek !== weekOfDay(today - 1))
    ? streak.current : 0
}

export function loadDaily(date: string): DailyProgress | undefined {
  const state = readStorage<DailyProgress | null>(DAILY_KEY, null)
  return state?.date === date ? state : undefined
}

export function loadDailyBest(): number {
  const progress = readStorage<DailyProgress | null>(DAILY_KEY, null)
  return Math.max(readStorage(DAILY_BEST_KEY, 0), progress?.score ?? 0)
}

export function saveDaily(progress: DailyProgress): void {
  const previous = readStorage<DailyProgress | null>(DAILY_KEY, null)
  if (!previous || previous.date <= progress.date && !(previous.date === progress.date && previous.finished)) {
    const best = readStorage(DAILY_BEST_KEY, 0)
    const nextBest = Math.max(best, previous?.score ?? 0, progress.score)
    if (nextBest > best) writeStorage(DAILY_BEST_KEY, nextBest)
    writeStorage(DAILY_KEY, progress)
  }
}

export function timeUntilTomorrow(now = new Date()): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const seconds = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000)
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':')
}
