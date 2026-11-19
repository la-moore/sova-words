import { describe, expect, it } from 'vitest'
import common from '../src/game/words.json'
import extra from '../src/game/words-extra.json'
import { THEMED_MODES, normalize } from '../src/game/words'

const commonSet = new Set(common.map(normalize))
const all = new Set([...commonSet, ...extra.map(normalize)])

describe('dictionary', () => {
  it('keeps the two lists disjoint', () => {
    expect(extra.filter(word => commonSet.has(normalize(word)))).toEqual([])
  })

  it('has every themed base among the common words', () => {
    const bases = THEMED_MODES.flatMap(mode => [...mode.words])
    expect(bases.filter(word => !commonSet.has(normalize(word)))).toEqual([])
  })

  it('has everyday words among the common ones', () => {
    const everyday = 'кот кошка собака дом стол окно машина книга вода хлеб солнце звезда дождь голова сердце заяц медведь мышь картошка деньги сова ежик'
    expect(everyday.split(' ').filter(word => !commonSet.has(normalize(word)))).toEqual([])
  })

  it('accepts rare words but leaves out blocked ones', () => {
    expect(all.has(normalize('береста'))).toBe(true)
    expect(commonSet.has(normalize('тиунство'))).toBe(false)
    expect(['сука', 'жопа', 'говно'].filter(word => all.has(normalize(word)))).toEqual([])
  })
})
