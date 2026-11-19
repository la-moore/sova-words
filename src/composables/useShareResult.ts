import { ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PlayerResult } from '../game/result'
import { encodeChallenge, shareResult } from '../game/share'
import { challengePath } from '../paths'

/** Shares a challenge link for the result on screen; the status resets whenever the result changes. */
export function useShareResult(result: Ref<PlayerResult | undefined>) {
  const router = useRouter()
  const status = ref('')
  const sharing = ref(false)

  watch(result, () => {
    status.value = ''
    sharing.value = false
  })

  async function share() {
    const data = result.value
    if (!data || sharing.value) return
    const { href } = router.resolve(challengePath(encodeChallenge(data.code, data)))
    const url = new URL(href, location.href).href
    // The player may leave the result while the share sheet is open; only report on the same one.
    const current = () => result.value === data

    sharing.value = true
    status.value = ''
    try {
      const outcome = await shareResult(url)
      if (current() && outcome === 'copied') status.value = 'Скопировано'
    } catch {
      if (current()) status.value = 'Не удалось скопировать ссылку'
    } finally {
      if (current()) sharing.value = false
    }
  }

  return { status, sharing, share }
}
