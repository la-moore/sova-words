import { type Canvas2DRenderer, type Object2D } from '@cynfas/core'
import { describe, expect, it, vi } from 'vitest'
import { badgeProjection, nearestFace, coast, TURN } from '../src/badges/motion'
import { registerBadgeStage } from '../src/badges/stage'

it('fits the celebration rays inside the resized preview canvas', () => {
  const define = vi.fn<(Node: new (color: string) => Object2D, draw: (node: Object2D, ctx: CanvasRenderingContext2D) => void) => void>()
  registerBadgeStage({ define } as unknown as Canvas2DRenderer)
  const [Light, draw] = define.mock.calls[1]
  const ctx = {
    canvas: { width: 720, height: 740 },
    getTransform: () => ({ a: 0, b: 2, e: 360, f: 346 }),
    scale: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
  }
  draw(new Light('#ffffff'), ctx as unknown as CanvasRenderingContext2D)
  expect(ctx.scale).toHaveBeenCalledWith(173 / 205, 173 / 205)
})

describe('badge rotation', () => {
  it('shows the reverse without mirroring and exposes the edge at a quarter turn', () => {
    expect(badgeProjection(0)).toMatchObject({ front: true, width: 1, edge: 0 })
    expect(badgeProjection(Math.PI)).toMatchObject({ front: false, width: 1 })
    expect(badgeProjection(TURN / 4)).toMatchObject({ edge: 20 })
    expect(badgeProjection(TURN / 4).width).toBeLessThan(.01)
  })

  it('settles on the nearest face in either direction', () => {
    expect(nearestFace(TURN * 1.6)).toBe(TURN * 2)
    expect(nearestFace(-TURN * 1.6)).toBe(-TURN * 2)
  })

  it('integrates deceleration independently of frame rate', () => {
    const first = coast(0, 20, .1)
    const second = coast(first.angle, first.velocity, .1)
    expect(second.angle).toBeCloseTo(coast(0, 20, .2).angle)
    expect(second.velocity).toBeCloseTo(coast(0, 20, .2).velocity)
  })
})
