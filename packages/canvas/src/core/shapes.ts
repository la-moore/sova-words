import { Color } from './color'
import { Vector } from "./vector"
import { Node } from "./node"
import { Viewport } from "./render"

type TextHorizontalAlign = 'left' | 'center' | 'right'
type TextVerticalAlign = 'top' | 'middle' | 'bottom'

export class RectShape extends Node {
  fill?: Color
  stroke?: Color
  strokeWidth = 1

  constructor(width: number, height: number) {
    super()

    this.size = new Vector(width, height)
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport) {
    if (this.fill) {
      ctx.fillStyle = this.fill.toHex()
      ctx.fillRect(0, 0, this.size.x, this.size.y)
    }

    if (this.stroke) {
      ctx.strokeStyle = this.stroke.toHex()
      ctx.lineWidth = this.strokeWidth / viewport.getScale()
      ctx.strokeRect(0, 0, this.size.x, this.size.y)
    }
  }
}

export class EllipseShape extends Node {
  fill?: Color
  stroke?: Color
  strokeWidth = 1

  constructor(width: number, height: number) {
    super()

    this.size = new Vector(width, height)
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport) {
    ctx.beginPath()

    const x1 = 0
    const y1 = 0
    const x2 = this.size.x
    const y2 = this.size.y

    const centerX = x1 + (x2 - x1) / 2
    const centerY = y1 + (y2 - y1) / 2
    const radiusX = Math.abs(x2 - x1) / 2
    const radiusY = Math.abs(y2 - y1) / 2

    ctx.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      0, 0,
      Math.PI * 2
    )

    if (this.fill) {
      ctx.fillStyle = this.fill.toHex()
      ctx.fill()
    }

    if (this.stroke) {
      ctx.strokeStyle = this.stroke.toHex()
      ctx.lineWidth = this.strokeWidth / viewport.getScale()
      ctx.stroke()
    }
  }
}

export class LineShape extends Node {
  color: Color
  strokeWidth = 1

  constructor(width: number, height: number, color = Color.black()) {
    super()

    this.color = color
    this.size = new Vector(width, height)
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport) {
    ctx.beginPath()
    ctx.strokeStyle = this.color.toHex()
    ctx.lineWidth = this.strokeWidth / viewport.getScale()
    ctx.moveTo(0, 0)
    ctx.lineTo(this.size.x, this.size.y)
    ctx.stroke()
  }
}

export class TextShape extends Node {
  text = ''
  color: Color = Color.black()

  fontFamily = 'sans-serif'
  fontSize = 16
  fontWeight: string | number = 'normal'
  fontStyle: 'normal' | 'italic' | 'oblique' = 'normal'
  lineHeight?: number

  wrap = true
  align: TextHorizontalAlign = 'left'
  verticalAlign: TextVerticalAlign = 'top'

  constructor(width: number, height: number, text = '') {
    super()

    this.size = new Vector(width, height)
    this.text = text
  }

  private getComputedLineHeight() {
    return this.lineHeight ?? this.fontSize * 1.2
  }

  private getFontCss() {
    return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`
  }

  private wrapText(ctx: CanvasRenderingContext2D, maxWidth: number): string[] {
    const input = (this.text ?? '').toString()

    if (!input) return ['']

    const paragraphs = input.split('\n')
    const lines: string[] = []

    for (const paragraph of paragraphs) {
      if (!this.wrap || !(maxWidth > 0)) {
        lines.push(paragraph)
        continue
      }

      const words = paragraph.split(/\s+/g).filter(Boolean)
      if (words.length === 0) {
        lines.push('')
        continue
      }

      let line = ''
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word

        if (ctx.measureText(candidate).width <= maxWidth) {
          line = candidate
          continue
        }

        if (line) {
          lines.push(line)
          line = word
          continue
        }

        // word itself doesn't fit, split by characters
        let chunk = ''
        for (const ch of word) {
          const c2 = chunk + ch
          if (ctx.measureText(c2).width <= maxWidth || chunk.length === 0) {
            chunk = c2
          } else {
            lines.push(chunk)
            chunk = ch
          }
        }
        line = chunk
      }

      lines.push(line)
    }

    return lines
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport) {
    ctx.save()

    ctx.fillStyle = this.color.toHex()
    ctx.font = this.getFontCss()
    ctx.textBaseline = 'top'
    ctx.textAlign = this.align

    const maxWidth = this.size.x
    const lines = this.wrapText(ctx, maxWidth)

    const lh = this.getComputedLineHeight()
    const totalHeight = lines.length * lh

    let y = 0
    if (this.verticalAlign === 'middle') {
      y = (this.size.y - totalHeight) / 2
    } else if (this.verticalAlign === 'bottom') {
      y = this.size.y - totalHeight
    }

    const x = this.align === 'left' ? 0 : this.align === 'center' ? this.size.x / 2 : this.size.x

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lh)
    }

    ctx.restore()
  }
}
