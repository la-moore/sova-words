// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { GameSound } from '../src/game/sound'
import { updatePlayer } from '../src/game/storage'
import { useAchievementsStore } from '../src/stores/achievements'
import { usePlayerStore } from '../src/stores/player'
import { useSettingsStore } from '../src/stores/settings'

afterEach(() => localStorage.clear())

it('follows saves made outside Vue, so the game and the menu share one source of truth', async () => {
  const player = usePlayerStore()
  updatePlayer(data => { data.records[5] = 120 })
  expect(player.records[5]).toBe(120)

  const settings = useSettingsStore()
  const sound = new GameSound()
  expect([settings.sound, sound.enabled]).toEqual([true, true])
  settings.toggleSound()
  expect([settings.sound, sound.enabled]).toEqual([false, false])
  sound.toggle()
  expect([settings.sound, sound.enabled]).toEqual([true, true])
  sound.dispose()
  settings.toggleSound()
  expect(sound.enabled).toBe(true)
})

it('grants streak badges as soon as the best streak reaches them', async () => {
  const achievements = useAchievementsStore()
  updatePlayer(data => { data.streak = { current: 7, best: 7, lastDate: '2026-11-18', freezeUsedWeek: '' } })
  await nextTick()
  expect(achievements.unseen).toEqual(['daily', 'streak-7'])
  achievements.markSeen(['daily'])
  expect(achievements.unseen).toEqual(['streak-7'])
  expect(achievements.unlockedCount).toBe(2)
})
