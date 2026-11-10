export type SoundKind = 'accepted' | 'rejected' | 'win' | 'emote'

interface Note {
  frequency: number
  duration: number
  offset: number
  type: OscillatorType
  gain: number
}

const NOTES: Record<SoundKind, Note[]> = {
  accepted: [
    { frequency: 660, duration: 0.09, offset: 0, type: 'triangle', gain: 0.08 },
    { frequency: 990, duration: 0.12, offset: 0.09, type: 'triangle', gain: 0.08 },
  ],
  rejected: [
    { frequency: 220, duration: 0.14, offset: 0, type: 'sawtooth', gain: 0.05 },
    { frequency: 160, duration: 0.16, offset: 0.12, type: 'sawtooth', gain: 0.05 },
  ],
  win: [
    { frequency: 523, duration: 0.12, offset: 0, type: 'triangle', gain: 0.08 },
    { frequency: 659, duration: 0.12, offset: 0.12, type: 'triangle', gain: 0.08 },
    { frequency: 784, duration: 0.12, offset: 0.24, type: 'triangle', gain: 0.08 },
    { frequency: 1047, duration: 0.22, offset: 0.36, type: 'triangle', gain: 0.09 },
  ],
  emote: [
    { frequency: 880, duration: 0.08, offset: 0, type: 'sine', gain: 0.05 },
  ],
}

let context: AudioContext | null = null

const audioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    if (!context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) {
        return null
      }
      context = new Ctor()
    }
    if (context.state === 'suspended') {
      void context.resume()
    }
    return context
  } catch {
    return null
  }
}

export const playSound = (kind: SoundKind, enabled: boolean): void => {
  if (!enabled) {
    return
  }

  const ctx = audioContext()
  if (!ctx) {
    return
  }

  const start = ctx.currentTime
  for (const note of NOTES[kind]) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = note.type
    oscillator.frequency.value = note.frequency
    gain.gain.setValueAtTime(0.0001, start + note.offset)
    gain.gain.exponentialRampToValueAtTime(note.gain, start + note.offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.offset + note.duration)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(start + note.offset)
    oscillator.stop(start + note.offset + note.duration + 0.02)
  }
}
