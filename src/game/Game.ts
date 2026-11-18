import { loadAchievements, onLevelComplete, onWord, unseen, unlock, type AchievementId } from './achievements'
import { Application, Easing, MaskNode, Object2D, RectShape, type KeyboardEventData, type TextShape } from '@cynfas/core'
import { activeStreak, completeDaily, dailyNumber, dailyRandom, loadDaily, loadDailyBest, loadStreak, localDate, saveDaily } from './daily'
import { Effects } from './fx'
import { GameBackdrop, GlassRect } from './glass'
import { COMBO_MS, COMBO_MULTIPLIERS, readStorage, wordPoints, writeStorage } from './rules'
import { gridRows, resultStars } from './share'
import { encodeSeed, resolveSeed, seededLayout, themeMode } from './seed'
import { loadLevel, saveLevel } from './session'
import type { PlayerResult } from './result'
import { type IconName } from './icons'
import { GameSound } from './sound'
import { applyTheme, theme } from './theme'
import { blockRadius, Button, Counter, glassSurface, label, LengthProgress, LetterKey, panel, Tile, WordChip } from './ui'
import { DIFFICULTIES, THEMED_MODES, generateLevel, levelFromWord, loadDictionary, normalize, shuffled, type Level } from './words'

export const DESIGN = { width: 400, height: 720 }

const BASE_INPUT_Y = 466
const BASE_KEYS_Y = 598
const BASE_ACTION_KEYS_Y = 660
const ACTION_KEY_HEIGHT = 48
const KEY_INSET = 16
const KEY_GAP = 6
const KEYBOARD_WIDTH = DESIGN.width - 2 * KEY_INSET
const PROGRESS_Y = 62
const PROGRESS_PADDING = 8
const PROGRESS_ROW_HEIGHT = 24
const BASE_LIST_BOTTOM = 424
export const BEST_KEY = 'cynfas-anagram-best'
const VIBRATION_KEY = 'cynfas-anagram-vibration'

type ThemedMode = typeof THEMED_MODES[number]

interface Hint { word: string; count: number }

export class AnagramGame {
  private readonly sound = new GameSound()
  private vibrationEnabled = readStorage(VIBRATION_KEY, true)
  private readonly used = DIFFICULTIES.map(() => new Set<string>())
  private screen = new Object2D()
  private fx!: Effects
  private mode: 'menu' | 'loading' | 'play' | 'result' = 'menu'
  private loadingRequest = 0
  private difficulty = 0
  private levelNumber = 0
  private date = ''
  private themedMode?: ThemedMode
  private themedQueue: string[] = []
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private particles?: Object2D
  private particleTime = 0
  private level!: Level
  private valid = new Set<string>()
  private golden = new Set<string>()
  private found = new Set<string>()
  private score = 0
  private hint?: Hint
  private hintUsed = false
  private levelScore = 0
  private recordBeforeLevel = 0
  private awardIds = new Set<AchievementId>()
  private bestCombo = 1
  private code = ''
  private letters: string[] = []
  private friend?: PlayerResult['friend']
  private comboIndex = 0
  private comboUntil = 0
  private pool: LetterKey[] = []
  private input: LetterKey[] = []
  private hintedTiles = new Set<LetterKey>()
  private tileWidth = 0
  private inputLayer!: Object2D
  private chipList!: Object2D
  private listY = 0
  /** Design height actually visible; the space beyond DESIGN.height goes to the word list. */
  private height = DESIGN.height
  private get stretch(): number { return this.height - DESIGN.height }
  private get inputY(): number { return BASE_INPUT_Y + this.stretch }
  private get keysY(): number { return BASE_KEYS_Y + this.stretch }
  private get actionKeysY(): number { return BASE_ACTION_KEYS_Y + this.stretch }
  private get listBottom(): number { return BASE_LIST_BOTTOM + this.stretch }
  private get listHeight(): number { return this.listBottom - this.listY }
  private chips = new Map<string, WordChip>()
  private progress = new Map<number, LengthProgress>()
  private scroll = 0
  private scrollMax = 0
  private message!: TextShape
  private scoreLabel!: Counter
  private streakLabel?: Counter
  private comboLabel!: TextShape
  private comboBar!: RectShape
  private enter!: Button
  private hold?: ReturnType<typeof setTimeout>
  private holdPointer?: number
  private clockSecond = -1

  constructor(
    private readonly app: Application,
    private readonly onMenu: () => void,
    private readonly onResult: (result?: PlayerResult) => void = () => {},
    private readonly onLevel: (code: string) => void = () => {},
  ) {
    app.keyboard.on('keydown', event => this.onKey(event))
    app.scene.on('pointerdown', () => this.sound.unlock())
    app.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    app.onTick(dt => this.tick(dt))
  }

  leave(): void {
    this.loadingRequest++
    this.themedMode = undefined
    this.resetScreen('menu')
    applyTheme('menu')
    this.app.stop()
  }

  /** Sets the visible design height (at least DESIGN.height) and lays the level out again if it changed. */
  setHeight(height: number): void {
    height = Math.max(DESIGN.height, Math.floor(height))
    if (height === this.height) return
    this.height = height
    if (this.mode === 'play') this.showLevel()
  }

  get soundEnabled(): boolean { return this.sound.enabled }
  get vibration(): boolean { return this.vibrationEnabled }

  toggleSound(): void { this.sound.toggle() }

  toggleVibration(): void {
    this.vibrationEnabled = !this.vibrationEnabled
    writeStorage(VIBRATION_KEY, this.vibrationEnabled)
  }

  playAchievementSound(): void {
    this.sound.play([523, 659, 784, 1047, 1319])
    this.vibrate([20, 60, 20, 60, 40])
  }

  private resetScreen(mode: typeof this.mode): void {
    this.cancelHold()
    if (mode !== 'result') this.onResult()
    this.screen.dispose()
    this.mode = mode
    this.screen = new Object2D()
    this.app.scene.add(this.screen)
    if (mode === 'play' || mode === 'result') this.screen.add(new GameBackdrop({ zIndex: -2 }))
    this.particles = undefined
    this.particleTime = 0
    if (this.themedMode) {
      const particles = new Object2D({ zIndex: -1, interactiveChildren: false, alpha: 0.24 })
      for (let index = 0; index < 28; index++) {
        const x = 7 + index * 137 % 386
        const y = 11 + index * 103 % (this.height - 25)
        particles.add(label(index % 3 === 0 ? this.themedMode.particle : '·', x, y, 10 + index % 8, theme.muted))
      }
      this.particles = particles
      this.screen.add(particles)
    }
    const overlay = new Object2D({ zIndex: 10, interactiveChildren: false })
    this.screen.add(overlay)
    this.fx = new Effects(this.app.tweens, overlay)
    this.streakLabel = undefined
    this.clockSecond = -1
  }

  private button(text: string, x: number, y: number, width: number, height: number, action?: () => void, color?: string, keycap = false): Button {
    const glass = this.mode === 'play'
    const button = new Button(text, x, y, width, height, action, color, keycap, glass)
    this.screen.add(button)
    if (keycap) this.addKeyVibration(button)
    if (!keycap) button.on('pointerdown', () => this.fx.pulse(button, 0.95, 120))
    return button
  }

  private iconButton(icon: IconName, x: number, y: number, width: number, height: number, action?: () => void, keycap = false): Button {
    const button = this.button('', x, y, width, height, action, theme.buttonSecondary, keycap)
    button.setIcon(icon)
    return button
  }

  private soundButton(): void {
    const icon = () => this.sound.enabled ? 'soundOn' : 'soundOff'
    const button = this.iconButton(icon(), 360, 32, 48, 44, () => {
      this.sound.toggle()
      button.setIcon(icon())
    })
  }

  private vibrate(pattern: number | number[]): void {
    if (this.vibrationEnabled) navigator.vibrate?.(pattern)
  }

  private addKeyVibration(key: Button): void {
    key.on('pointerup', event => {
      if (event.originalEvent.pointerType === 'touch' && !event.cancelled && key.containsPoint(event.world)) {
        this.vibrate(8)
      }
    })
  }

  /** Starts a run; with `code` it opens that level and restores its saved progress. */
  async begin(difficulty: number, date = '', themedMode?: ThemedMode, code?: string): Promise<void> {
    this.themedMode = undefined
    this.resetScreen('loading')
    const request = ++this.loadingRequest
    this.screen.add(label('Загружаем словарь…', 200, 340 + this.stretch / 2))
    try {
      await loadDictionary()
      if (request !== this.loadingRequest) return
      const level = code && !date ? resolveSeed(code)?.level : undefined
      const challenge = level && { level, code: code! }
      this.date = date
      this.themedMode = themedMode
      this.themedQueue = themedMode ? shuffled(themedMode.words.filter(word => word !== challenge?.level.base)) : []
      this.difficulty = difficulty
      applyTheme(themedMode?.palette ?? (date ? 'daily' : this.settings.length))
      this.levelNumber = 0
      this.score = 0
      this.friend = undefined
      this.nextLevel(challenge)
    } catch {
      if (request !== this.loadingRequest) return
      this.resetScreen('loading')
      this.screen.add(label('Не удалось загрузить уровень', 200, 330 + this.stretch / 2))
      this.button('Вернуться', 200, 390 + this.stretch / 2, 200, 50, () => this.onMenu())
    }
  }

  private get settings() { return DIFFICULTIES[this.difficulty] }
  private get goal(): number { return Math.min(this.settings.goal, this.level.words.length) }
  private get canAdvance(): boolean { return this.found.size >= this.goal }
  private get perfect(): boolean { return this.found.size === this.level.words.length }

  goToMenu(): void { this.onMenu() }

  continueLevel(): void {
    if (this.mode !== 'result' || this.date) return
    this.friend = undefined
    this.nextLevel()
  }

  celebrateStar(index: number): void {
    if (this.mode !== 'result') return
    this.sound.play([[523, 659, 784][index]])
    this.fx.burst(200, 142, true)
  }

  private nextLevel(challenge?: { level: Level; code: string }): void {
    this.levelNumber++
    const rng = this.date ? dailyRandom(this.date) : undefined
    const used = this.date ? new Set<string>() : this.used[this.difficulty]
    if (challenge) {
      this.level = challenge.level
      if (!this.themedMode) used.add(this.level.base)
    } else if (this.themedMode) {
      if (!this.themedQueue.length) {
        this.themedQueue = shuffled(this.themedMode.words)
        if (this.themedQueue[0] === this.level.base) {
          this.themedQueue.push(this.themedQueue.shift()!)
        }
      }
      this.level = levelFromWord(this.themedQueue.shift()!)
    } else {
      this.level = generateLevel(this.settings.length, used, rng, this.date ? undefined : this.level?.base)
      used.add(this.level.base)
    }
    this.valid = new Set(this.level.words)
    this.code = challenge?.code ?? encodeSeed(this.date ? { day: dailyNumber(this.date) } : {
      mode: this.themedMode ? themeMode(this.themedMode.palette) : this.difficulty, base: this.level.base,
    })
    const layout = seededLayout(this.level, this.code, rng)
    this.golden = new Set(layout.golden)
    this.letters = layout.letters
    const session = !this.date && challenge ? loadLevel(this.code) : undefined
    const saved = this.date ? loadDaily(this.date) : session
    if (session) {
      this.levelNumber = session.levelNumber
      this.friend = session.friend
    }
    this.found = new Set(saved?.found.filter(word => this.valid.has(word)))
    this.score = saved?.score ?? this.score
    this.levelScore = session ? session.levelScore : saved?.score ?? 0
    this.bestCombo = saved?.bestCombo ?? 1
    this.awardIds = new Set(saved?.awards)
    this.recordBeforeLevel = saved?.recordBeforeLevel ?? this.bestScore()
    this.hint = saved?.hint && this.valid.has(saved.hint.word) && !this.found.has(saved.hint.word) ? saved.hint : undefined
    this.hintUsed = saved?.hintUsed ?? Boolean(saved?.hint?.count)
    this.comboIndex = saved?.comboIndex ?? 0
    this.comboUntil = saved?.comboUntil ?? 0
    if (this.date && this.canAdvance) completeDaily(this.date)
    if (!this.date) this.saveProgress(Boolean(saved?.finished))
    if (saved?.finished && this.canAdvance) {
      this.showResult()
      return
    }
    this.showLevel()
  }

  private showLevel(): void {
    this.resetScreen('play')
    const modeLabel = this.themedMode?.label ?? this.settings.label
    const heading = this.date ? `Слово дня #${dailyNumber(this.date)}` : `${modeLabel} · Ур. ${this.levelNumber}`
    const headerCenterY = 32
    this.iconButton('back', 38, headerCenterY, 44, 44, () => this.onMenu())
    this.soundButton()
    const title = label(heading, 67, 22, 16)
    title.material.textAlign = 'left'
    this.scoreLabel = new Counter('star', 325, headerCenterY, 16, 'right')
    const lengths = [...new Set(this.level.words.map(word => word.length))].sort((a, b) => a - b)
    const cardHeight = 2 * PROGRESS_PADDING + lengths.length * PROGRESS_ROW_HEIGHT
    this.listY = PROGRESS_Y + cardHeight + 12
    this.streakLabel = new Counter('streak', 325, 50, 13, 'right', theme.accent)
    const goal = label(`Цель уровня · ${this.goal}`, title.position.x, 42, 13, theme.accent)
    goal.material.textAlign = 'left'
    this.screen.add(title, goal, this.scoreLabel, this.streakLabel, panel(16, PROGRESS_Y, 368, cardHeight, 18, true))
    this.updateScore()
    this.updateStreak()

    this.progress.clear()
    for (const length of lengths) {
      const y = PROGRESS_Y + PROGRESS_PADDING + (this.progress.size + 0.5) * PROGRESS_ROW_HEIGHT
      const row = new LengthProgress(length, this.level.words.filter(word => word.length === length).length, y)
      this.progress.set(length, row)
      this.screen.add(row)
      this.updateProgress(length)
    }

    this.createWordList()
    this.input = []
    this.hintedTiles.clear()
    this.tileWidth = (368 - 6 * (this.level.base.length - 1)) / this.level.base.length
    this.inputLayer = new Object2D()
    this.message = label('', 200, 518 + this.stretch, 18, theme.muted)
    this.comboBar = new RectShape(0, 4, { position: { x: 16, y: 548 + this.stretch }, borderRadius: 2, fill: theme.hint })
    this.comboLabel = label('', 384, 550 + this.stretch, 16, theme.hint)
    this.comboLabel.material.textAlign = 'right'
    this.screen.add(this.inputLayer, this.message, this.comboBar, this.comboLabel)
    this.pool = this.letters.map((letter, index) => {
      const tile = new LetterKey(letter, this.letterKeyX(index), this.keysY, this.letterKeyWidth)
      this.addKeyVibration(tile)
      tile.on('pointerdown', () => {
        this.sound.unlock()
        this.addLetter(tile)
      })
      this.screen.add(tile)
      return tile
    })
    const actionWidth = 72
    const actionStep = actionWidth + KEY_GAP
    const firstActionX = KEY_INSET + actionWidth / 2
    this.iconButton('shuffle', firstActionX, this.actionKeysY, actionWidth, ACTION_KEY_HEIGHT, () => this.shuffle(), true)
    this.iconButton('hint', firstActionX + actionStep, this.actionKeysY, actionWidth, ACTION_KEY_HEIGHT, () => this.giveHint(), true)
    const erase = this.iconButton('erase', firstActionX + 2 * actionStep, this.actionKeysY, actionWidth, ACTION_KEY_HEIGHT, undefined, true)
    erase.on('pointerdown', event => {
      this.cancelHold()
      this.holdPointer = event.originalEvent.pointerId
      this.hold = setTimeout(() => {
        this.hold = undefined
        this.removeFrom(0)
      }, 450)
    })
    erase.on('pointerup', event => {
      if (this.holdPointer !== event.originalEvent.pointerId) return
      const short = this.hold !== undefined
      this.cancelHold()
      if (short && !event.cancelled && erase.containsPoint(event.world)) this.removeFrom(this.input.length - 1)
    })
    const enterWidth = KEYBOARD_WIDTH - 3 * actionStep
    this.enter = this.button('', DESIGN.width - KEY_INSET - enterWidth / 2, this.actionKeysY, enterWidth, ACTION_KEY_HEIGHT, () => this.submit(), theme.buttonSecondary, true)
    this.enter.label.material.fontWeight = 750
    if (this.hint) this.fillHint(this.hint)
    this.drawInput()
    this.updateEnter()
    this.onLevel(this.code)
  }

  private createWordList(): void {
    this.chips.clear()
    this.scroll = 0
    const list = new Object2D({ position: { x: 16, y: this.listY } })
    const background = panel(0, 0, 368, this.listHeight, 18, true)
    background.interactive = true
    this.chipList = new Object2D({ interactiveChildren: false })
    const clip = new Object2D({ interactiveChildren: false })
    clip.add(this.chipList, new MaskNode(new RectShape(background.width, background.height, { borderRadius: background.borderRadius })))
    list.add(background, clip)
    this.screen.add(list)
    let drag: { id: number; y: number } | undefined
    list.on('pointerdown', event => { drag = { id: event.originalEvent.pointerId, y: event.world.y } })
    list.on('pointermove', event => {
      if (drag?.id !== event.originalEvent.pointerId) return
      this.setScroll(this.scroll + drag.y - event.world.y)
      drag.y = event.world.y
    })
    list.on('pointerup', event => {
      if (drag?.id === event.originalEvent.pointerId) drag = undefined
    })
    let index = 0
    for (const word of this.found) {
      this.chips.set(word, new WordChip(word, index++ >= this.goal, this.golden.has(word)))
    }
    this.layoutChips()
  }

  private layoutChips(): void {
    let x = 8
    let y = 8
    for (const chip of [...this.chips.values()].reverse()) {
      if (x + chip.width > 360) { x = 8; y += 40 }
      chip.position.set(x, y)
      if (!chip.parent) this.chipList.add(chip)
      x += chip.width + 6
    }
    this.scrollMax = Math.max(0, y + 40 - this.listHeight)
    this.setScroll(this.scroll)
  }

  private setScroll(value: number): void {
    this.scroll = Math.max(0, Math.min(this.scrollMax, value))
    this.chipList.position.y = -this.scroll
  }

  private onWheel = (event: WheelEvent): void => {
    if (this.mode !== 'play') return
    const bounds = this.app.canvas.getBoundingClientRect()
    const screen = this.app.viewport.screenToWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
    if (screen.x < 16 || screen.x > 384 || screen.y < this.listY || screen.y > this.listBottom) return
    event.preventDefault()
    const delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaMode === 2 ? event.deltaY * this.listHeight : event.deltaY / this.app.viewport.zoom
    this.setScroll(this.scroll + delta)
  }

  private tileX(index: number): number {
    return 16 + this.tileWidth / 2 + index * (this.tileWidth + 6)
  }

  private get letterKeyWidth(): number {
    const count = this.level.base.length
    return (KEYBOARD_WIDTH - KEY_GAP * (count - 1)) / count
  }

  private letterKeyX(index: number): number {
    const width = this.letterKeyWidth
    return KEY_INSET + width / 2 + index * (width + KEY_GAP)
  }

  private drawInput(): void {
    for (const node of [...this.inputLayer.children]) node.dispose()
    for (let index = 0; index < this.pool.length; index++) {
      const tile = this.input[index]
      const x = this.tileX(index)
      if (tile) {
        const node = new Tile(tile.letter, this.tileWidth, 52)
        node.position.set(x, this.inputY)
        node.on('pointerdown', () => this.removeFrom(index))
        this.inputLayer.add(node)
      } else {
        this.inputLayer.add(new GlassRect(this.tileWidth, 52, {
          pivot: 0.5, position: { x, y: this.inputY }, borderRadius: blockRadius, ...glassSurface(theme.slot),
        }))
      }
    }
    for (const tile of this.pool) tile.setUsed(this.input.includes(tile))
  }

  private addLetter(tile: LetterKey): void {
    if (this.input.includes(tile)) return
    const x = this.tileX(this.input.length)
    this.input.push(tile)
    this.drawInput()
    this.fx.pulse(tile)
    this.fx.fly(label(tile.letter, 0, 0, 22, theme.hint), tile.position.x, this.keysY, x, this.inputY)
    this.sound.play([380 + this.input.length * 65], { duration: 0.065 })
    this.updateEnter()
  }

  private removeFrom(index: number, animate = true): void {
    if (index < 0 || index >= this.input.length) return
    const removed = this.input.splice(index)
    for (const tile of removed) this.hintedTiles.delete(tile)
    this.drawInput()
    if (animate) {
      removed.forEach((tile, offset) => this.fx.fly(label(tile.letter, 0, 0, 22, theme.hint),
        this.tileX(index + offset), this.inputY, this.letterKeyX(this.pool.indexOf(tile)), this.keysY))
      this.sound.play([190], { duration: 0.085 })
    }
    this.updateEnter()
  }

  private cancelHold(): void {
    clearTimeout(this.hold)
    this.hold = undefined
    this.holdPointer = undefined
  }

  private shuffle(): void {
    let next = shuffled(this.pool)
    if (next.every((tile, i) => tile === this.pool[i])) next = [...next.slice(1), next[0]]
    this.pool = next
    this.pool.forEach((tile, i) => this.app.tweens.to(tile, { 'position.x': this.letterKeyX(i) }, {
      duration: this.fx.duration(220), delay: this.fx.duration(i * 12), easing: Easing.backOut,
    }))
    this.sound.play([270, 310, 240], { duration: 0.06, volume: 0.025, type: 'triangle' })
  }

  private submit(): void {
    if (this.canAdvance && !this.input.length) {
      this.saveProgress(true)
      this.showResult()
      return
    }
    const word = this.input.map(tile => tile.letter).join('')
    if (word.length < 3) return this.feedback('Слишком коротко', theme.hint)
    if (!this.valid.has(word)) {
      const ghost = new Object2D()
      this.input.forEach((tile, i) => ghost.add(label(tile.letter, this.tileX(i), this.inputY, 27, theme.wrong)))
      this.fx.shake(ghost)
      this.removeFrom(0, false)
      this.sound.play([85], { duration: 0.19, type: 'triangle' })
      return this.feedback('Нет такого слова', theme.wrong)
    }
    const existing = this.chips.get(word)
    if (existing) {
      if (existing.position.y < this.scroll || existing.position.y + 32 > this.scroll + this.listHeight) {
        this.setScroll(existing.position.y - 8)
      }
      this.fx.pulse(existing, 1.12)
      this.removeFrom(0, false)
      return this.feedback('Уже было', theme.hint)
    }
    this.acceptWord(word)
  }

  private acceptWord(word: string): void {
    const now = Date.now()
    this.comboIndex = now < this.comboUntil ? Math.min(this.comboIndex + 1, 3) : 0
    this.comboUntil = now + COMBO_MS
    const bonus = this.canAdvance
    const golden = this.golden.has(word)
    const base = word === this.level.base
    const special = base || word.length >= 6
    const typedLetters = word.length - this.hintedTiles.size
    const fullPoints = wordPoints(word.length, base, golden, bonus, COMBO_MULTIPLIERS[this.comboIndex])
    const points = Math.floor(fullPoints * typedLetters / word.length)
    this.found.add(word)
    if (this.hint?.word === word) this.hint = undefined
    const earned = points + (this.perfect ? 100 : 0)
    this.score += earned
    this.levelScore += earned
    this.bestCombo = Math.max(this.bestCombo, COMBO_MULTIPLIERS[this.comboIndex])
    this.updateScore()
    this.updateBest()
    const playedAt = new Date(now)
    const date = localDate(playedAt)
    const achievements = loadAchievements(date)
    const ids = onWord(achievements, {
      length: word.length, golden, base, combo: COMBO_MULTIPLIERS[this.comboIndex],
      hour: playedAt.getHours(), score: this.score, perfect: this.perfect,
    })
    const difficultyCount = achievements.difficulties.length
    if (!bonus && this.canAdvance) {
      const streak = this.date ? completeDaily(this.date).current : 0
      if (this.date) this.updateStreak()
      ids.push(...onLevelComplete(achievements, {
        difficulty: this.difficulty, daily: Boolean(this.date), themed: Boolean(this.themedMode),
        hintUsed: this.hintUsed, streak,
      }))
    }
    ids.forEach(id => { if (!achievements.unlocked[id]) this.awardIds.add(id) })
    unlock(achievements, ids, date, achievements.difficulties.length !== difficultyCount)
    this.saveProgress()

    this.input.forEach((tile, index) => {
      const node = label(tile.letter, this.tileX(index), this.inputY, 25, theme.correct)
      const animation = new Object2D()
      animation.add(node)
      this.fx.fly(animation, 0, 0, 0, -32, 8 + index * 4)
    })
    this.removeFrom(0, false)
    const chip = new WordChip(word, bonus, golden)
    this.chips.set(word, chip)
    this.layoutChips()
    this.setScroll(0)
    this.app.tweens.from(chip, { alpha: 0 }, { duration: this.fx.duration(260) })
    this.fx.fly(new WordChip(word, bonus, golden), 200 - chip.width / 2, this.inputY - 16,
      16 + chip.position.x, this.listY + chip.position.y)
    this.fx.flash(this.updateProgress(word.length))
    this.fx.points(`+${points}`, golden ? theme.hint : theme.correct)
    if (golden || special) this.fx.burst(200, this.inputY, golden)
    this.vibrate(special ? [10, 40, 10] : 10)
    this.sound.play(special || golden ? [523, 659, 784, 1047] : [440, 554, 659])
    this.feedback(this.perfect ? 'Идеально! +100' : base ? `БАЗА! +${points}`
      : special ? `ОГО! +${points}` : golden ? `Золотое слово! +${points}` : `+${points}`, golden ? theme.hint : theme.correct)
    if (!bonus && this.canAdvance) {
      for (const row of this.progress.values()) this.fx.flash(row)
      this.app.tweens.from(this.enter.label, { 'position.y': 20 }, { duration: this.fx.duration(280), easing: Easing.backOut })
      this.sound.play([523, 659, 784, 1047], { step: 0.07 })
    }
  }

  private updateProgress(length: number): Object2D {
    return this.progress.get(length)!.update([...this.found]
      .filter(word => word.length === length).map(word => this.golden.has(word)))
  }

  private giveHint(): void {
    if (!this.hint) {
      const remaining = this.level.words.filter(word => !this.found.has(word))
      if (!remaining.length) return
      const longEnough = remaining.filter(word => word.length >= 5)
      const candidates = longEnough.length ? longEnough : remaining
      const length = longEnough.length ? Math.min(...candidates.map(word => word.length))
        : Math.max(...candidates.map(word => word.length))
      const options = candidates.filter(word => word.length === length)
      this.hint = { word: options[Math.floor(Math.random() * options.length)], count: 0 }
    }
    const limit = this.hint.word.length - 1
    const entered = this.input.map(tile => tile.letter).join('')
    if (this.hint.count < limit && entered.startsWith(this.hint.word.slice(0, this.hint.count))) {
      if (this.hint.count === 0) {
        this.score = Math.max(0, this.score - 15)
        this.levelScore = Math.max(0, this.levelScore - 15)
        this.updateScore()
      }
      this.hint.count++
      this.hintUsed = true
    }
    if (this.fillHint(this.hint, 1)) this.hintUsed = true
    this.saveProgress()
    this.drawInput()
    this.updateEnter()
    this.feedback('', theme.hint)
  }

  private fillHint({ word, count }: Hint, maxAdded = count): boolean {
    const prefix = word.slice(0, Math.min(count, word.length - 1))
    let matched = 0
    while (matched < prefix.length && this.input[matched]?.letter === prefix[matched]) matched++
    if (matched === prefix.length) return false
    this.removeFrom(matched, false)
    for (const letter of prefix.slice(matched, matched + maxAdded)) {
      const tile = this.pool.find(tile => tile.letter === letter && !this.input.includes(tile))!
      this.input.push(tile)
      this.hintedTiles.add(tile)
    }
    return true
  }

  private feedback(text: string, color: string): void {
    this.message.text = text
    this.message.fill = color
  }

  private updateScore(): void { this.scoreLabel.update(String(this.score)) }

  private updateStreak(): void {
    const streak = activeStreak(loadStreak(), localDate())
    this.streakLabel?.update(streak ? String(streak) : '')
  }

  private updateEnter(): void {
    const next = this.canAdvance && !this.input.length
    this.enter.label.text = next ? 'Дальше' : 'Ввод'
    this.enter.setIcon(next ? 'arrow' : 'check')
  }

  private bestScore(): number {
    if (this.date) return loadDailyBest()
    if (this.themedMode) return readStorage(this.themedMode.bestKey, 0)
    const best = readStorage<Record<string, number> | number>(BEST_KEY, {})
    return typeof best === 'number' ? (this.settings.length === 5 ? best : 0) : best[this.settings.length] ?? 0
  }

  private updateBest(): void {
    if (this.date) return
    if (this.themedMode) {
      const { bestKey } = this.themedMode
      if (this.score > readStorage(bestKey, 0)) writeStorage(bestKey, this.score)
      return
    }
    const old = readStorage<Record<string, number> | number>(BEST_KEY, {})
    const best = typeof old === 'number' ? { '5': old } as Record<string, number> : old
    if (this.score > (best[this.settings.length] ?? 0)) {
      best[this.settings.length] = this.score
      writeStorage(BEST_KEY, best)
    }
  }

  private saveProgress(finished = false): void {
    if (!this.date) {
      saveLevel({
        code: this.code, levelNumber: this.levelNumber, score: this.score, levelScore: this.levelScore,
        found: [...this.found], finished, hint: this.hint, hintUsed: this.hintUsed,
        comboIndex: this.comboIndex, comboUntil: this.comboUntil, bestCombo: this.bestCombo,
        awards: [...this.awardIds], recordBeforeLevel: this.recordBeforeLevel, friend: this.friend,
      })
      return
    }
    saveDaily({
      date: this.date, found: [...this.found], score: this.score, finished, hint: this.hint, hintUsed: this.hintUsed,
      comboIndex: this.comboIndex, comboUntil: this.comboUntil,
      bestCombo: this.bestCombo, awards: [...this.awardIds], recordBeforeLevel: this.recordBeforeLevel,
    })
  }

  private showResult(): void {
    this.resetScreen('result')
    const { words } = this.level
    const found = [...this.found]
    const issue = this.date ? dailyNumber(this.date) : undefined
    const modeLabel = issue ? `Слово дня #${issue}` : this.themedMode?.label ?? `${this.settings.length} букв`
    const stars = resultStars(found.length, words.length, this.goal)
    this.onResult({
      code: this.code, title: issue ? modeLabel : this.perfect ? 'Идеально!' : `Уровень ${this.levelNumber} пройден`,
      modeLabel, stars, score: this.levelScore, runScore: this.score, record: this.score > this.recordBeforeLevel,
      found: found.length, total: words.length, longest: found.reduce((longest, word) =>
        word.length > longest.length ? word : longest, ''),
      goldenFound: found.filter(word => this.golden.has(word)).length, goldenTotal: this.golden.size,
      bestCombo: this.bestCombo, grid: gridRows(words, found), awards: unseen(loadAchievements()).filter(id => this.awardIds.has(id)),
      missing: words.filter(word => !this.found.has(word)), daily: Boolean(this.date), friend: this.friend,
    })
  }

  private tick(dt: number): void {
    if (this.particles && !this.reducedMotion.matches) {
      this.particleTime += dt / 1000
      const height = this.height + 32
      this.particles.children.forEach((flake, index) => {
        const drift = Math.sin(this.particleTime * 0.7 + index) * 8
        const fall = this.particleTime * (18 + index % 7 * 5)
        flake.position.set(
          7 + index * 137 % 386 + drift,
          (27 + index * 103 % 695 + fall) % height - 16,
        )
      })
    }
    const now = Date.now()
    if (this.mode === 'play') {
      const remaining = Math.max(0, this.comboUntil - now)
      this.comboBar.width = 320 * remaining / COMBO_MS
      this.comboLabel.text = remaining ? `×${COMBO_MULTIPLIERS[this.comboIndex]}` : ''
    }
    const second = Math.floor(now / 1000)
    if (second === this.clockSecond) return
    this.clockSecond = second
    const today = localDate()
    if ((this.mode === 'play' || this.mode === 'result') && this.date && today !== this.date) {
      this.onMenu()
      return
    }
    if (this.mode === 'play') this.updateStreak()
  }

  private onKey(event: KeyboardEventData): void {
    const { key, originalEvent, repeat } = event
    if (originalEvent.ctrlKey || originalEvent.metaKey || originalEvent.altKey || originalEvent.isComposing) return
    if (this.mode !== 'play') return
    const actions: Record<string, () => void> = {
      Enter: () => { if (!repeat) this.submit() },
      Escape: () => this.removeFrom(0),
      Backspace: () => this.removeFrom(this.input.length - 1),
      ' ': () => { if (!repeat) this.shuffle() },
    }
    if (Object.hasOwn(actions, key)) {
      originalEvent.preventDefault()
      this.sound.unlock()
      actions[key]()
    } else if (key.length === 1 && /^[А-Я]$/.test(normalize(key))) {
      originalEvent.preventDefault()
      const tile = this.pool.find(item => item.letter === normalize(key) && !this.input.includes(item))
      if (tile) {
        this.sound.unlock()
        this.addLetter(tile)
      }
    }
  }
}
