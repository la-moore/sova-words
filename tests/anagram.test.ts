import { describe, expect, it } from 'vitest'
import { generateLevel, letterCounts, fits, loadDictionary } from '../src/game/words'
import { dailyRandom, recordStreak, type Streak } from '../src/game/daily'
import { wordPoints } from '../src/game/rules'

describe('anagram v2', () => {
  it('rejects words that need an extra copy of a letter', () => {
    expect(fits('КОК', letterCounts('КОТ'))).toBe(false)
    expect(fits('ТОК', letterCounts('КОТ'))).toBe(true)
  })

  it('generates the same playable daily level from the same seed', async () => {
    await loadDictionary()
    const level = generateLevel(6, new Set(), dailyRandom('2026-11-18'))
    expect(generateLevel(6, new Set(), dailyRandom('2026-11-18'))).toEqual(level)
    expect(level.words).toContain(level.base)
    expect(level.words.length).toBeGreaterThanOrEqual(8)
  })

  it('applies the base bonus after the multipliers', () => {
    expect(wordPoints(7, true, true, true, 3)).toBe(500)
  })

  it('allows one missed day per calendar week', () => {
    const initial: Streak = { current: 3, best: 3, lastDate: '2026-11-16', freezeUsedWeek: '' }
    const extended = recordStreak(initial, '2026-11-18')
    expect(extended.current).toBe(4)
    expect(recordStreak(extended, '2026-11-18')).toEqual(extended)
    expect(recordStreak(extended, '2026-11-20').current).toBe(1)
    expect(recordStreak(extended, '2026-11-23').current).toBe(1)
  })
})
