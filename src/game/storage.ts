import type { AchievementState } from './achievements'
import type { DailyProgress, Streak } from './daily'

/** Everything the game remembers about the player, kept under one localStorage key. */
export interface PlayerData {
  version: typeof VERSION
  /** Best score per mode: word length for regular modes (`'5'`), palette for themed ones (`'space'`). */
  records: Record<string, number>
  daily: DailyProgress | null
  dailyBest: number
  streak: Streak
  achievements: AchievementState
  settings: Settings
}

export interface Settings {
  sound: boolean
  vibration: boolean
}

export const PLAYER_KEY = 'sova-player'
const VERSION = 1

function defaults(): PlayerData {
  return {
    version: VERSION,
    records: {},
    daily: null,
    dailyBest: 0,
    streak: { current: 0, best: 0, lastDate: '', freezeUsedWeek: '' },
    achievements: { unlocked: {}, difficulties: [] },
    settings: { sound: true, vibration: true },
  }
}

/** Fills fields missing from older or partial saves with their defaults. */
function complete(saved: Partial<PlayerData>): PlayerData {
  const base = defaults()
  return {
    version: VERSION,
    records: { ...base.records, ...saved.records },
    daily: saved.daily ?? null,
    dailyBest: saved.dailyBest ?? 0,
    streak: { ...base.streak, ...saved.streak },
    achievements: { ...base.achievements, ...saved.achievements },
    settings: { ...base.settings, ...saved.settings },
  }
}

// Keys written before all data moved under PLAYER_KEY. Frozen: only read once to migrate.
const LEGACY = {
  best: 'cynfas-anagram-best',
  daily: 'cynfas-anagram-daily',
  dailyBest: 'cynfas-anagram-daily-best',
  streak: 'cynfas-anagram-streak',
  achievements: 'cynfas-anagram-achievements',
  sound: 'cynfas-anagram-sound',
  vibration: 'cynfas-anagram-vibration',
}
const LEGACY_THEMED: Record<string, string> = {
  newYear: 'cynfas-anagram-new-year-best',
  space: 'cynfas-anagram-space-best',
  sea: 'cynfas-anagram-sea-best',
  forest: 'cynfas-anagram-forest-best',
  kitchen: 'cynfas-anagram-kitchen-best',
  music: 'cynfas-anagram-music-best',
}
const legacyKeys = [...Object.values(LEGACY), ...Object.values(LEGACY_THEMED)]

function readLegacy<T>(key: string): T | undefined {
  try {
    const value = localStorage.getItem(key)
    return value === null ? undefined : JSON.parse(value) ?? undefined
  } catch {
    return undefined
  }
}

function migrateLegacy(): PlayerData | undefined {
  if (!legacyKeys.some(key => localStorage.getItem(key) !== null)) return
  const best = readLegacy<Record<string, number> | number>(LEGACY.best)
  const records: Record<string, number> = typeof best === 'number' ? { 5: best } : { ...best }
  for (const [palette, key] of Object.entries(LEGACY_THEMED)) {
    const score = readLegacy<number>(key)
    if (score) records[palette] = score
  }
  return complete({
    records,
    daily: readLegacy(LEGACY.daily),
    dailyBest: readLegacy(LEGACY.dailyBest),
    streak: readLegacy(LEGACY.streak),
    achievements: readLegacy(LEGACY.achievements),
    settings: { sound: readLegacy(LEGACY.sound) ?? true, vibration: readLegacy(LEGACY.vibration) ?? true },
  })
}

function write(data: PlayerData): boolean {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/** Reads the saved data fresh on every call, so other tabs' writes are never overwritten with stale state. */
export function loadPlayer(): PlayerData {
  try {
    const saved = localStorage.getItem(PLAYER_KEY)
    if (saved !== null) return complete(JSON.parse(saved) ?? {})
    const migrated = migrateLegacy()
    if (!migrated) return defaults()
    if (write(migrated)) for (const key of legacyKeys) localStorage.removeItem(key)
    return migrated
  } catch {
    return defaults()
  }
}

export function updatePlayer(change: (data: PlayerData) => void): PlayerData {
  const data = loadPlayer()
  change(data)
  write(data)
  requestPersistence()
  notify(data)
  return data
}

type PlayerListener = (data: PlayerData) => void
const listeners = new Set<PlayerListener>()

function notify(data: PlayerData): void {
  for (const listener of listeners) listener(data)
}

function onStorage(event: StorageEvent): void {
  if (event.key === PLAYER_KEY || event.key === null) notify(loadPlayer())
}

/**
 * Calls `listener` after every save, in this tab or another one. Returns the unsubscribe function.
 * Lets the game and the Vue stores react to the same data without keeping copies in sync by hand.
 */
export function onPlayerChange(listener: PlayerListener): () => void {
  if (!listeners.size && typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size && typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

/** Flips one setting and returns its new value. */
export function toggleSetting(key: keyof Settings): boolean {
  return updatePlayer(data => { data.settings[key] = !data.settings[key] }).settings[key]
}

let persistenceRequested = false

/**
 * Asks the browser not to evict the player's data under storage pressure.
 * Requested on the first save rather than at startup, when the player has progress worth keeping.
 */
function requestPersistence(): void {
  if (persistenceRequested) return
  persistenceRequested = true
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
  if (!storage?.persist) return
  storage.persisted()
    .then(persisted => persisted || storage.persist())
    .catch(() => { /* persistence unavailable */ })
}
