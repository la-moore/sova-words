// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest'
import { loadPlayer, PLAYER_KEY, updatePlayer } from '../src/game/storage'

afterEach(() => localStorage.clear())

it('starts with defaults when nothing is saved', () => {
  expect(loadPlayer()).toMatchObject({
    version: 1, records: {}, daily: null, dailyBest: 0,
    streak: { current: 0, best: 0 }, settings: { sound: true, vibration: true },
  })
  expect(localStorage.length).toBe(0)
})

it('moves the old per-value keys into one versioned key', () => {
  const daily = { date: '2026-11-18', found: ['СОВА'], score: 40, finished: true }
  const old = {
    'cynfas-anagram-best': { 5: 120, 7: 300 },
    'cynfas-anagram-space-best': 90,
    'cynfas-anagram-new-year-best': 15,
    'cynfas-anagram-daily': daily,
    'cynfas-anagram-daily-best': 55,
    'cynfas-anagram-streak': { current: 3, best: 8, lastDate: '2026-11-18', freezeUsedWeek: '' },
    'cynfas-anagram-achievements': { unlocked: { 'first-word': { at: '2026-11-18', seen: true } }, difficulties: [0] },
    'cynfas-anagram-sound': false,
  }
  for (const [key, value] of Object.entries(old)) localStorage.setItem(key, JSON.stringify(value))
  localStorage.setItem('unrelated', '1')

  const player = loadPlayer()
  expect(player).toEqual({
    version: 1,
    records: { 5: 120, 7: 300, space: 90, newYear: 15 },
    daily,
    dailyBest: 55,
    streak: old['cynfas-anagram-streak'],
    achievements: old['cynfas-anagram-achievements'],
    settings: { sound: false, vibration: true },
  })
  expect(Object.keys(localStorage).sort()).toEqual([PLAYER_KEY, 'unrelated'])
  expect(loadPlayer()).toEqual(player)
})

it('reads a single old record saved as a number as the easy mode record', () => {
  localStorage.setItem('cynfas-anagram-best', '77')
  expect(loadPlayer().records).toEqual({ 5: 77 })
})

it('saves updates and fills fields missing from a partial save', () => {
  localStorage.setItem(PLAYER_KEY, JSON.stringify({ version: 1, records: { 6: 10 } }))
  updatePlayer(data => { data.settings.vibration = false })
  expect(loadPlayer()).toMatchObject({ records: { 6: 10 }, settings: { sound: true, vibration: false }, dailyBest: 0 })
})

it('falls back to defaults on a corrupted save', () => {
  localStorage.setItem(PLAYER_KEY, '{broken')
  expect(loadPlayer().records).toEqual({})
})
