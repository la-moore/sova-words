import { Easing, Object2D, type Application, type Canvas2DRenderer } from '@cynfas/core'
import { Badge, registerBadge } from './Badge'
import { attachBadgeSpin } from './BadgeSpinControl'
import { bakeBadge, type BadgeSpec } from './bake'
import { TURN } from './motion'
import { badgePalette } from './palettes'

const LIGHT_RADIUS = 205

class BadgeLight extends Object2D {
  flash = 0

  constructor(readonly color: string) {
    super()
  }
}

export function registerBadgeStage(renderer: Canvas2DRenderer) {
  registerBadge(renderer)
  renderer.define(BadgeLight, (node, ctx) => {
    const { a, b, e: x, f: y } = ctx.getTransform()
    const { width, height } = ctx.canvas
    const available = Math.min(x, width - x, y, height - y)
    if (available <= 0) return
    const scale = Math.min(1, available / (LIGHT_RADIUS * Math.hypot(a, b)))
    ctx.scale(scale, scale)

    ctx.globalAlpha = node.worldAlpha
    const glow = ctx.createRadialGradient(0, 0, 16, 0, 0, LIGHT_RADIUS)
    glow.addColorStop(0, `${node.color}69`)
    glow.addColorStop(.58, `${node.color}28`)
    glow.addColorStop(1, `${node.color}00`)
    ctx.fillStyle = glow
    ctx.fillRect(-LIGHT_RADIUS, -LIGHT_RADIUS, 2 * LIGHT_RADIUS, 2 * LIGHT_RADIUS)

    ctx.beginPath()
    for (let i = 0; i < 12; i++) {
      const angle = i * TURN / 12
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * LIGHT_RADIUS, Math.sin(angle) * LIGHT_RADIUS)
      ctx.lineTo(Math.cos(angle + .16) * LIGHT_RADIUS, Math.sin(angle + .16) * LIGHT_RADIUS)
      ctx.closePath()
    }
    ctx.fill()

    if (node.flash > 0) {
      const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, 198)
      flash.addColorStop(0, '#fffaf1')
      flash.addColorStop(1, '#fff0')
      ctx.globalAlpha *= node.flash
      ctx.fillStyle = flash
      ctx.fillRect(-198, -198, 396, 396)
    }
  })
}

interface StageOptions {
  x: number
  y: number
  scale?: number
  locked?: boolean
  celebrate?: boolean
  onReveal?: () => void
  onError?: () => void
}

export function mountBadgeStage(app: Application, parent: Object2D, spec: BadgeSpec, options: StageOptions) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const scale = options.scale ?? 1
  const group = new Object2D({ position: { x: options.x, y: options.y }, scale })
  parent.add(group)
  let detach = () => {}
  let cleanedUp = false

  void bakeBadge(spec, 320 * scale, app.renderer.pixelRatio).then(texture => {
    if (cleanedUp) return
    const badge = new Badge(texture, options.locked)
    const light = new BadgeLight(badgePalette(spec.palette).highlight)
    light.zIndex = -1
    group.add(badge)

    const allowDrag = (event: PointerEvent) => {
      const rect = app.canvas.getBoundingClientRect()
      const point = app.viewport.screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      return Math.abs(point.x - options.x) <= 146 * scale && Math.abs(point.y - options.y) <= 146 * scale
    }
    const enableSpin = () => {
      detach = attachBadgeSpin(app.canvas, badge, () => {
        if (!app.loop.running) app.render()
      }, allowDrag)
    }
    if (!options.celebrate) {
      enableSpin()
      app.render()
      return
    }

    if (reduced.matches) {
      app.tweens.from(badge, { alpha: 0 }, { duration: 250 })
      enableSpin()
      return
    }

    group.add(light)
    app.tweens.from(light, { alpha: 0 }, { duration: 250 })
    app.tweens.to(light, { rotation: TURN }, { duration: 24000, repeat: Infinity })
    badge.appearance = .72
    app.tweens.to(badge, { angle: 2 * TURN, appearance: 1 }, {
      duration: 1500,
      easing: Easing.cubicOut,
      onComplete: () => {
        badge.angle = 0
        if (!reduced.matches) {
          const flash = new BadgeLight(light.color)
          flash.flash = .92
          flash.zIndex = 2
          group.add(flash)
          app.tweens.to(flash, { alpha: 0 }, { duration: 350, onComplete: () => flash.dispose() })
          options.onReveal?.()
        }
        enableSpin()
      },
    })
  }).catch(() => {
    if (!cleanedUp) options.onError?.()
  })

  return () => {
    cleanedUp = true
    detach()
    group.traverse(node => app.tweens.killTweensOf(node))
    group.dispose()
  }
}
