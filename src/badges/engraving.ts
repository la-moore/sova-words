import { linear, type badgePalette } from './palettes'

type Palette = ReturnType<typeof badgePalette>
let sevenOutline: Path2D | undefined

export function engrave(ctx: CanvasRenderingContext2D, text: string, front: boolean, inset: number, palette: Palette, reference: boolean) {
  const y = front ? 237 : 163
  if (reference) {
    const numeral = sevenOutline ??= new Path2D('M-15 -17 H15 V-11 L-1 18 H-10 L6 -10 H-15 Z')
    const magnification = front ? 1 : 2.6
    ctx.save()
    ctx.translate(160, y)
    ctx.scale(magnification, magnification)
    ctx.lineWidth = 2
    ctx.strokeStyle = linear(ctx, -12, -17, 10, 18, [[0, '#633a18'], [.45, '#93602b'], [1, '#ffd78c']])
    ctx.stroke(numeral)
    ctx.clip(numeral)
    ctx.fillStyle = '#4b290f'
    ctx.fillRect(-16, -18, 32, 37)
    ctx.translate(inset / magnification, 2.5)
    ctx.fillStyle = linear(ctx, 0, -17, 0, 18, [[0, '#74471e'], [1, '#a36d35']])
    ctx.fill(numeral)
    ctx.restore()
    return
  }

  ctx.font = `bold ${front ? 38 : 84}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = palette.light
  ctx.fillText(text, 160, y + 1, 126)
  ctx.fillStyle = palette.deep
  ctx.fillText(text, 160, y - 1, 126)
  ctx.fillStyle = palette.shade
  ctx.fillText(text, 160 + Math.max(-2, Math.min(2, inset)), y, 126)
}
