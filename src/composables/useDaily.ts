import { computed, reactive } from 'vue'
import { activeStreak, dailyBestOf, dailyOn, localDate, timeUntilTomorrow } from '../game/daily'
import { usePlayerStore } from '../stores/player'
import { useNow } from './useNow'

/** The word of the day as the menu shows it; re-evaluated every second so midnight rolls over. */
export function useDaily() {
  const player = usePlayerStore()
  const now = useNow()
  const today = computed(() => localDate(now.value))

  return reactive({
    streak: computed(() => activeStreak(player.data.streak, today.value)),
    finished: computed(() => Boolean(dailyOn(player.data, today.value)?.finished)),
    best: computed(() => dailyBestOf(player.data)),
    countdown: computed(() => timeUntilTomorrow(now.value)),
  })
}
