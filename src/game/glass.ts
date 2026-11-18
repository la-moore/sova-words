import { Canvas2DRenderer, Object2D, paintPath, RectShape } from '@cynfas/core'
import { theme } from './theme'

const BLUR = 5

export class GlassRect extends RectShape {}
export class GameBackdrop extends Object2D {}

export function registerGlass(renderer: Canvas2DRenderer): void {
  const buffer = document.createElement('canvas')
  const sample = buffer.getContext('2d')
  const nativeBlur = !!sample && typeof sample.filter === 'string'
  const pyramid: HTMLCanvasElement[] = []

  renderer.define(GameBackdrop, (_node, ctx) => {
    const { width, height } = ctx.canvas
    if (!width || !height) return
    ctx.resetTransform()
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, width, height)
    for (const [x, y, radius] of [[0.16, 0.23, 0.57], [0.86, 0.7, 0.61]]) {
      const glow = ctx.createRadialGradient(x * width, y * height, 0, x * width, y * height, radius * Math.hypot(width, height))
      glow.addColorStop(0, theme.glow)
      glow.addColorStop(1, `${theme.glow}00`)
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)
    }
  })

  renderer.define(GlassRect, (node, ctx) => {
    const box = node.getBoundingBox()
    const path = new Path2D()
    path.roundRect(box.min.x, box.min.y, node.width, node.height, node.borderRadius)

    if (sample) {
      const transform = ctx.getTransform()
      const blur = BLUR * Math.hypot(transform.a, transform.b)
      const padding = Math.ceil(blur * 3)
      const corners = [
        transform.transformPoint({ x: box.min.x, y: box.min.y }),
        transform.transformPoint({ x: box.min.x, y: box.max.y }),
        transform.transformPoint({ x: box.max.x, y: box.min.y }),
        transform.transformPoint({ x: box.max.x, y: box.max.y }),
      ]
      const x = Math.max(0, Math.floor(Math.min(...corners.map(point => point.x))) - padding)
      const y = Math.max(0, Math.floor(Math.min(...corners.map(point => point.y))) - padding)
      const right = Math.min(ctx.canvas.width, Math.ceil(Math.max(...corners.map(point => point.x))) + padding)
      const bottom = Math.min(ctx.canvas.height, Math.ceil(Math.max(...corners.map(point => point.y))) + padding)
      const width = right - x
      const height = bottom - y

      if (width > 0 && height > 0) {
        ctx.save()
        ctx.clip(path)
        ctx.resetTransform()
        ctx.globalAlpha = node.worldAlpha * node.material.opacity

        if (nativeBlur) {
          if (buffer.width < width) buffer.width = width
          if (buffer.height < height) buffer.height = height
          sample.clearRect(0, 0, width, height)
          sample.drawImage(ctx.canvas, x, y, width, height, 0, 0, width, height)
          ctx.filter = `blur(${blur}px)`
          ctx.drawImage(buffer, 0, 0, width, height, x, y, width, height)
        } else {
          // No Canvas 2D filters (iOS Safari): halve the region repeatedly, then double it back.
          // One big jump down and up leaves blocky squares; small steps smooth each other out.
          const levels = Math.max(1, Math.round(Math.log2(Math.max(2, blur))))
          const sizes: Array<[number, number]> = [[width, height]]
          for (let level = 1; level <= levels; level++) {
            const [w, h] = sizes[level - 1]
            sizes.push([Math.max(1, Math.ceil(w / 2)), Math.max(1, Math.ceil(h / 2))])
          }
          const layer = (level: number) => {
            const [w, h] = sizes[level]
            const target = (pyramid[level] ??= document.createElement('canvas'))
            if (target.width < w + 1) target.width = w + 1
            if (target.height < h + 1) target.height = h + 1
            const context = target.getContext('2d')!
            context.imageSmoothingEnabled = true
            context.imageSmoothingQuality = 'high'
            context.clearRect(0, 0, w + 1, h + 1)
            return { target, context, w, h }
          }

          let source: HTMLCanvasElement = ctx.canvas
          let [sx, sy, sw, sh] = [x, y, width, height]
          for (let level = 1; level <= levels; level++) {
            const { target, context, w, h } = layer(level)
            context.drawImage(source, sx, sy, sw, sh, 0, 0, w, h)
            source = target
            ;[sx, sy, sw, sh] = [0, 0, w, h]
          }
          for (let level = levels - 1; level >= 1; level--) {
            const { target, context, w, h } = layer(level)
            context.drawImage(source, 0, 0, sw, sh, 0, 0, w, h)
            source = target
            ;[sw, sh] = [w, h]
          }
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(source, 0, 0, sw, sh, x, y, width, height)
        }
        ctx.restore()
      }
    }

    paintPath(ctx, path, node.material, node.worldAlpha)

    // The glass catches light on its upper-left edge and falls into shade below.
    ctx.save()
    ctx.shadowColor = 'transparent'
    const sheen = ctx.createLinearGradient(0, box.min.y, 0, box.max.y)
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.06)')
    sheen.addColorStop(0.24, 'rgba(255, 255, 255, 0.015)')
    sheen.addColorStop(0.56, 'transparent')
    sheen.addColorStop(1, 'rgba(12, 8, 20, 0.14)')
    ctx.fillStyle = sheen
    ctx.fill(path)

    const rim = ctx.createLinearGradient(box.min.x, box.min.y, box.min.x + node.width * 0.35, box.max.y)
    rim.addColorStop(0, 'rgba(255, 255, 255, 0.23)')
    rim.addColorStop(0.28, 'rgba(255, 255, 255, 0.11)')
    rim.addColorStop(0.63, 'rgba(255, 255, 255, 0.025)')
    rim.addColorStop(1, 'rgba(220, 231, 255, 0.075)')
    ctx.strokeStyle = rim
    ctx.lineWidth = 3
    ctx.globalAlpha *= 0.12
    ctx.stroke(path)
    ctx.globalAlpha = node.worldAlpha * node.material.opacity
    ctx.lineWidth = 1
    ctx.stroke(path)
    ctx.restore()
  })
}
