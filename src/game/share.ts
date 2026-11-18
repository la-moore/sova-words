import { COMBO_MULTIPLIERS } from './rules'

/** Words of one length: how many of them were found. */
export interface GridRow {
  length: number
  found: number
  total: number
}

export function gridRows(words: readonly string[], found: readonly string[]): GridRow[] {
  const rows = new Map<number, GridRow>()
  const hits = new Set(found)
  for (const word of words) {
    const row = rows.get(word.length) ?? { length: word.length, found: 0, total: 0 }
    row.total++
    if (hits.has(word)) row.found++
    rows.set(word.length, row)
  }
  return [...rows.values()].sort((a, b) => a.length - b.length)
}

/** Shares only the link: the result travels inside its token. */
export async function shareResult(url: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
  } catch (error) {
    // A standalone PWA may lack the async clipboard or refuse it once a failed share used up the user gesture.
    if (!copyWithSelection(url)) throw error
  }
  return 'copied'
}

/** Legacy copy through a selected hidden field: it works where the async clipboard is missing or denied. */
function copyWithSelection(text: string): boolean {
  const field = document.createElement('textarea')
  field.value = text
  field.readOnly = true
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.append(field)
  const active = document.activeElement
  field.select()
  field.setSelectionRange(0, text.length)
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
    if (active instanceof HTMLElement) active.focus({ preventScroll: true })
  }
}

export function resultStars(found: number, total: number, goal: number): number {
  if (!total || found < goal) return 0
  if (found === total) return 3
  return found >= Math.ceil(total * .75) ? 2 : 1
}

export function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars)
}

export function challengePhrase(found: number, total: number): string {
  return found === total ? `Я нашёл все ${total}. А ты?` : `Слабо найти все ${total}?`
}

export interface SharedResult {
  score: number
  found: number
  total: number
}

/** Extras of a shared result shown on the challenge page. */
export interface SharedDetails {
  grid?: GridRow[]
  golden?: { found: number; total: number }
  combo?: number
}

export type ShareableResult = SharedResult & { grid: GridRow[]; goldenFound: number; goldenTotal: number; bestCombo: number }

// A challenge token packs the level code and the result into bytes: the 6 bytes of the code, then varints of
// the score, combo index, golden found and total, row count, and length step, found and total of each row.
// Found and total of the whole level are the sums of the rows. A check byte leads and seeds a mask over the rest,
// so neither the level nor the numbers show, and any change gives a different token or none at all.
// The encoding is base64url, whose prefix decodes on its own: text glued after the token does not disturb it.
const CODE_BYTES = 6

function checksum(bytes: readonly number[]): number {
  return bytes.reduce((hash, byte) => Math.imul(hash ^ byte, 0x01000193) >>> 0, 0x811c9dc5) & 255
}

function mask(bytes: readonly number[], check: number): number[] {
  let state = (check * 0x9e3779b1 ^ 0x5f3a6c2d) >>> 0 || 1
  return bytes.map(byte => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return byte ^ state & 255
  })
}

const toBase64Url = (bytes: readonly number[]) =>
  btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')

function fromBase64Url(text: string): number[] | undefined {
  if (text.length % 4 === 1) text = text.slice(0, -1)
  try {
    return [...atob(text.replaceAll('-', '+').replaceAll('_', '/'))].map(char => char.charCodeAt(0))
  } catch {
    return
  }
}

/** Short link token for a friend; see `decodeChallenge`. */
export function encodeChallenge(code: string, result: ShareableResult): string {
  const { score, grid, goldenFound, goldenTotal, bestCombo } = result
  const values = [score, Math.max(0, (COMBO_MULTIPLIERS as readonly number[]).indexOf(bestCombo)), goldenFound, goldenTotal, grid.length]
  grid.forEach((row, index) => values.push(row.length - (grid[index - 1]?.length ?? 0), row.found, row.total))
  const bytes = fromBase64Url(code)!.slice(0, CODE_BYTES)
  for (let value of values.map(value => Math.max(0, Math.round(value)))) {
    while (value >= 128) {
      bytes.push(value % 128 | 128)
      value = Math.floor(value / 128)
    }
    bytes.push(value)
  }
  const check = checksum(bytes)
  return toBase64Url([check, ...mask(bytes, check)])
}

/**
 * Reads a token back as the level code, the result and its extras; a malformed or tampered token gives nothing.
 * Text glued after the token (pasting "link\ntext" into the address bar) is ignored.
 */
export function decodeChallenge(token: string): { code: string; result: SharedResult; details: SharedDetails } | undefined {
  const raw = fromBase64Url(/^[A-Za-z0-9_-]*/.exec(token)![0])
  if (!raw || raw.length <= CODE_BYTES + 1) return
  const [check, ...masked] = raw
  const bytes = mask(masked, check)
  let offset = CODE_BYTES
  const next = (): number => {
    let value = 0
    for (let scale = 1; offset < bytes.length && scale <= 2 ** 35; scale *= 128) {
      const byte = bytes[offset++]
      value += (byte & 127) * scale
      if (byte < 128) return value
    }
    return NaN
  }
  const [score, combo, goldenFound, goldenTotal, rows] = Array.from({ length: 5 }, next)
  if (!(rows <= 64)) return
  const grid: GridRow[] = []
  for (let index = 0, length = 0; index < rows; index++) {
    const [step, found, total] = [next(), next(), next()]
    length += step
    if (!(step > 0 && total > 0 && found <= total)) return
    grid.push({ length, found, total })
  }
  if (check !== checksum(bytes.slice(0, offset))) return
  const sum = (key: 'found' | 'total') => grid.reduce((total, row) => total + row[key], 0)
  const result = { score, found: sum('found'), total: sum('total') }
  if (!result.total || !(combo < COMBO_MULTIPLIERS.length) || !(goldenFound <= goldenTotal)) return
  const details: SharedDetails = { grid, combo: COMBO_MULTIPLIERS[combo] }
  if (goldenTotal > 0) details.golden = { found: goldenFound, total: goldenTotal }
  return { code: toBase64Url(bytes.slice(0, CODE_BYTES)), result, details }
}
