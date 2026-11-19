const numberFormat = new Intl.NumberFormat('ru-RU')
const dateFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** `2026-11-18` → `18 ноября 2026`. */
export function formatDay(day: string): string {
  return dateFormat.format(new Date(`${day}T00:00:00Z`)).replace(/\sг\.$/, '')
}

/** Russian plural: `plural(5, ['буква', 'буквы', 'букв'])` → `букв`. */
export function plural(count: number, [one, few, many]: readonly [string, string, string]): string {
  const last = count % 10
  const tens = count % 100
  if (last === 1 && tens !== 11) return one
  return last >= 2 && last <= 4 && (tens < 12 || tens > 14) ? few : many
}
