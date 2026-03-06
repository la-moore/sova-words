export function useUtils() {
  function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max))
  }

  function getRandomWord(words: string[]) {
    const n = getRandomInt(words.length)

    return words[n]
  }

  function getRandomWordLess(words: string[], size: number) {
    const arr = words.filter(val => val.length < size)

    return arr[getRandomInt(arr.length)]
  }

  function getRandomWordEqual(words: string[], length: number) {
    const arr = words.filter(val => val.length === length)

    return arr[getRandomInt(arr.length)]
  }

  function getRandomWordGreater(words: string[], size: number) {
    const arr = words.filter(val => val.length > size)

    return arr[getRandomInt(arr.length)]
  }

  function getRandomWordBetween(words: string[], min: number, max: number) {
    const arr = words.filter(val => val.length >= min && val.length <= max)

    return arr[getRandomInt(arr.length)]
  }

  function getGridWithMaxWords(grids) {
    return grids.reduce((grid, item) => item.words.length > grid.words.length ? item : grid, grids[0])
  }

  function getGridWithWordsEqual(grids, length) {
    return grids.filter((grid) => grid.words.length === length)[0]
  }

  function shuffleArr<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = arr[i]

      arr[i] = arr[j] as T
      arr[j] = tmp as T
    }

    return arr
  }

  function sortArrByLength(arr: string[]): string[] {
    return [...arr].sort((pre, nex) => pre.length - nex.length)
  }

  return {
    shuffleArr,
    sortArrByLength,
    getRandomWord,
    getRandomWordLess,
    getRandomWordEqual,
    getRandomWordGreater,
    getRandomWordBetween,
    getGridWithMaxWords,
    getGridWithWordsEqual,
  }
}
