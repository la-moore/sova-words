// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest'
import { achievements, loadAchievements, markSeen, onLevelComplete, onWord, unseen, unlock, type AchievementState } from '../src/game/achievements'

const empty = (): AchievementState => ({ unlocked: {}, difficulties: [] })
afterEach(() => localStorage.clear())

it('evaluates word, score, combo, and local night time independently', () => {
  const event = { length: 7, golden: true, base: true, combo: 3, hour: 4, score: 1000, perfect: true }
  const ids = onWord(empty(), event)
  expect(ids).toEqual(['first-word', 'golden', 'base', 'perfect', 'combo', 'long-word', 'thousand', 'night-owl'])
  expect(onWord(empty(), { ...event, hour: 5, score: 999, length: 6, combo: 2, golden: false, base: false, perfect: false }))
    .toEqual(['first-word'])
})

it('tracks distinct regular difficulties and evaluates themed, daily and no-hints separately', () => {
  const state = empty()
  const event = { difficulty: 1, daily: false, themed: false, hintUsed: true, streak: 0 }
  expect(onLevelComplete(state, { ...event, daily: true, streak: 30 })).toEqual(['daily', 'streak-7', 'streak-30'])
  expect(onLevelComplete(state, { ...event, themed: true, hintUsed: false })).toEqual(['no-hints', 'themed'])
  expect(state.difficulties).toEqual([])
  for (const difficulty of [1, 1, 0]) expect(onLevelComplete(state, { ...event, difficulty })).toEqual([])
  expect(onLevelComplete(state, { ...event, difficulty: 2 })).toEqual(['all-difficulties'])
  expect(state.difficulties).toEqual([1, 0, 2])
})

it('persists dates and acknowledgement, and grants old streak awards once', () => {
  localStorage.setItem('cynfas-anagram-streak', JSON.stringify({ best: 30 }))
  const state = loadAchievements('2026-11-18')
  expect(achievements).toHaveLength(14)
  expect(unseen(state)).toEqual(['daily', 'streak-7', 'streak-30'])
  unlock(state, ['first-word'], '2026-11-18')
  markSeen(['streak-7', 'first-word'])
  const restored = loadAchievements('2026-11-19')
  unlock(restored, ['first-word'], '2026-11-19')
  expect(restored.unlocked['first-word']).toEqual({ at: '2026-11-18', seen: true })
  expect(restored.unlocked['streak-7']).toEqual({ at: '2026-11-18', seen: true })
  expect(unseen(restored)).toEqual(['daily', 'streak-30'])
})
