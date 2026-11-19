export const DIFFICULTIES = [
  { label: 'Лёгкая', length: 5, min: 6, max: 20, goal: 5 },
  { label: 'Средняя', length: 6, min: 10, max: 30, goal: 8 },
  { label: 'Сложная', length: 7, min: 15, max: 45, goal: 12 },
] as const

export interface Level {
  base: string
  words: string[]
}

export const NEW_YEAR_WORDS = [
  'ПОДАРОК', 'СНЕЖИНКА', 'ГИРЛЯНДА', 'СНЕГОВИК', 'СНЕГОПАД', 'СУГРОБ',
] as const

export const THEMED_MODES = [
  {
    label: 'Новый год',
    menuLabel: 'Новогодний режим',
    palette: 'newYear',
    particle: '❄',
    words: NEW_YEAR_WORDS,
  },
  {
    label: 'Космос',
    menuLabel: 'Космос',
    palette: 'space',
    particle: '✦',
    words: ['ПЛАНЕТА', 'КОМЕТА', 'РАКЕТА', 'ОРБИТА', 'СКАФАНДР', 'АСТЕРОИД'],
  },
  {
    label: 'Море',
    menuLabel: 'Море',
    palette: 'sea',
    particle: '○',
    words: ['МАТРОС', 'КАПИТАН', 'ЛАГУНА', 'ОСТРОВ', 'МЕДУЗА', 'ОСЬМИНОГ'],
  },
  {
    label: 'Лес',
    menuLabel: 'Лес',
    palette: 'forest',
    particle: '❧',
    words: ['МУРАВЕЙ', 'ВОРОБЕЙ', 'МАЛИНА', 'ВЕРЕСК', 'КАШТАН', 'ЧЕРНИКА'],
  },
  {
    label: 'Кухня',
    menuLabel: 'Кухня',
    palette: 'kitchen',
    particle: '◇',
    words: ['АПЕЛЬСИН', 'ВАТРУШКА', 'КОТЛЕТА', 'МАРМЕЛАД', 'ШОКОЛАД', 'КАПУСТА'],
  },
  {
    label: 'Музыка',
    menuLabel: 'Музыка',
    palette: 'music',
    particle: '♪',
    words: ['ТРОМБОН', 'СКРИПКА', 'ГАРМОНЬ', 'КОНЦЕРТ', 'АККОРД', 'СОНАТА'],
  },
] as const

let dictionary: { set: Set<string>; words: string[] } | undefined
let loading: Promise<NonNullable<typeof dictionary>> | undefined

export function normalize(word: string): string {
  return word.trim().toUpperCase().replaceAll('Ё', 'Е')
}

export function loadDictionary() {
  return loading ??= Promise.all([import('./words.json'), import('./blocklist.json')])
    .then(([{ default: raw }, { default: blocked }]) => {
      const exclusions = new Set<string>(blocked.map(normalize))
      const words = [...new Set(raw.map(normalize))]
        .filter(word => /^[А-Я]{3,}$/.test(word) && !exclusions.has(word))
      return dictionary = { set: new Set(words), words }
    })
    .catch(error => {
      loading = undefined
      throw error
    })
}

export function letterCounts(word: string): Uint8Array {
  const counts = new Uint8Array(32)
  for (const letter of word) counts[letter.charCodeAt(0) - 1040]++
  return counts
}

export function fits(word: string, counts: Uint8Array): boolean {
  const needed = new Uint8Array(counts.length)
  for (const letter of word) {
    const index = letter.charCodeAt(0) - 1040
    if (index < 0 || index >= counts.length || ++needed[index] > counts[index]) return false
  }
  return true
}

export function levelFromWord(base: string): Level {
  if (!dictionary) throw new Error('Dictionary is unavailable')
  const counts = letterCounts(base)
  return { base, words: dictionary.words.filter(word => word.length <= base.length && fits(word, counts)) }
}

export function generateLevel(length: number, used: ReadonlySet<string>, random = Math.random, previous?: string): Level {
  const difficulty = DIFFICULTIES.find(item => item.length === length)
  if (!dictionary || !difficulty) throw new Error('Dictionary or difficulty is unavailable')
  const candidates = dictionary.words.filter(word => word.length === length)
  const fresh = candidates.filter(word => !used.has(word))
  const alternatives = !fresh.length && previous ? candidates.filter(word => word !== previous) : []
  const pool = fresh.length ? fresh : alternatives.length ? alternatives : candidates
  let best: Level | undefined
  let bestDistance = Infinity
  for (let attempt = 0; attempt < 50 && pool.length; attempt++) {
    const index = Math.floor(random() * pool.length)
    const base = pool[index]
    pool[index] = pool[pool.length - 1]
    pool.pop()
    const level = levelFromWord(base)
    const distance = Math.max(difficulty.min - level.words.length, level.words.length - difficulty.max, 0)
    if (distance === 0) return level
    if (distance < bestDistance) {
      best = level
      bestDistance = distance
    }
  }
  if (!best) throw new Error('No base words for this difficulty')
  return best
}

export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function scramble(word: string, random = Math.random): string[] {
  const result = shuffled([...word], random)
  if (result.join('') === word) {
    const other = result.findIndex(letter => letter !== result[0])
    if (other > 0) [result[0], result[other]] = [result[other], result[0]]
  }
  return result
}
