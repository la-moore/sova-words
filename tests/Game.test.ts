// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { Application, Object2D, RectShape, TextShape } from '@cynfas/core'
import { loadAchievements, markSeen } from '../src/game/achievements'
import { AnagramGame, DESIGN } from '../src/game/Game'
import type { PlayerResult } from '../src/game/result'
import { dailyRandom, loadDaily, localDate } from '../src/game/daily'
import { GameBackdrop, GlassRect } from '../src/game/glass'
import { Button, Counter, Tile } from '../src/game/ui'
import { generateLevel, levelFromWord, loadDictionary, THEMED_MODES } from '../src/game/words'

let app: Application | undefined
let game: AnagramGame
let result: PlayerResult | undefined

function startGame(): Application {
  const canvas = document.createElement('canvas')
  const context = new Proxy({}, { get: () => () => {} }) as CanvasRenderingContext2D
  app = new Application({ ...DESIGN, canvas, designSize: DESIGN, autoStart: false, renderer: { ctx: context } })
  game = new AnagramGame(app, () => game.leave(), value => { result = value })
  game.leave()
  return app
}

function labels(node: Object2D): string[] {
  return node instanceof TextShape ? [node.text] : node.children.flatMap(labels)
}

function tap(x: number, y: number): void {
  for (const type of ['pointerdown', 'pointerup']) {
    app!.canvas.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }))
  }
}

function key(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

afterEach(() => {
  app?.destroy()
  localStorage.clear()
})

it('hides the key base during a press while keeping the upper edge clickable', () => {
  const app = startGame()
  const action = vi.fn()
  const button = new Button('', 200, 680, 68, 48, action, undefined, true)
  const [base] = button.children
  app.scene.add(button)

  const pointer = (type: string) => {
    app.canvas.dispatchEvent(new PointerEvent(type, {
      clientX: 200, clientY: 658, pointerId: 1, pointerType: 'touch',
    }))
  }

  pointer('pointerdown')
  expect(base.alpha).toBe(0)
  pointer('pointercancel')
  expect(base.alpha).toBe(1)
  expect(action).not.toHaveBeenCalled()

  pointer('pointerdown')
  pointer('pointerup')
  expect(base.alpha).toBe(1)
  expect(action).toHaveBeenCalledOnce()
})

it('uses translucent glass for gameplay panels, input slots and both keyboard rows', async () => {
  const app = startGame()
  void game.begin(1, localDate())
  await vi.waitFor(() => expect(labels(app.scene)).toContain('Цель уровня · 8'))

  const screen = app.scene.children[0]
  const progressPanel = screen.children.find(node => node instanceof RectShape && node.position.y === 62) as RectShape
  const wordList = screen.children.flatMap(node => node.children).find(
    node => node instanceof RectShape && node.interactive && node.width === 368,
  ) as RectShape
  const buttons = screen.children.filter((node): node is Button => node instanceof Button)
  const actionKeys = buttons.filter(button => button.position.y === 660)
  const letterKeys = buttons.filter(button => button.position.y === 598)
  const input = screen.children.find(node => node.children.some(child => child.position.y === 466))!

  expect(screen.children.some(node => node instanceof GameBackdrop)).toBe(true)
  expect(progressPanel).toBeInstanceOf(GlassRect)
  expect(wordList).toBeInstanceOf(GlassRect)
  expect(wordList.parent!.children.some(node => node.isMask)).toBe(false)
  expect(wordList.parent!.children.some(node => node.children.some(child => child.isMask))).toBe(true)
  expect(input.children[0]).toBeInstanceOf(GlassRect)
  expect(actionKeys).toHaveLength(4)
  for (const button of actionKeys.slice(1)) {
    expect(button.bg.fill).toEqual(actionKeys[0].bg.fill)
    expect(button.bg.stroke).toEqual(actionKeys[0].bg.stroke)
  }
  expect(letterKeys).toHaveLength(6)
  for (const button of [...actionKeys, ...letterKeys]) {
    expect(button.bg).toBeInstanceOf(GlassRect)
    expect(button.bg.fill!.toRgb().a).toBeLessThan(1)
  }
  expect(progressPanel.fill!.toRgb().a).toBeLessThan(1)
  expect(wordList.fill!.toRgb().a).toBeLessThan(1)
  expect((input.children[0] as RectShape).fill!.toRgb().a).toBeLessThan(1)
  tap(letterKeys[0].position.x, letterKeys[0].position.y)
  expect(letterKeys[0].bg.fill!.toRgb().a).toBeLessThan(1)
  expect(input.children[0]).toBeInstanceOf(Tile)
  expect(input.children[0].children[0]).toBeInstanceOf(GlassRect)
  expect((input.children[0].children[0] as RectShape).fill!.toRgb().a).toBeLessThan(1)
})

it('loads the daily level, accepts input, resumes, and opens the saved result', async () => {
  startGame()
  void game.begin(1, localDate())
  await vi.waitFor(() => expect(labels(app!.scene)).toContain('Цель уровня · 8'))
  await loadDictionary()
  const date = localDate()
  const { words } = generateLevel(6, new Set(), dailyRandom(date))
  tap(45, 598)
  key('Enter')
  expect(labels(app!.scene)).toContain('Слишком коротко')
  key('Escape')

  for (const word of words.slice(0, 8)) {
    for (const letter of word) key(letter)
    key('Enter')
  }
  expect(labels(app!.scene)).toContain('Дальше')
  expect(loadDaily(date)?.found).toHaveLength(8)
  app!.destroy()
  startGame()
  void game.begin(1, localDate())
  await vi.waitFor(() => expect(labels(app!.scene)).toContain('Дальше'))
  key('Enter')
  expect(result).toMatchObject({ found: 8, total: words.length, awards: expect.arrayContaining(['daily']) })
  markSeen(result!.awards)
  expect(loadDaily(date)?.finished).toBe(true)
  const completed = result
  app!.destroy()
  startGame()
  await game.begin(1, date)
  expect(result).toMatchObject({ found: 8, score: completed!.score, bestCombo: completed!.bestCombo, awards: [] })
})

it('vibrates for touch keys and accepted words with sound off and remembers the vibration setting', async () => {
  const vibrate = vi.fn(() => true)
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate })
  try {
    localStorage.setItem('cynfas-anagram-sound', 'false')
    startGame()
    void game.begin(1, localDate())
    await vi.waitFor(() => expect(labels(app!.scene)).toContain('Цель уровня · 8'))

    tap(45, 598)
    tap(208, 660)
    expect(vibrate.mock.calls).toEqual([[8], [8]])

    const { base } = generateLevel(6, new Set(), dailyRandom(localDate()))
    for (const letter of base) key(letter)
    expect(vibrate).toHaveBeenCalledTimes(2)
    key('Enter')
    expect(vibrate).toHaveBeenCalledTimes(3)

    tap(38, 32)
    game.toggleVibration()
    expect(game.vibration).toBe(false)
    app!.destroy()
    startGame()
    expect(game.vibration).toBe(false)
    void game.begin(1, localDate())
    await vi.waitFor(() => expect(labels(app!.scene)).toContain('Цель уровня · 8'))
    tap(45, 598)
    expect(vibrate).toHaveBeenCalledTimes(3)
  } finally {
    Reflect.deleteProperty(navigator, 'vibrate')
  }
})

it('checks words, charges for hints, and advances a regular run without reusing its base', async () => {
  await loadDictionary()
  const base = generateLevel(5, new Set(), () => 0)
  const alternate = generateLevel(5, new Set([base.base]), () => 0)
  const random = vi.spyOn(Math, 'random').mockReturnValue(0)
  try {
    startGame()
    void game.begin(0)
    await vi.waitFor(() => expect(labels(app!.scene)).toContain('Лёгкая · Ур. 1'))

    const submit = (word: string) => {
      for (const letter of word) key(letter)
      key('Enter')
    }
    submit(base.base)
    expect(labels(app!.scene)).toContain(base.base)
    const score = Number(labels(app!.scene).find(text => /^\d+$/.test(text)))
    submit(base.base)
    expect(labels(app!.scene)).toContain('Уже было')
    tap(124, 674)
    expect(labels(app!.scene)).toContain(String(score - 15))
    key('Escape')

    for (const word of base.words.filter(word => word !== base.base).slice(0, 4)) submit(word)
    expect(labels(app!.scene)).toContain('Дальше')
    key('Enter')
    expect(result?.awards.length).toBeGreaterThan(0)
    expect(loadAchievements().unlocked['no-hints']).toBeUndefined()
    expect(result?.title).toBe('Уровень 1 пройден')
    game.continueLevel()
    expect(labels(app!.scene)).toContain('Лёгкая · Ур. 2')
    submit(alternate.base)
    expect(labels(app!.scene)).toContain(alternate.base)
    expect(labels(app!.scene).some(text => text.startsWith('БАЗА!'))).toBe(true)
  } finally {
    random.mockRestore()
  }
})

it('fills a partial word on hint and awards points for the manually entered letter', async () => {
  const app = startGame()
  void game.begin(1, localDate())
  await vi.waitFor(() => expect(labels(app.scene)).toContain('Цель уровня · 8'))

  tap(124, 674)
  const date = localDate()
  const hint = loadDaily(date)!.hint!
  expect(hint.word.length).toBeGreaterThanOrEqual(5)
  expect(hint.count).toBe(1)
  const input = () => app.scene.children[0].children.flatMap(node => node.children)
    .filter(node => node instanceof Tile && node.position.y === 466).flatMap(labels).join('')
  expect(input()).toBe(hint.word[0])

  for (let count = 2; count < hint.word.length; count++) {
    tap(124, 674)
    expect(loadDaily(date)?.hint?.count).toBe(count)
    expect(input()).toBe(hint.word.slice(0, count))
  }

  tap(124, 674)
  expect(input()).toBe(hint.word.slice(0, -1))
  key('Escape')
  tap(124, 674)
  expect(input()).toBe(hint.word[0])
  for (let count = 2; count < hint.word.length; count++) tap(124, 674)
  key(hint.word.slice(-1))
  key('Enter')
  expect(loadDaily(date)?.found).toContain(hint.word)
  expect(loadDaily(date)?.hintUsed).toBe(true)
  expect(loadDaily(date)?.score).toBeGreaterThan(0)
  expect(loadDaily(date)?.score).toBeLessThan(10 * (hint.word.length - 2))
})

it('places the goal beneath the level title and fits the progress card to its rows', async () => {
  await loadDictionary()
  const random = vi.spyOn(Math, 'random').mockReturnValue(0)
  try {
    const { words } = generateLevel(5, new Set(), () => 0)
    const rowCount = new Set(words.map(word => word.length)).size
    const app = startGame()
    void game.begin(0)
    await vi.waitFor(() => expect(labels(app.scene)).toContain('Цель уровня · 5'))

    const screen = app.scene.children[0]
    const title = screen.children.find(node => node instanceof TextShape && node.text === 'Лёгкая · Ур. 1')!
    const goal = screen.children.find(node => node instanceof TextShape && node.text === 'Цель уровня · 5')!
    expect(goal.position.x).toBe(title.position.x)
    expect(goal.position.y).toBeGreaterThan(title.position.y)
    const score = screen.children.find(node => node instanceof Counter && node.value.text === '0') as Counter
    const back = screen.children.find(node => node instanceof Button && node.position.x === 38)!
    expect(score.position.y).toBe(back.position.y)
    const card = screen.children.find(node => node instanceof RectShape && node.width === 368) as RectShape
    const list = screen.children.find(node => node.children.some(child =>
      child instanceof RectShape && child.width === 368 && child.interactive))!
    const listBackground = list.children[0] as RectShape
    expect(goal.position.y).toBeLessThan(card.position.y)
    expect(card.height).toBe(16 + rowCount * 24)
    expect(list.position.y - (card.position.y + card.height)).toBe(12)
    expect(list.position.y + listBackground.height).toBe(424)
  } finally {
    random.mockRestore()
  }
})

it('keeps the menu dark even if a light theme was saved', () => {
  localStorage.setItem('cynfas-anagram-theme', JSON.stringify('light'))
  startGame()
  expect(document.documentElement.style.getPropertyValue('--game-glow')).toBe('#422937')
})

it('uses distinct palettes for each mode and shows snow only in festive levels', async () => {
  const app = startGame()
  const background = () => document.documentElement.style.backgroundColor
  const menu = background()
  const gameBackgrounds = new Set<string>()
  for (const [difficulty, date, themedMode, heading] of [
    [0, '', undefined, /^Лёгкая · Ур\. 1$/],
    [1, '', undefined, /^Средняя · Ур\. 1$/],
    [2, '', undefined, /^Сложная · Ур\. 1$/],
    [1, '', THEMED_MODES[0], /^Новый год · Ур\. 1$/],
    [1, localDate(), undefined, /^Слово дня #/],
  ] as const) {
    void game.begin(difficulty, date, themedMode)
    await vi.waitFor(() => expect(labels(app.scene)).toEqual(expect.arrayContaining([expect.stringMatching(heading)])))
    expect(background()).not.toBe(menu)
    gameBackgrounds.add(background())
    expect(labels(app.scene).includes('❄')).toBe(Boolean(themedMode))
    tap(38, 32)
    expect(labels(app.scene)).toEqual([])
    expect(background()).toBe(menu)
  }
  expect(gameBackgrounds.size).toBe(5)
})

it('plays festive levels from the menu and stores a separate record', async () => {
  const app = startGame()
  const originalBackground = document.documentElement.style.backgroundColor
  void game.begin(1, '', THEMED_MODES[0])
  await vi.waitFor(() => expect(labels(app.scene)).toContain('Новый год · Ур. 1'))
  expect(document.documentElement.style.backgroundColor).not.toBe(originalBackground)
  const snow = app.scene.children[0].children.find(node => labels(node).includes('❄'))!
  const flake = snow.children[0]
  const initialY = flake.position.y
  vi.spyOn(app, 'render').mockImplementation(() => {})
  app.loop.step(100)
  expect(flake.position.y).toBeGreaterThan(initialY)

  const festiveWords = ['ПОДАРОК', 'СНЕЖИНКА', 'ГИРЛЯНДА', 'СНЕГОВИК', 'СНЕГОПАД', 'СУГРОБ']
  const letters = () => app.scene.children[0].children
    .filter(node => node instanceof Button && node.position.y === 598)
    .map(node => (node as Button).label.text).sort().join('')
  const first = festiveWords.find(word => [...word].sort().join('') === letters())
  expect(first).toBeDefined()

  for (const letter of first!) key(letter)
  key('Enter')
  expect(Number(localStorage.getItem('cynfas-anagram-new-year-best'))).toBeGreaterThan(0)
  expect(localStorage.getItem('cynfas-anagram-best')).toBeNull()
  expect(loadDaily(localDate())).toBeUndefined()

  const played = new Set<string>()
  for (let level = 1; level <= festiveWords.length; level++) {
    const base = festiveWords.find(word => [...word].sort().join('') === letters())!
    expect(played.has(base)).toBe(false)
    played.add(base)
    const words = levelFromWord(base).words
    expect(words).toContain(base)
    expect(words.length).toBeGreaterThanOrEqual(8)
    for (const word of words.filter(word => level !== 1 || word !== first).slice(0, 8)) {
      for (const letter of word) key(letter)
      key('Enter')
    }
    key('Enter')
    if (level === 1) expect(result?.awards).toContain('themed')
    markSeen(result!.awards)
    game.continueLevel()
    expect(labels(app.scene)).toContain(`Новый год · Ур. ${level + 1}`)
    expect(letters()).not.toBe([...base].sort().join(''))
  }

  tap(38, 32)
  expect(labels(app.scene)).toEqual([])
  expect(labels(app.scene)).not.toContain('❄')
  expect(document.documentElement.style.backgroundColor).toBe(originalBackground)
})

it.each([
  [THEMED_MODES[1], ['ПЛАНЕТА', 'КОМЕТА', 'РАКЕТА', 'ОРБИТА', 'СКАФАНДР', 'АСТЕРОИД']],
  [THEMED_MODES[2], ['МАТРОС', 'КАПИТАН', 'ЛАГУНА', 'ОСТРОВ', 'МЕДУЗА', 'ОСЬМИНОГ']],
  [THEMED_MODES[3], ['МУРАВЕЙ', 'ВОРОБЕЙ', 'МАЛИНА', 'ВЕРЕСК', 'КАШТАН', 'ЧЕРНИКА']],
  [THEMED_MODES[4], ['АПЕЛЬСИН', 'ВАТРУШКА', 'КОТЛЕТА', 'МАРМЕЛАД', 'ШОКОЛАД', 'КАПУСТА']],
  [THEMED_MODES[5], ['ТРОМБОН', 'СКРИПКА', 'ГАРМОНЬ', 'КОНЦЕРТ', 'АККОРД', 'СОНАТА']],
] as const)('plays the $0.label theme and saves its record', async (mode, bases) => {
  const app = startGame()
  const { label: title, bestKey: record } = mode
  void game.begin(1, '', mode)
  await vi.waitFor(() => expect(labels(app.scene)).toContain(`${title} · Ур. 1`))

  const letters = app.scene.children[0].children
    .filter(node => node instanceof Button && node.position.y === 598)
    .map(node => (node as Button).label.text).sort().join('')
  const base = bases.find(word => [...word].sort().join('') === letters)
  expect(base).toBeDefined()
  for (const word of levelFromWord(base!).words.slice(0, 8)) {
    for (const letter of word) key(letter)
    key('Enter')
  }
  expect(Number(localStorage.getItem(record))).toBeGreaterThan(0)
  expect(localStorage.getItem('cynfas-anagram-new-year-best')).toBeNull()
  expect(localStorage.getItem('cynfas-anagram-best')).toBeNull()
  key('Enter')
  expect(result?.awards).toContain('themed')
  game.continueLevel()
  expect(labels(app.scene)).toContain(`${title} · Ур. 2`)
})
