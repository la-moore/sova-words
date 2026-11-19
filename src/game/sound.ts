import { loadPlayer, onPlayerChange, toggleSetting } from './storage'

type ToneOptions = { duration?: number; step?: number; volume?: number; type?: OscillatorType }

/** Short synthesized tones; follows the saved sound setting wherever it is changed. */
export class GameSound {
  enabled = loadPlayer().settings.sound
  private context?: AudioContext
  private readonly unsubscribe = onPlayerChange(({ settings }) => this.setEnabled(settings.sound))

  unlock(): void {
    if (!this.enabled || typeof AudioContext === 'undefined') return
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* audio unavailable */ }
  }

  /** Must run inside a user gesture: turning sound on unlocks the audio context. */
  toggle(): void {
    toggleSetting('sound')
  }

  dispose(): void {
    this.unsubscribe()
    void this.context?.close().catch(() => {})
  }

  private setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return
    this.enabled = enabled
    this.unlock()
  }

  play(notes: readonly number[], options: ToneOptions = {}): void {
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
