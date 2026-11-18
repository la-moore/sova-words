import { Object2D, type Canvas2DRenderer } from '@cynfas/core'
import { BADGE_SIZE, badgeThumbnail, type BakedBadge } from './bake'
import { engrave } from './engraving'
import { badgeProjection } from './motion'
import { linear } from './palettes'

const CENTER = BADGE_SIZE / 2
const LAYER_WIDTH = 360

export class Badge extends Object2D {
  angle = 0
  appearance = 1
  readonly still?: HTMLCanvasElement

  constructor(readonly texture: BakedBadge, readonly locked = false) {
    super()
    if (locked) this.still = badgeThumbnail(texture, true)
  }
}

function paintGlyph(ctx: CanvasRenderingContext2D, texture: BakedBadge, lift: number): void {
  const { glyph, glyphWall, segments, palette } = texture
  if (Math.abs(lift) > .01) {
    if (glyphWall) {
      for (let i = 0; i < 6; i++) {
        ctx.drawImage(glyphWall, lift * i / 6, 0, BADGE_SIZE, BADGE_SIZE)
      }
    } else {
      const wall = new Path2D()
      for (const [a, b] of segments) {
        // Keep a consistent winding where the connecting quads overlap.
        const [start, end] = (b.y - a.y) * lift > 0 ? [a, b] : [b, a]
        wall.moveTo(start.x, start.y)
        wall.lineTo(end.x, end.y)
        wall.lineTo(end.x + lift, end.y)
        wall.lineTo(start.x + lift, start.y)
        wall.closePath()
      }
      ctx.fillStyle = linear(ctx, 120, 80, 190, 210, palette.relief)
      ctx.fill(wall)
    }
  }
  ctx.drawImage(glyph, lift, 0, BADGE_SIZE, BADGE_SIZE)
}

function paintBody(ctx: CanvasRenderingContext2D, texture: BakedBadge, pose: ReturnType<typeof badgeProjection>): void {
  const { paths, palette, front, back, rim, label, segments } = texture
  const facing = pose.front ? 1 : -1
  const rimLift = -5 * pose.sine * facing
  const depth = Math.abs(pose.edge) + 2 * Math.abs(rimLift)
  const offset = -pose.edge * facing / 2 + rimLift

  ctx.save()
  if (depth > .01) {
    ctx.fillStyle = linear(ctx, 0, -137, 0, 139, palette.edge)
    ctx.save()
    ctx.scale(pose.width, 1)
    ctx.translate(-CENTER, -CENTER)
    ctx.fill(paths.edge(depth / pose.width))
    ctx.restore()
  }

  ctx.translate(offset, 0)
  ctx.scale(pose.width, 1)
  ctx.translate(-CENTER, -CENTER)

  // The field shifts under the rim; the dark channel keeps its opening filled.
  ctx.fillStyle = ctx.strokeStyle = palette.fieldDepth
  ctx.fill(paths.field)
  ctx.lineWidth = 2
  ctx.stroke(paths.field)
  ctx.save()
  ctx.clip(paths.field)
  ctx.translate(-rimLift / pose.width, 0)
  ctx.drawImage(pose.front ? front : back, 0, 0, BADGE_SIZE, BADGE_SIZE)
  if (label) {
    ctx.save()
    ctx.clip(paths.field)
    engrave(ctx, label, pose.front, 3 * pose.sine * facing / pose.width, palette, label === '7' && segments.length > 0)
    ctx.restore()
  }
  if (pose.front) paintGlyph(ctx, texture, -8 * pose.sine / pose.width)
  ctx.restore()
  ctx.drawImage(rim, 0, 0, BADGE_SIZE, BADGE_SIZE)

  ctx.clip(paths.outer)
  ctx.globalCompositeOperation = 'screen'
  const x = 122 - pose.sine * facing * 125
  const glare = ctx.createRadialGradient(x, 86, 0, x, 86, 160)
  glare.addColorStop(0, `${palette.glare[0]}5c`)
  glare.addColorStop(.35, `${palette.glare[1]}21`)
  glare.addColorStop(1, `${palette.glare[1]}00`)
  ctx.fillStyle = glare
  ctx.fillRect(0, 0, BADGE_SIZE, BADGE_SIZE)
  ctx.restore()
}

function paintShadow(ctx: CanvasRenderingContext2D, width: number) {
  ctx.save()
  ctx.translate(0, 148)
  ctx.scale(51 + 69 * width, 27)
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  shadow.addColorStop(0, '#000a')
  shadow.addColorStop(1, '#0000')
  ctx.fillStyle = shadow
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

export function createBadgePainter() {
  let scratch: CanvasRenderingContext2D | null | undefined

  return (ctx: CanvasRenderingContext2D, badge: Badge) => {
    const pose = badgeProjection(badge.locked ? 0 : badge.angle)
    ctx.save()
    ctx.globalAlpha = badge.worldAlpha
    ctx.scale(badge.appearance, badge.appearance)

    if (badge.still) {
      ctx.drawImage(badge.still, -CENTER, -CENTER, BADGE_SIZE, BADGE_SIZE)
      ctx.restore()
      return
    }

    paintShadow(ctx, pose.width)
    const { a: sx, b, c, d: sy, e: cx, f: cy } = ctx.getTransform()
    const bend = -8 * pose.sine * sx
    if (Math.abs(bend) >= .5 && b === 0 && c === 0 && sx > 0 && sy > 0) {
      if (scratch === undefined) scratch = document.createElement('canvas').getContext('2d')
      if (scratch) {
        const canvas = scratch.canvas
        const left = Math.floor(cx - LAYER_WIDTH / 2 * sx)
        const top = Math.floor(cy - CENTER * sy)
        const columns = Math.ceil(cx + LAYER_WIDTH / 2 * sx) - left
        const rows = Math.ceil(cy + CENTER * sy) - top
        if (canvas.width < columns) canvas.width = columns
        if (canvas.height < rows) canvas.height = rows
        scratch.resetTransform()
        scratch.clearRect(0, 0, columns, rows)
        scratch.setTransform(sx, 0, 0, sy, cx - left, cy - top)
        paintBody(scratch, badge.texture, pose)

        // Copy whole device-pixel rows so fractional scene scales cannot leave gaps.
        ctx.resetTransform()
        for (let row = 0; row < rows; row++) {
          const y = top + row
          const height = (y + .5 - cy - sy) / (138 * sy)
          const shift = bend * Math.max(0, 1 - height * height)
          ctx.drawImage(canvas, 0, row, columns, 1, left + shift, y, columns, 1)
        }
        ctx.restore()
        return
      }
    }

    paintBody(ctx, badge.texture, pose)
    ctx.restore()
  }
}

export function registerBadge(renderer: Canvas2DRenderer): void {
  const paint = createBadgePainter()
  renderer.define(Badge, (badge, ctx) => paint(ctx, badge))
}
