import { localDate } from './daily'
import { loadPlayer, updatePlayer } from './storage'
import type { BadgeSpec } from '../badges/bake'
import feather from '@scarlab-icons/icons/solid/pencil-feather.svg?raw'
import sparkles from '@scarlab-icons/icons/solid/sparkles.svg?raw'
import key from '@scarlab-icons/icons/solid/key.svg?raw'
import star from '@scarlab-icons/icons/solid/star.svg?raw'
import bolt from '@scarlab-icons/icons/solid/bolt.svg?raw'
import ruler from '@scarlab-icons/icons/solid/ruler.svg?raw'
import bulb from '@scarlab-icons/icons/solid/bulb-on.svg?raw'
import calendar from '@scarlab-icons/icons/solid/calendar.svg?raw'
import droplet from '@scarlab-icons/icons/solid/droplet.svg?raw'
import fire from '@scarlab-icons/icons/solid/fire.svg?raw'
import layers from '@scarlab-icons/icons/solid/layers-3.svg?raw'
import gift from '@scarlab-icons/icons/outline/gift.svg?raw'
import crown from '@scarlab-icons/icons/solid/crown.svg?raw'
import moon from '@scarlab-icons/icons/solid/moon.svg?raw'
import secretGlyph from '@scarlab-icons/icons/base/help-lg.svg?raw'

type AchievementDefinition = {
  title: string
  description: string
  secret?: boolean
  badge: Omit<BadgeSpec, 'id'>
}

const definitions = {
  'first-word': { title: 'Первое слово', description: 'Найдите любое слово.', badge: { base: 'circle', palette: 'bronze', glyph: feather } },
  golden: { title: 'Золотоискатель', description: 'Найдите золотое слово.', badge: { base: 'circle', palette: 'gold', glyph: sparkles } },
  base: { title: 'В самую суть', description: 'Найдите базовое слово уровня.', badge: { base: 'hexagon', palette: 'sapphire', glyph: key } },
  perfect: { title: 'Идеально', description: 'Найдите все слова уровня.', badge: { base: 'star', palette: 'gold', glyph: star } },
  combo: { title: 'Комбо-мастер', description: 'Доведите комбо до ×3.', badge: { base: 'octagon', palette: 'ruby', glyph: bolt, label: '×3' } },
  'long-word': { title: 'Длинное слово', description: 'Найдите слово из семи букв или длиннее.', badge: { base: 'hexagon', palette: 'emerald', glyph: ruler, label: '7' } },
  'no-hints': { title: 'Сам справлюсь', description: 'Пройдите уровень без подсказок.', badge: { base: 'circle', palette: 'silver', glyph: bulb } },
  daily: { title: 'Слово дня', description: 'Пройдите слово дня.', badge: { base: 'octagon', palette: 'sapphire', glyph: calendar } },
  'streak-7': { title: 'Серия 7', description: 'Соберите серию из семи слов дня.', badge: { base: 'shield', palette: 'gold', glyph: droplet, label: '7' } },
  'streak-30': { title: 'Серия 30', description: 'Соберите серию из 30 слов дня.', badge: { base: 'shield', palette: 'ruby', glyph: fire, label: '30' } },
  'all-difficulties': { title: 'Все сложности', description: 'Пройдите по уровню на каждой сложности.', badge: { base: 'hexagon', palette: 'silver', glyph: layers } },
  themed: { title: 'Праздничный', description: 'Пройдите уровень в тематическом режиме.', badge: { base: 'star', palette: 'emerald', glyph: gift } },
  thousand: { title: 'Тысячник', description: 'Наберите 1000 очков за один забег.', badge: { base: 'octagon', palette: 'gold', glyph: crown, label: '1000' } },
  'night-owl': { title: 'Ночная сова', description: 'Найдите слово между 00:00 и 04:59 по местному времени.', secret: true, badge: { base: 'circle', palette: 'amethyst', glyph: moon } },
} satisfies Record<string, AchievementDefinition>

export type AchievementId = keyof typeof definitions
export type Achievement = Omit<AchievementDefinition, 'badge'> & { id: AchievementId; badge: BadgeSpec }

export function achievement(id: AchievementId): Achievement {
  const definition = definitions[id]
  return { ...definition, id, badge: { ...definition.badge, id } }
}

export const achievements = (Object.keys(definitions) as AchievementId[]).map(achievement)

interface Award { at: string; seen: boolean }

export interface AchievementState {
  unlocked: Partial<Record<AchievementId, Award>>
  difficulties: number[]
}

function readAchievements(): AchievementState {
  return loadPlayer().achievements
}

function saveAchievements(state: AchievementState) {
  updatePlayer(data => { data.achievements = state })
}

function streakAwards(streak: number): AchievementId[] {
  return [
    ...(streak >= 1 ? ['daily'] as const : []),
    ...(streak >= 7 ? ['streak-7'] as const : []),
    ...(streak >= 30 ? ['streak-30'] as const : []),
  ]
}

/** Reads the saved state, first granting streak awards earned before they existed. */
export function loadAchievements(date = localDate()): AchievementState {
  const { achievements: state, streak } = loadPlayer()
  unlock(state, streakAwards(streak.best), streak.lastDate || date)
  return state
}

/** How a badge is shown: secret ones keep their name and glyph hidden until earned. */
export function displayedAchievement(award: Achievement, locked: boolean): Achievement {
  if (!award.secret || !locked) return award
  return {
    ...award,
    title: '???',
    description: 'Секретная ачивка.',
    badge: { ...award.badge, id: `${award.id}-secret`, glyph: secretGlyph },
  }
}

function lockedIds(state: AchievementState, rules: Partial<Record<AchievementId, boolean>>) {
  return achievements.filter(({ id }) => rules[id] && !state.unlocked[id]).map(({ id }) => id)
}

interface WordEvent {
  length: number
  golden: boolean
  base: boolean
  combo: number
  hour: number
  score: number
  perfect: boolean
}

export function onWord(state: AchievementState, event: WordEvent): AchievementId[] {
  return lockedIds(state, {
    'first-word': true,
    golden: event.golden,
    base: event.base,
    perfect: event.perfect,
    combo: event.combo >= 3,
    'long-word': event.length >= 7,
    thousand: event.score >= 1000,
    'night-owl': event.hour >= 0 && event.hour < 5,
  })
}

interface LevelEvent {
  difficulty: number
  daily: boolean
  themed: boolean
  hintUsed: boolean
  streak: number
}

export function onLevelComplete(state: AchievementState, event: LevelEvent): AchievementId[] {
  if (!event.daily && !event.themed && !state.difficulties.includes(event.difficulty)) {
    state.difficulties.push(event.difficulty)
  }
  return lockedIds(state, {
    'no-hints': !event.hintUsed,
    daily: event.daily,
    'streak-7': event.daily && event.streak >= 7,
    'streak-30': event.daily && event.streak >= 30,
    'all-difficulties': [0, 1, 2].every(difficulty => state.difficulties.includes(difficulty)),
    themed: event.themed,
  })
}

export function unlock(state: AchievementState, ids: readonly AchievementId[], date: string, difficultiesChanged = false): void {
  let changed = difficultiesChanged
  for (const id of ids) {
    if (state.unlocked[id]) continue
    state.unlocked[id] = { at: date, seen: false }
    changed = true
  }
  if (changed) saveAchievements(state)
}

export function unseen(state: AchievementState): AchievementId[] {
  return achievements.map(({ id }) => id).filter(id => state.unlocked[id]?.seen === false)
}

export function markSeen(ids: readonly AchievementId[]): AchievementState {
  const state = readAchievements()
  let changed = false
  for (const id of ids) {
    const award = state.unlocked[id]
    if (award && !award.seen) {
      award.seen = true
      changed = true
    }
  }
  if (changed) saveAchievements(state)
  return state
}
