import { CircleShape, Object2D, RectShape, TextShape } from '@cynfas/core'
import { GlassRect } from './glass'
import { Icon, type IconName } from './icons'
import { theme } from './theme'

export const blockRadius = 12

export const centeredTextStyle = { font: theme.font, align: 'center', baseline: 'middle' } as const

export function label(text: string, x: number, y: number, size = 18, fill: string = theme.text, weight = 600): TextShape {
  return new TextShape(text, {
    ...centeredTextStyle, position: { x, y }, fontSize: size, fill, fontWeight: weight,
  })
}

export function glassSurface(color: string, alpha = '80') {
  return {
    fill: `${color}${alpha}`,
    stroke: `${theme.accent}24`,
    shadow: { color: theme.tileShadow, blur: 12, offset: { x: 0, y: 3 } },
  }
}

export function panel(x: number, y: number, width: number, height: number, radius = 20, glass = false): RectShape {
  const Surface = glass ? GlassRect : RectShape
  return new Surface(width, height, {
    position: { x, y }, borderRadius: radius,
    ...(glass ? glassSurface(theme.surface, '42') : { fill: theme.surface, stroke: theme.outline }),
  })
}

export class Counter extends Object2D {
  readonly value: TextShape
  private readonly icon: Icon

  constructor(name: IconName, x: number, y: number, size: number, align: 'center' | 'right', color: string = theme.text) {
    super({ position: { x, y } })
    this.value = label('', 0, 0, size, color)
    this.value.material.textAlign = align
    this.icon = new Icon(name, size, 0, 0, color)
    this.add(this.icon, this.value)
  }

  update(text: string): void {
    this.value.text = text
    this.icon.visible = Boolean(text)
    const width = this.value.measureLine(text)
    const offset = this.icon.width / 2 + 4
    if (this.value.material.textAlign === 'center') {
      this.value.position.x = (this.icon.width + 4) / 2
      this.icon.position.x = -(width + 4) / 2
    } else {
      this.icon.position.x = -width - offset
    }
  }
}

export class Tile extends Object2D {
  constructor(readonly letter: string, width: number, height = width) {
    super({ interactive: true, cursor: 'pointer' })
    this.add(new GlassRect(width, height, {
      pivot: 0.5, borderRadius: blockRadius, ...glassSurface(theme.buttonSecondary),
    }), label(letter, 0, 0, Math.min(width, height) * 0.5, theme.text, 750))
  }
}

export class Button extends Object2D {
  readonly label: TextShape
  readonly bg: RectShape
  private readonly face = new Object2D()
  private icon?: Icon
  private readonly foreground: string

  constructor(text: string, x: number, y: number, width: number, height: number, action?: () => void, color: string = theme.button, keycap = false, glass = false) {
    super({ position: { x, y }, interactive: true, cursor: 'pointer' })
    const depth = keycap ? 5 : 0
    const radius = glass ? blockRadius : keycap ? 8 : 15
    const Surface = glass ? GlassRect : RectShape
    this.bg = new Surface(width, height - depth, {
      pivot: 0.5, borderRadius: radius,
      ...(glass ? glassSurface(color) : { fill: color, stroke: color === theme.buttonSecondary ? theme.outline : null }),
    })
    this.foreground = color === theme.buttonSecondary ? theme.text : theme.buttonText
    this.label = label(text, 0, 0, 18, this.foreground)
    if (keycap) {
      const base = new RectShape(width, height, {
        pivot: 0.5, borderRadius: radius, fill: glass ? `${theme.keyBase}55` : theme.keyBase,
      })
      this.add(base)
      this.face.position.y = -depth / 2
      this.on('pointerdown', () => {
        base.alpha = 0
        this.face.position.y = depth / 2
      })
      this.on('pointerup', () => {
        base.alpha = 1
        this.face.position.y = -depth / 2
      })
    }
    this.face.add(this.bg, this.label)
    this.add(this.face)
    if (action) this.on('click', action)
  }

  setIcon(name: IconName, { size = 24, gap = 4, leading = false } = {}): void {
    if (this.icon) {
      this.icon.setIcon(name, this.foreground)
    } else {
      this.icon = new Icon(name, size, 0, 0, this.foreground)
      this.face.add(this.icon)
    }
    const text = this.label.text
    this.icon.width = size
    this.icon.height = size
    const direction = leading ? -1 : 1
    this.label.position.x = text ? -direction * (size + gap) / 2 : 0
    this.icon.position.x = text ? direction * (this.label.measureLine(text) + gap) / 2 : 0
  }
}

export class LetterKey extends Button {
  constructor(readonly letter: string, x: number, y: number, width: number) {
    super(letter, x, y, width, 58, undefined, theme.buttonSecondary, true, true)
    this.label.fontSize = Math.min(27, width * 0.55)
    this.label.material.fontWeight = 750
  }

  setUsed(used: boolean): void {
    this.interactive = !used
    this.bg.fill = glassSurface(used ? theme.slot : theme.buttonSecondary).fill
    this.label.alpha = used ? 0.38 : 1
  }
}

export class WordChip extends Object2D {
  readonly width: number

  constructor(readonly word: string, bonus: boolean, golden: boolean) {
    super()
    this.width = word.length * 13 + 22
    const color = golden ? theme.goldenTile : bonus ? theme.bonus : theme.buttonSecondary
    this.add(new GlassRect(this.width, 32, {
      borderRadius: blockRadius, ...glassSurface(color, golden ? 'd9' : '80'),
    }), label(word, this.width / 2, 16, 15, golden ? theme.goldenText : bonus ? theme.buttonText : theme.text))
  }
}

export class LengthProgress extends Object2D {
  private readonly count: TextShape
  private readonly marks: Object2D
  private readonly bar: RectShape

  constructor(readonly length: number, readonly total: number, y: number) {
    super({ position: { x: 0, y } })
    const name = label(`${length} ${length === 3 || length === 4 ? 'буквы' : 'букв'}`, 30, 0, 14, theme.muted)
    name.material.textAlign = 'left'
    this.count = label('', 370, 0, 14)
    this.count.material.textAlign = 'right'
    this.marks = new Object2D()
    this.bar = new RectShape(0, 8, { position: { x: 104, y: -4 }, borderRadius: 4, fill: theme.correct })
    this.add(name, this.count, this.marks)
    if (total > 10) {
      this.marks.add(new RectShape(216, 8, { position: { x: 104, y: -4 }, borderRadius: 4, fill: theme.slotStroke }), this.bar)
    }
    this.update([])
  }

  update(golden: readonly boolean[]): Object2D {
    this.count.text = `${golden.length}/${this.total}`
    if (this.total > 10) {
      this.bar.width = 216 * golden.length / this.total
      this.bar.fill = golden.some(Boolean) ? theme.hint : theme.correct
      return this.bar
    }
    for (const mark of [...this.marks.children]) mark.dispose()
    for (let i = 0; i < this.total; i++) {
      this.marks.add(new CircleShape(5, {
        position: { x: 110 + i * 22, y: 0 },
        fill: i < golden.length ? golden[i] ? theme.hint : theme.correct : theme.slot,
        stroke: i < golden.length ? null : theme.slotStroke,
        strokeWidth: 1.5,
      }))
    }
    return this.marks.children[Math.max(0, golden.length - 1)]
  }
}
