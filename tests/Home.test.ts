// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { Application } from '@cynfas/core'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import Home from '../src/Home.vue'
import { createGameRouter } from '../src/routes'
import { encodeChallenge } from '../src/game/share'
import { encodeSeed, seededLayout } from '../src/game/seed'
import { levelFromWord, loadDictionary } from '../src/game/words'
import { dailyNumber, localDate } from '../src/game/daily'

vi.mock('../src/badges/bake', async importOriginal => ({
  ...await importOriginal<typeof import('../src/badges/bake')>(),
  bakeThumbnail: async () => document.createElement('canvas'),
}))

it('navigates from the home screen through a shared level and continues the run', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const router = createGameRouter(createMemoryHistory(), Home)
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ measureText: (text: string) => ({ width: text.length * 8 }) } as CanvasRenderingContext2D)
  const start = vi.spyOn(Application.prototype, 'start').mockImplementation(function (this: Application) {
    return this
  })
  const render = vi.spyOn(Application.prototype, 'render').mockImplementation(() => {})
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  const app = createApp(App).use(router)
  await router.push('/')
  app.mount(container)

  try {
    await nextTick()
    const gameHost = container.querySelector<HTMLDivElement>('#app')!
    const canvas = gameHost.querySelector('canvas')
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(gameHost.hidden).toBe(true)
    expect(container.textContent).toContain('На экран Домой')
    Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Android')!.click()
    await vi.waitFor(() => expect(container.textContent).toContain('«Установить»'))

    expect(container.textContent).toContain('Ачивки · 0/14')
    expect(container.querySelectorAll('.achievement-grid button')).toHaveLength(14)
    const cardNames = [...container.querySelectorAll('.achievement-grid button')]
      .map(button => button.getAttribute('aria-label'))
    expect(cardNames).toContain('???. Секретная ачивка.')
    expect(cardNames.some(name => name?.includes('Ночная сова'))).toBe(false)

    const links = Array.from(container.querySelectorAll('a'))
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/play/daily', '/play/5', '/play/6', '/play/7', '/play/new-year', '/play/space', '/play/sea',
      '/play/forest', '/play/kitchen', '/play/music',
    ])
    links.find(link => link.getAttribute('href') === '/play/space')!.click()
    await vi.waitFor(() => expect(router.currentRoute.value.meta.theme?.palette).toBe('space'))
    expect(container.querySelector('main')).toBeNull()
    expect(gameHost.hidden).toBe(false)
    expect(document.documentElement.classList.contains('playing')).toBe(true)

    localStorage.setItem('cynfas-anagram-streak', JSON.stringify({
      current: 0, best: 7, lastDate: '', freezeUsedWeek: '',
    }))
    router.back()
    await vi.waitFor(() => expect(container.textContent).toContain('Ачивки · 2/14'))
    expect(gameHost.hidden).toBe(true)
    expect(gameHost.querySelector('canvas')).toBe(canvas)
    expect(document.documentElement.classList.contains('playing')).toBe(false)
    await vi.waitFor(() => expect(container.querySelector('dialog')?.open).toBe(true))
    const dialog = container.querySelector('dialog')!
    expect(dialog.textContent).toContain('Слово дня')
    dialog.querySelector<HTMLButtonElement>('.achievement-close')!.click()
    await vi.waitFor(() => expect(dialog.open).toBe(false))
    expect([...container.querySelectorAll('.achievement-unseen')].map(dot => dot.parentElement?.getAttribute('aria-label')))
      .toEqual([expect.stringContaining('Серия 7')])
    const path = () => router.currentRoute.value.path
    await router.push('/play/6/garbage')
    await vi.waitFor(() => expect(path()).toMatch(/^\/play\/6\/[\w-]{8}$/))
    expect(gameHost.hidden).toBe(false)
    await loadDictionary()
    const level = levelFromWord('ПЛАНЕТА')
    const code = encodeSeed({ mode: 4, base: level.base })
    const friend = (code: string, total: number) => `/c/${encodeChallenge(code, {
      score: 340, found: 8, total, grid: [{ length: 6, found: 8, total }], goldenFound: 1, goldenTotal: 2, bestCombo: 1.5,
    })}`
    await router.push(friend(code, level.words.length + 1))
    await vi.waitFor(() => expect(container.textContent).toContain('Уровень обновился с тех пор'))
    expect(gameHost.hidden).toBe(true)
    expect(container.textContent).toContain('Вызов: Космос')
    expect(container.textContent).not.toContain(level.base)
    const button = (label: string) => [...container.querySelectorAll('button')].find(item => item.textContent === label)!
    button('Попробовать').click()
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(`/play/space/${code}`))
    const key = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key }))
    const { game: playingGame } = window as unknown as { game: {
      letters: string[]; golden: Set<string>; level: typeof level; score: number; levelNumber: number; found: Set<string>
    } }
    const layout = seededLayout(level, code)
    await vi.waitFor(() => expect(playingGame.level.base).toBe(level.base))
    expect(playingGame.letters).toEqual(layout.letters)
    expect([...playingGame.golden]).toEqual(layout.golden)
    const type = (word: string) => {
      for (const letter of word) key(letter)
      key('Enter')
    }
    level.words.slice(0, 8).forEach(type)
    key('Enter')
    await vi.waitFor(() => expect(path()).toBe(`/play/space/${code}/result`))
    await vi.waitFor(() => expect(container.textContent).toContain('Друг ·'))
    expect(container.textContent).toContain('340')
    const score = playingGame.score
    button('Поделиться').click()
    await vi.waitFor(() => expect(container.textContent).toContain('Скопировано'))
    const copied = copy.mock.calls[0][0]
    // Only the link is shared: the result travels inside its token.
    const copiedUrl = new URL(copied)
    expect(copied).not.toContain(level.base)
    expect(copiedUrl.pathname).toMatch(/^\/c\/[\w-]+$/)
    expect(copiedUrl.pathname).not.toContain(code)
    expect(copiedUrl.search).toBe('')

    // The friend sees a column per word length and the extras.
    await router.push(copiedUrl.pathname)
    expect(gameHost.hidden).toBe(true)
    await vi.waitFor(() => expect(container.querySelector('.result-grid')).not.toBeNull())
    expect(container.querySelectorAll('.result-grid li')).toHaveLength(new Set(level.words.map(word => word.length)).size)
    expect(container.querySelector('.level-result-stats')?.textContent).toMatch(/Друг нашёл8\/\d+Золотые\d\/\dКомбо×/)

    // Reopening the result address restores the finished level and its friend.
    await router.push('/')
    await router.push(`/play/space/${code}/result`)
    await vi.waitFor(() => expect(container.textContent).toContain('Друг ·'))
    expect(playingGame.score).toBe(score)

    button('Играть дальше').click()
    await vi.waitFor(() => expect(container.querySelector('.level-result')).toBeNull())
    await vi.waitFor(() => expect(path()).toMatch(/^\/play\/space\/[\w-]{8}$/))
    expect(path()).not.toBe(`/play/space/${code}`)
    expect(playingGame.levelNumber).toBe(2)
    expect(playingGame.score).toBe(score)
    expect(playingGame.level.base).not.toBe(level.base)

    // Reopening a level address keeps the run and the words found so far.
    const nextPath = path()
    const nextBase = playingGame.level.base
    type(playingGame.level.words[0])
    const found = [...playingGame.found]
    expect(found).toHaveLength(1)
    await router.push('/')
    await router.push(nextPath)
    await vi.waitFor(() => expect(playingGame.level.base).toBe(nextBase))
    expect([...playingGame.found]).toEqual(found)
    expect(playingGame.levelNumber).toBe(2)
    expect(playingGame.score).toBeGreaterThan(score)
    expect(path()).toBe(nextPath)

    const dailyCode = encodeSeed({ day: dailyNumber(localDate()) + 1 })
    await router.push(friend(dailyCode, 15))
    await vi.waitFor(() => expect(container.textContent).toContain('Сыграть слово дня'))
    button('Сыграть слово дня').click()
    await vi.waitFor(() => expect(path()).toBe('/play/daily'))
    await router.push(`/play/daily/${dailyCode}`)
    expect(path()).toBe('/play/daily')
    // A broken token leads home.
    await router.push(`/c/${code}`)
    expect(path()).toBe('/')
  } finally {
    localStorage.removeItem('cynfas-anagram-streak')
    localStorage.removeItem('cynfas-anagram-achievements')
    sessionStorage.clear()
    copy.mockRestore()
    app.unmount()
    container.remove()
    render.mockRestore()
    start.mockRestore()
    context.mockRestore()
  }
})
