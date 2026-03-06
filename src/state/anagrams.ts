import { useUtils } from "~/state/utils.ts"

type CharCounts = Record<string, number>

export function useAnagrams() {
  const { getRandomWordEqual } = useUtils()

  const wordCountsCache = new Map<string, CharCounts>()
  const wordUniqueCache = new Map<string, Set<string>>()

  function getCharCounts(word: string): CharCounts {
    const cached = wordCountsCache.get(word)
    if (cached) return cached

    const counts: CharCounts = {}
    for (const ch of word) counts[ch] = (counts[ch] || 0) + 1
    wordCountsCache.set(word, counts)
    return counts
  }

  function getUniqueChars(word: string): Set<string> {
    const cached = wordUniqueCache.get(word)
    if (cached) return cached

    const set = new Set<string>()
    for (const ch of word) set.add(ch)
    wordUniqueCache.set(word, set)
    return set
  }

  function canFormFrom(word: string, poolCounts: CharCounts, poolUnique: Set<string>): boolean {
    if (word.length === 0) return false

    const unique = getUniqueChars(word)
    for (const ch of unique) {
      if (!poolUnique.has(ch)) return false
    }

    const counts = getCharCounts(word)
    for (const ch of Object.keys(counts)) {
      if ((poolCounts[ch] || 0) < (counts[ch] || 0)) return false
    }

    return true
  }

  function getAnagrams(words: string[], wordsLength: number, min: number) {
    const maxAttempts = 1000
    let chars: string[] = []
    let anagrams: string[] = []
    let attempts = 0

    do {
      const base = getRandomWordEqual(words, wordsLength)
      if (!base) {
        attempts++
        continue
      }

      chars = [...base]
      const poolCounts = getCharCounts(base)
      const poolUnique = getUniqueChars(base)

      anagrams = []
      for (const word of words) {
        if (word.length > chars.length) continue
        if (canFormFrom(word, poolCounts, poolUnique)) anagrams.push(word)
      }

      attempts++
    } while (attempts < maxAttempts && anagrams.length < min)

    if (anagrams.length < min) {
      throw new Error('generation error')
    }

    return {
      chars,
      anagrams
    }
  }

  return {
    getAnagrams
  }
}
