import { readStorage, writeStorage } from './rules'

const KEY = 'cynfas-anagram-sound'

export class GameSound {
  enabled = readStorage(KEY, true)
  private context?: AudioContext

  unlock(): void {
    if (!this.enabled || typeof AudioContext === 'undefined') return
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* audio unavailable */ }
  }

  toggle(): void {
    this.enabled = !this.enabled
    writeStorage(KEY, this.enabled)
    this.unlock()
  }

  play(notes: readonly number[], options: { duration?: number; step?: number; volume?: number; type?: OscillatorType } = {}): void {
    if (!this.enabled) return
    const { duration = 0.12, step = 0.025, volume = 0.055, type = 'sine' } = options
    const context = this.context
    if (!context || context.state === 'closed') return
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * step
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(volume, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + duration)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    })
  }
}
