import { dailyRandom } from './daily'
import { DIFFICULTIES, THEMED_MODES, levelFromWord, scramble, shuffled, type Level } from './words'

// Mode IDs are part of the link format. Append new themes without reordering these IDs.
export const PALETTES = ['newYear', 'space', 'sea', 'forest', 'kitchen', 'music'] as const
const DAILY_MODE = 15
const VERSION = 1n
const MASK = [0x97, 0x3c, 0xe5, 0x68, 0x14, 0xad]
const SHIFT = 41n

export type Seed = { mode: number; base: string } | { day: number }
export const themeMode = (palette: typeof PALETTES[number]) => PALETTES.indexOf(palette) + 3

export function encodeSeed(seed: Seed): string {
  const mode = 'day' in seed ? DAILY_MODE : seed.mode
  let payload = 'day' in seed ? BigInt(seed.day) : 1n
  if ('base' in seed) {
    // The leading bit preserves word length, including words beginning with А.
    for (const letter of [...seed.base].reverse()) {
      payload = payload << 5n | BigInt(letter.charCodeAt(0) - 1040)
    }
  }
  const bits = VERSION << 45n | BigInt(mode) << SHIFT | payload
  const bytes = MASK.map((mask, i) => Number(bits >> BigInt(i * 8) & 255n) ^ mask)
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_')
}

export function decodeSeed(code: string): Seed | undefined {
  if (!/^[A-Za-z0-9_-]{8}$/.test(code)) return
  const bytes = atob(code.replaceAll('-', '+').replaceAll('_', '/'))
  const bits = MASK.reduce((value, mask, i) =>
    value | BigInt(bytes.charCodeAt(i) ^ mask) << BigInt(i * 8), 0n)
  if (bits >> 45n !== VERSION) return
  const mode = Number(bits >> SHIFT & 15n)
  let payload = bits & ((1n << SHIFT) - 1n)
  if (mode === DAILY_MODE) return payload > 0n ? { day: Number(payload) } : undefined
  if (mode >= 3 + PALETTES.length) return
  let base = ''
  while (payload > 1n) {
    base += String.fromCharCode(1040 + Number(payload & 31n))
    payload >>= 5n
  }
  if (payload !== 1n || base.length < 5) return
  return { mode, base }
}

export function resolveSeed(code: string) {
  const seed = decodeSeed(code)
  if (!seed) return
  if ('day' in seed) return { day: seed.day, difficulty: 1, label: `Слово дня #${seed.day}` }
  const themed = THEMED_MODES.find(mode => mode.palette === PALETTES[seed.mode - 3])
  const difficulty = themed ? 1 : seed.mode
  const settings = DIFFICULTIES[difficulty]
  if (themed ? !(themed.words as readonly string[]).includes(seed.base) : seed.base.length !== settings?.length) return
  const level = levelFromWord(seed.base)
  if (!level.words.includes(seed.base)) return
  return { level, difficulty, themed, label: themed?.label ?? `${settings.length} букв` }
}

export function seededLayout(level: Level, code: string, dailyRng?: () => number) {
  const rng = dailyRng ?? dailyRandom(code)
  const golden = shuffled(level.words.filter(word => word.length >= 4), rng).slice(0, rng() < 0.5 ? 1 : 2)
  return { golden, letters: scramble(level.base, rng) }
}
