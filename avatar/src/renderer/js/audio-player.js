/**
 * audio-player.js
 * Memutar audio (dari buffer TTS) + menyediakan amplitude real-time untuk
 * lip sync via Web Audio AnalyserNode.
 */

export class AudioPlayer {
  constructor() {
    this.audioContext = null
    this.analyser = null
    this.currentSource = null
    this.onEnded = null
  }

  _ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8
      this.analyser.connect(this.audioContext.destination)
    }
    return this.audioContext
  }

  /**
   * Putar audio dari ArrayBuffer.
   * Mengembalikan Promise yang resolve saat selesai diputar.
   */
  async play(buffer) {
    const ctx = this._ensureContext()
    if (ctx.state === 'suspended') await ctx.resume()

    // Hentikan audio sebelumnya.
    this.stop()

    const audioBuffer = await ctx.decodeAudioData(buffer.slice(0))
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.analyser)
    source.connect(ctx.destination)
    this.currentSource = source

    return new Promise((resolve) => {
      source.onended = () => {
        this.currentSource = null
        if (this.onEnded) this.onEnded()
        resolve()
      }
      source.start()
    })
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // sudah berhenti
      }
      this.currentSource = null
    }
  }

  /**
   * Ambil level amplitude saat ini (0..1) untuk lip sync.
   */
  getLevel() {
    if (!this.analyser) return 0
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    return Math.min(1, rms * 3) // normalisasi
  }

  get isPlaying() {
    return this.currentSource != null
  }
}
