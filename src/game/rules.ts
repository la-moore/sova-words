export const COMBO_MS = 5000
export const COMBO_MULTIPLIERS = [1, 1.5, 2, 3] as const

export function wordPoints(length: number, base: boolean, golden: boolean, bonus: boolean, combo: number): number {
  return Math.floor(10 * (length - 2) * (golden ? 2 : 1) * (bonus ? 1.5 : 1) * combo) + (base ? 50 : 0)
}
