import { markRaw, shallowRef } from 'vue'
import type { AnagramGame } from '../game/Game'
import type { PlayerResult } from '../game/result'
import { defineStore } from './defineStore'

/** The canvas game and the result it last reported; the canvas lives for the whole app. */
export const useGameStore = defineStore(() => {
  const game = shallowRef<AnagramGame>()
  const result = shallowRef<PlayerResult>()

  return {
    game,
    result,
    attach(instance: AnagramGame) { game.value = markRaw(instance) },
    detach() {
      game.value = undefined
      result.value = undefined
    },
    setResult(value?: PlayerResult) { result.value = value },
    continueLevel: () => game.value?.continueLevel(),
    goToMenu: () => game.value?.goToMenu(),
    celebrateStar: (index: number) => game.value?.celebrateStar(index),
    playAchievementSound: () => game.value?.playAchievementSound(),
  }
})
