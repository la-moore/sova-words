// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import soundOff from '@scarlab-icons/icons/outline/volume-x.svg?raw'
import soundOn from '@scarlab-icons/icons/outline/volume-high.svg?raw'
import { decodeSeed, encodeSeed, resolveSeed, seededLayout } from '../src/game/seed'
import { decodeChallenge, encodeChallenge, gridRows, resultStars } from '../src/game/share'
import { DIFFICULTIES, loadDictionary, THEMED_MODES } from '../src/game/words'

it('round-trips all regular and themed words without including the answer', async () => {
  const { words } = await loadDictionary()
  DIFFICULTIES.forEach(({ length }, mode) => {
    for (const base of words.filter(word => word.length === length)) {
      const code = encodeSeed({ mode, base })
      expect(code).toMatch(/^[\w-]{1,10}$/)
      expect(code).not.toContain(base)
      expect(decodeSeed(code)).toEqual({ mode, base })
    }
  })
  THEMED_MODES.forEach(({ words }, index) => {
    for (const base of words) {
      const code = encodeSeed({ mode: index + 3, base })
      expect(decodeSeed(code)).toEqual({ mode: index + 3, base })
      expect(resolveSeed(code)?.level?.base).toBe(base)
    }
  })
  expect(decodeSeed(encodeSeed({ day: 444 }))).toEqual({ day: 444 })
  expect(resolveSeed('garbage')).toBeUndefined()
  expect(resolveSeed(encodeSeed({ mode: 1, base: 'АААААА' }))).toBeUndefined()
  expect(resolveSeed(encodeSeed({ mode: 4, base: 'КОТЛЕТА' }))).toBeUndefined()
})

it('reproduces golden words and letter order', async () => {
  await loadDictionary()
  const code = encodeSeed({ mode: 4, base: 'ПЛАНЕТА' })
  const level = resolveSeed(code)!.level!
  expect(seededLayout(level, code)).toEqual(seededLayout(resolveSeed(code)!.level!, code))
})

it('requires the goal and rounds the second star up', () => {
  expect([7, 8, 11, 12, 15].map(found => resultStars(found, 15, 8))).toEqual([0, 1, 1, 2, 3])
  expect(resultStars(8, 10, 8)).toBe(2)
  expect(resultStars(8, 10, 9)).toBe(0)
})

it('renders player details', async () => {
  const { createApp, h, nextTick, ref } = await import('vue')
  const { default: LevelResult } = await import('../src/components/LevelResult.vue')
  const host = document.createElement('div')
  const player = {
    code: 'abcdefgh', title: 'Уровень 1 пройден', modeLabel: '6 букв', stars: 2,
    score: 340, runScore: 510, record: true, found: 12, total: 15, longest: 'ПЕРЕВОД',
    goldenFound: 2, goldenTotal: 2, bestCombo: 3, awards: ['daily'] as const,
    missing: ['СЛОВО'], daily: false, grid: [],
  }
  const sound = ref(false)
  const game = createApp({ render: () => h(LevelResult, {
    result: { ...player, awards: [...player.awards] },
    sound: sound.value,
    onSound: () => { sound.value = !sound.value },
  }) })
  game.mount(host)
  const soundButton = host.querySelector<HTMLButtonElement>('button[aria-label="Звук"]')!
  const svgContent = (source: string) => new DOMParser().parseFromString(source, 'image/svg+xml').documentElement.innerHTML
  expect(soundButton.querySelector('svg')?.innerHTML).toBe(svgContent(soundOff))
  soundButton.click()
  await nextTick()
  expect(soundButton.getAttribute('aria-pressed')).toBe('true')
  expect(soundButton.querySelector('svg')?.innerHTML).toBe(svgContent(soundOn))
  expect(host.querySelector('[aria-label="Звёзды: 2 из 3"]')).not.toBeNull()
  expect(host.querySelectorAll('.level-result-star-on')).toHaveLength(2)
  expect(host.textContent).toContain('Поделиться')
  expect(host.textContent).not.toContain('Вот что увидит друг')
  expect(host.querySelector('[aria-label="Очки за уровень: 340"]')).not.toBeNull()
  expect(host.textContent).toContain('Значки за уровень')
  expect(host.querySelector('details')?.open).toBe(false)
  game.unmount()

})

it('packs the result, grid, golden words and combo into a short token and reads them back', () => {
  const grid = gridRows(['КОТ', 'ТОК', 'КРОТ', 'ТРОК', 'ОКРОТ'], ['КОТ', 'КРОТ', 'ОКРОТ'])
  expect(grid).toEqual([{ length: 3, found: 1, total: 2 }, { length: 4, found: 1, total: 2 }, { length: 5, found: 1, total: 1 }])
  const code = 'AbCdEfGh'
  const token = encodeChallenge(code, { score: 340, found: 3, total: 5, grid, goldenFound: 1, goldenTotal: 2, bestCombo: 1.5 })
  expect(token).toMatch(/^[\w-]+$/)
  // Neither the level code nor the numbers show.
  expect(token).not.toContain(code)
  expect(token.length).toBeLessThanOrEqual(30)
  expect(encodeChallenge(code, { score: 341, found: 3, total: 5, grid, goldenFound: 1, goldenTotal: 2, bestCombo: 1.5 }).slice(1, 9))
    .not.toBe(token.slice(1, 9))
  const decoded = { code, result: { score: 340, found: 3, total: 5 }, details: { grid, golden: { found: 1, total: 2 }, combo: 1.5 } }
  expect(decodeChallenge(token)).toEqual(decoded)
  // Share text glued to the link when pasted into the address bar.
  expect(decodeChallenge(`${token}Sova · 5 букв ★★☆ 3/5`)).toEqual(decoded)
  // A changed character, a cut token or a bare code give nothing.
  const swapped = token[10] === 'A' ? 'B' : 'A'
  expect(decodeChallenge(token.slice(0, 10) + swapped + token.slice(11))).toBeUndefined()
  expect(decodeChallenge(token.slice(0, -3))).toBeUndefined()
  expect(decodeChallenge(code)).toBeUndefined()
  // Without golden words the token leaves them out.
  expect(decodeChallenge(encodeChallenge(code, { score: 0, found: 0, total: 5, grid: gridRows(['КОТ', 'ТОК', 'КРОТ', 'ТРОК', 'ОКРОТ'], []), goldenFound: 0, goldenTotal: 0, bestCombo: 1 }))?.details.golden)
    .toBeUndefined()
})
