import { onScopeDispose } from 'vue'

/** Adds a listener for the lifetime of the calling component. */
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
): void {
  target.addEventListener(type, listener)
  onScopeDispose(() => target.removeEventListener(type, listener))
}
