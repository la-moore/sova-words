import { onScopeDispose } from 'vue'

/** `setTimeout` and `requestAnimationFrame` that are all cancelled when the component unmounts. */
export function useTimeouts() {
  const timeouts = new Set<ReturnType<typeof setTimeout>>()
  const frames = new Set<number>()

  onScopeDispose(() => {
    timeouts.forEach(clearTimeout)
    frames.forEach(cancelAnimationFrame)
  })

  return {
    after(delay: number, callback: () => void) {
      const id = setTimeout(() => {
        timeouts.delete(id)
        callback()
      }, delay)
      timeouts.add(id)
    },
    frame(callback: FrameRequestCallback) {
      const id = requestAnimationFrame(time => {
        frames.delete(id)
        callback(time)
      })
      frames.add(id)
    },
  }
}
