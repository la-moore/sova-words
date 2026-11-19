import { computed } from 'vue'
import { toggleSetting } from '../game/storage'
import { defineStore } from './defineStore'
import { usePlayerStore } from './player'

export const useSettingsStore = defineStore(() => {
  const player = usePlayerStore()

  return {
    sound: computed(() => player.data.settings.sound),
    vibration: computed(() => player.data.settings.vibration),
    canVibrate: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
    /** Call from a click: the game unlocks audio when sound turns on. */
    toggleSound: () => { toggleSetting('sound') },
    toggleVibration: () => { toggleSetting('vibration') },
  }
})
