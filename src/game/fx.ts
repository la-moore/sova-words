import { Easing, Object2D, RectShape, type TweenManager } from '@cynfas/core'
import { label } from './ui'
import { theme } from './theme'

export class Effects {
  private readonly preference = window.matchMedia('(prefers-reduced-motion: reduce)')

  constructor(private readonly tweens: TweenManager, private readonly layer: Object2D) {}

  duration(ms: number): number { return this.preference.matches ? ms / 2 : ms }

  fly(node: Object2D, fromX: number, fromY: number, toX: number, toY: number, arc = 24): void {
    node.position.set(fromX, fromY)
    this.layer.add(node)
    this.tweens.to(node, { 'position.x': toX }, {
      duration: this.duration(260),
      onUpdate: progress => {
        node.position.y = fromY + (toY - fromY) * progress - Math.sin(progress * Math.PI) * arc
      },
      onComplete: () => node.dispose(),
    })
  }

  pulse(node: Object2D, from = 0.9, ms = 180): void {
    node.scale.set(from, from)
    this.tweens.to(node, { scale: 1 }, { duration: this.duration(ms), easing: Easing.backOut })
  }

  flash(node: Object2D): void {
    node.alpha = 0.35
    this.tweens.to(node, { alpha: 1 }, { duration: this.duration(260) })
  }

  shake(node: Object2D): void {
    if (this.preference.matches) return
    this.layer.add(node)
    this.tweens.to(node, { alpha: 0 }, {
      duration: 250,
      onUpdate: progress => { node.position.x = Math.sin(progress * Math.PI * 6) * 9 * (1 - progress) },
      onComplete: () => node.dispose(),
    })
  }

  points(text: string, color: string = theme.correct): void {
    const node = label(text, 310, 433, 23, color)
    this.layer.add(node)
    this.tweens.to(node, { alpha: 0, 'position.y': 400 }, {
      duration: this.duration(400), onComplete: () => node.dispose(),
    })
  }

  burst(x: number, y: number, golden: boolean, options?: { colors: string[]; count: number; distance: number }): void {
    if (this.preference.matches) return
    const colors = options?.colors ?? (golden ? [theme.hint, '#fff2ad'] : [theme.hint, theme.correct, '#c084fc', theme.wrong])
    const count = options?.count ?? 20
    for (let i = 0; i < count; i++) {
      const angle = i * 2 * Math.PI / count
      const distance = 26 + Math.random() * (options?.distance ?? 70)
      const node = new RectShape(5, 7, {
        pivot: 0.5, fill: colors[i % colors.length], position: { x, y },
      })
      this.layer.add(node)
      this.tweens.to(node, {
        'position.x': x + Math.cos(angle) * distance, 'position.y': y + Math.sin(angle) * distance,
        alpha: 0, rotation: angle,
      }, { duration: 400, onComplete: () => node.dispose() })
    }
  }
}
