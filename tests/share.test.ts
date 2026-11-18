// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { shareResult } from '../src/game/share'

const url = 'https://example.test/c/token'

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(document, 'execCommand')
})

it('copies through a selected field when a failed share leaves the clipboard denied', async () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: vi.fn().mockRejectedValue(new DOMException('', 'NotAllowedError')) })
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('', 'NotAllowedError'))
  let copied = ''
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
    copied = document.querySelector('textarea')!.value
    return true
  }) })
  await expect(shareResult(url)).resolves.toBe('copied')
  expect(copied).toBe(url)
  expect(document.querySelector('textarea')).toBeNull()
})

it('reports a failure when no way to copy works', async () => {
  const denied = new DOMException('', 'NotAllowedError')
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(denied)
  Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false })
  await expect(shareResult(url)).rejects.toBe(denied)
})
