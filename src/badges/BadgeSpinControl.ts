import { Easing } from '@cynfas/core'
import type { Badge } from './Badge'
import { coast, nearestFace, TURN } from './motion'

export function attachBadgeSpin(canvas: HTMLCanvasElement, badge: Badge, render: () => void, allowDrag = (_event: PointerEvent) => true) {
  if (badge.locked) return () => {}

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  let frame = 0
  let pointer: { id: number; x: number; time: number } | undefined
  let velocity = 0

  function stop() {
    cancelAnimationFrame(frame)
    frame = 0
  }

  function animate(target: number, duration: number) {
    stop()
    const from = badge.angle
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min(1, Math.max(0, (now - start) / duration))
      const easing = Easing.cubicOut(progress)
      badge.angle = progress === 1 ? 0 : from + (target - from) * easing
      render()
      frame = progress < 1 ? requestAnimationFrame(tick) : 0
    }
    frame = requestAnimationFrame(tick)
  }

  canvas.addEventListener('pointerdown', event => {
    if (pointer || event.button !== 0 || !allowDrag(event)) return
    stop()
    canvas.setPointerCapture(event.pointerId)
    pointer = { id: event.pointerId, x: event.clientX, time: performance.now() }
    velocity = 0
    render()
  }, options)

  canvas.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return
    const now = performance.now()
    const delta = (pointer.x - event.clientX) * TURN / Math.max(1, canvas.clientWidth)
    badge.angle += delta
    velocity = Math.max(-22, Math.min(22, delta * 1000 / Math.max(1, now - pointer.time)))
    pointer.x = event.clientX
    pointer.time = now
    render()
  }, options)

  function release(event: PointerEvent) {
    if (pointer?.id !== event.pointerId) return
    let previous = performance.now()
    if (event.type !== 'pointerup' || previous - pointer.time > 100) velocity = 0
    pointer = undefined
    if (reduced.matches) {
      badge.angle = 0
      render()
      return
    }

    function tick(now: number) {
      const step = coast(badge.angle, velocity, Math.min(.05, (now - previous) / 1000))
      previous = now
      badge.angle = step.angle
      velocity = step.velocity
      render()
      if (Math.abs(velocity) < .5) animate(nearestFace(badge.angle), 450)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }

  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    canvas.addEventListener(event, release, options)
  }

  canvas.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    if (pointer) return
    if (reduced.matches) {
      badge.angle = Math.cos(badge.angle) < 0 ? 0 : Math.PI
      render()
      return
    }
    const direction = event.key === 'ArrowRight' ? 1 : -1
    animate(nearestFace(badge.angle) + direction * TURN, 760)
  }, options)

  reduced.addEventListener('change', () => {
    if (!reduced.matches) return
    stop()
    badge.angle = 0
    render()
  }, options)

  return () => {
    stop()
    listeners.abort()
    if (pointer && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id)
  }
}
