import bgmUrl from './assets/slow-it-down-chill-lofi.mp3'

const averageBand = (data, start, end) => {
  let sum = 0
  const safeEnd = Math.min(end, data.length)

  for (let index = start; index < safeEnd; index += 1) {
    sum += data[index]
  }

  return safeEnd > start ? sum / (safeEnd - start) / 255 : 0
}

export class AudioController {
  constructor({ onLevel, onState }) {
    this.onLevel = onLevel
    this.onState = onState
    this.audio = new Audio(bgmUrl)
    this.audio.loop = true
    this.audio.preload = 'auto'
    this.audio.volume = 0.42
    this.context = null
    this.analyser = null
    this.data = null
    this.frame = null
    this.smoothed = { bass: 0, mids: 0, highs: 0, energy: 0, beat: 0, drop: 0 }
    this.beatHistory = []
    this.lastBeatAt = 0
  }

  ensureGraph() {
    if (this.context) return

    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      throw new Error('Web Audio is not supported')
    }

    this.context = new AudioContext()
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 1024
    this.analyser.smoothingTimeConstant = 0.74
    this.data = new Uint8Array(this.analyser.frequencyBinCount)

    const source = this.context.createMediaElementSource(this.audio)
    source.connect(this.analyser)
    this.analyser.connect(this.context.destination)
  }

  sample = () => {
    if (!this.analyser || this.audio.paused) {
      this.frame = null
      return
    }

    this.analyser.getByteFrequencyData(this.data)
    const next = {
      bass: averageBand(this.data, 2, 18),
      mids: averageBand(this.data, 18, 96),
      highs: averageBand(this.data, 96, 240),
      energy: averageBand(this.data, 2, 240),
    }
    this.beatHistory.push(next.bass)
    if (this.beatHistory.length > 34) {
      this.beatHistory.shift()
    }

    const averageBass = this.beatHistory.reduce((sum, value) => sum + value, 0) / this.beatHistory.length
    const now = performance.now()
    const punch = Math.max(0, next.bass - averageBass)
    const canBeat = now - this.lastBeatAt > 185
    const beat = canBeat && next.bass > 0.16 && punch > 0.055 ? Math.min(1, punch * 5.5 + next.energy * 0.5) : 0
    const drop = beat > 0 && next.energy > 0.18 && next.mids > 0.12 ? Math.min(1, beat * 0.7 + next.highs * 0.65) : 0

    if (beat > 0) {
      this.lastBeatAt = now
    }

    this.smoothed = {
      bass: this.smoothed.bass + (next.bass - this.smoothed.bass) * 0.34,
      mids: this.smoothed.mids + (next.mids - this.smoothed.mids) * 0.28,
      highs: this.smoothed.highs + (next.highs - this.smoothed.highs) * 0.24,
      energy: this.smoothed.energy + (next.energy - this.smoothed.energy) * 0.3,
      beat: Math.max(beat, this.smoothed.beat * 0.74),
      drop: Math.max(drop, this.smoothed.drop * 0.68),
    }

    this.onLevel?.(this.smoothed)
    this.frame = requestAnimationFrame(this.sample)
  }

  async toggle() {
    this.ensureGraph()

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    if (this.audio.paused) {
      await this.audio.play()
      this.onState?.({ playing: true })
      if (!this.frame) this.sample()
      return true
    }

    this.audio.pause()
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = null
    }
    this.onLevel?.({ bass: 0, mids: 0, highs: 0, energy: 0, beat: 0, drop: 0 })
    this.onState?.({ playing: false })
    return false
  }

  setVolume(value) {
    this.audio.volume = Math.min(1, Math.max(0, Number(value)))
  }
}
