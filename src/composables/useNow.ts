import { onScopeDispose, shallowRef } from 'vue'

/** Current time, refreshed every `interval` ms while the calling component is alive. */
export function useNow(interval = 1000) {
  const now = shallowRef(new Date())
  const timer = setInterval(() => { now.value = new Date() }, interval)
  onScopeDispose(() => clearInterval(timer))
  return now
}
