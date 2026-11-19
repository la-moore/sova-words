import { computed, watch } from 'vue'
import {
  achievements, displayedAchievement, loadAchievements, markSeen, unseen, type AchievementId,
} from '../game/achievements'
import { defineStore } from './defineStore'
import { usePlayerStore } from './player'

export const useAchievementsStore = defineStore(() => {
  const player = usePlayerStore()
  const unlocked = computed(() => player.data.achievements.unlocked)

  // Streak awards follow the best streak, which the daily word can raise outside any achievement check.
  watch(() => player.data.streak.best, () => { loadAchievements() }, { immediate: true, flush: 'sync' })

  return {
    unlocked,
    total: achievements.length,
    unlockedCount: computed(() => achievements.filter(({ id }) => unlocked.value[id]).length),
    /** Earned but not yet shown to the player, in gallery order. */
    unseen: computed(() => unseen(player.data.achievements)),
    /** Every badge as the gallery shows it, secrets masked until earned. */
    cards: computed(() => achievements.map(definition => {
      const award = unlocked.value[definition.id]
      return {
        ...displayedAchievement(definition, !award),
        locked: !award,
        unseen: award?.seen === false,
      }
    })),
    isUnseen: (id: AchievementId) => unlocked.value[id]?.seen === false,
    markSeen: (ids: readonly AchievementId[]) => { markSeen(ids) },
  }
})
