/**
 * avatar-controller.js
 * Mengontrol animasi idle avatar: blink (kedip mata) & napas (naik-turun).
 * Untuk VRM, blink memakai blendshape "blink"; napas memakai offset posisi.
 */

const BLINK_INTERVAL_MIN = 2000 // ms
const BLINK_INTERVAL_MAX = 6000 // ms
const BLINK_DURATION = 150 // ms

export class AvatarController {
  constructor(vrm) {
    this.vrm = vrm
    this.nextBlinkAt = performance.now() + this._randomBlinkDelay()
    this.blinkUntil = 0
    this.clock = 0
    // Base posisi Y model (di-set oleh desktop-pet saat framing).
    // Napas ditambahkan RELATIF ke base ini, bukan menimpa.
    this.baseY = vrm ? vrm.scene.position.y : 0
  }

  _randomBlinkDelay() {
    return BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN)
  }

  update(deltaMs) {
    const now = performance.now()
    this.clock += deltaMs

    // Jadwalkan blink.
    if (now >= this.nextBlinkAt) {
      this.blinkUntil = now + BLINK_DURATION
      this.nextBlinkAt = now + this._randomBlinkDelay()
    }

    // Terapkan blink value 0..1 ke blendshape.
    if (this.vrm) {
      const isBlinking = now < this.blinkUntil
      const blink = isBlinking ? 1 : 0
      const expression = this.vrm.expressionManager
      if (expression) {
        expression.setValue('blink', blink)
      }
      expression?.update()

      // Napas: naik-turun halus RELATIF ke baseY (tidak menimpa offset framing).
      const breathe = Math.sin(this.clock * 0.002) * 0.02
      this.vrm.scene.position.y = this.baseY + breathe
    }
  }
}
