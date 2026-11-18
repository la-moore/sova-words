export const COMBO_MS = 5000
export const COMBO_MULTIPLIERS = [1, 1.5, 2, 3] as const

export function wordPoints(length: number, base: boolean, golden: boolean, bonus: boolean, combo: number): number {
  return Math.floor(10 * (length - 2) * (golden ? 2 : 1) * (bonus ? 1.5 : 1) * combo) + (base ? 50 : 0)
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value === null ? fallback : JSON.parse(value) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}
