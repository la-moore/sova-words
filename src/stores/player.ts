import { computed, onScopeDispose, shallowRef } from 'vue'
import { loadPlayer, onPlayerChange } from '../game/storage'
import { defineStore } from './defineStore'

/**
 * Reactive view of the saved player data. The game writes through `updatePlayer` and the view follows,
 * including saves from other tabs; nothing here keeps its own copy of what is in storage.
 */
export const usePlayerStore = defineStore(() => {
  const data = shallowRef(loadPlayer())
  onScopeDispose(onPlayerChange(next => { data.value = next }))

  return {
    data: computed(() => data.value),
    /** Best score per mode key: word length for regular modes, palette for themed ones. */
    records: computed(() => data.value.records),
  }
})
