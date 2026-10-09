import * as THREE from 'three'

/**
 * avatar-controller.js
 * Mengontrol animasi idle avatar: blink, napas, kepala lihat sekitar,
 * goyang badan. Semua digerakkan dari bone VRM + blendshape.
 *
 * API three-vrm (v3.x):
 *  - expressionManager.expressionMap -> { name: expression }
 *  - expressionManager.setValue(name, v)
 *  - vrm.humanoid.getNormalizedBoneNode('neck'|'spine'|'head'|...) -> Object3D
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
    this.baseY = vrm ? vrm.scene.position.y : 0

    // Cache bone untuk animasi idle (fallback raw bila normalized null).
    this.neckBone = this._getBone('neck')
    this.spineBone = this._getBone('spine')
    this.headBone = this._getBone('head')

    // Simpan rotasi awal bone (untuk animasi relatif, tidak menimpa pose).
    this._neckBase = this.neckBone ? this.neckBone.rotation.clone() : null
    this._spineBase = this.spineBone ? this.spineBone.rotation.clone() : null
    this._headBase = this.headBone ? this.headBone.rotation.clone() : null

    // Debug: info bone yang ditemukan (untuk diagnosa T-pose).
    if (typeof console !== 'undefined') {
      console.log('[avatar bones]', JSON.stringify({
        neck: !!this.neckBone,
        spine: !!this.spineBone,
        head: !!this.headBone,
        hasHumanoid: !!(this.vrm && this.vrm.humanoid)
      }))
    }
  }

  _getBone(name) {
    if (!this.vrm?.humanoid) return null
    return (
      this.vrm.humanoid.getNormalizedBoneNode(name) ||
      this.vrm.humanoid.getRawBoneNode(name)
    )
  }

  _randomBlinkDelay() {
    return BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN)
  }

  /**
   * Daftar nama expression yang tersedia di model (dari expressionMap).
   */
  availableExpressions() {
    if (!this.vrm?.expressionManager) return []
    return Object.keys(this.vrm.expressionManager.expressionMap || {})
  }

  /**
   * Set ekspresi wajah (VRM blendshape). "thinking"/"neutral"/emosi dasar.
   * Untuk model non-VRM (MMD/FBX), ini no-op.
   */
  setExpression(name) {
    if (!this.vrm) return
    const expression = this.vrm.expressionManager
    if (!expression) return

    const map = expression.expressionMap || {}
    const names = Object.keys(map)
    if (names.length === 0) return

    // Kandidat nama preset untuk tiap ekspresi (coba berurutan).
    const candidates = {
      neutral: ['neutral', 'Neutral'],
      happy: ['happy', 'Happy', 'joy', 'fun', 'smile'],
      sad: ['sad', 'Sad', 'sorrow'],
      angry: ['angry', 'Angry'],
      surprised: ['surprised', 'Surprised', 'shock'],
      thinking: ['relaxed', 'Relaxed', 'neutral']
    }
    const list = candidates[name] || candidates.neutral

    const target = list.find((n) => names.includes(n))

    // Reset semua lalu set target.
    for (const n of names) expression.setValue(n, 0)
    if (target) {
      expression.setValue(target, 1)
    }
    expression.update()
  }

  /**
   * Lip sync amplitude-based: buka mulut sesuai level audio (0..1).
   * Memakai blendshape "aa" (buka) dari mouthExpressionNames.
   */
  setMouthLevel(level) {
    if (!this.vrm) return
    const expression = this.vrm.expressionManager
    if (!expression) return

    const map = expression.expressionMap || {}
    const names = Object.keys(map)

    // Cari nama mulut yang tersedia (prioritas "aa").
    const mouthShape = ['aa', 'a', 'ee', 'ih', 'ou', 'oh'].find((n) => names.includes(n))
    if (!mouthShape) return

    expression.setValue(mouthShape, Math.max(0, Math.min(1, level)))
    expression.update()
  }

  update(deltaMs) {
    const now = performance.now()
    this.clock += deltaMs

    // Jadwalkan blink.
    if (now >= this.nextBlinkAt) {
      this.blinkUntil = now + BLINK_DURATION
      this.nextBlinkAt = now + this._randomBlinkDelay()
    }

    if (this.vrm) {
      const isBlinking = now < this.blinkUntil
      const blink = isBlinking ? 1 : 0
      const expression = this.vrm.expressionManager
      if (expression) {
        expression.setValue('blink', blink)
        expression.update()
      }

      // Napas: naik-turun halus RELATIF ke baseY.
      const breathe = Math.sin(this.clock * 0.002) * 0.02
      this.vrm.scene.position.y = this.baseY + breathe
    }

    // --- Animasi idle: kepala lihat sekitar + goyang badan ---
    this._updateIdleMotion()
  }

  _updateIdleMotion() {
    const t = this.clock * 0.001 // detik

    // Kepala/leher: lihat kiri-kanan pelan (yaw) + angguk halus (pitch).
    if (this.neckBone && this._neckBase) {
      const yaw = Math.sin(t * 0.5) * 0.2 // ± ~11°
      const pitch = Math.sin(t * 0.9 + 1.3) * 0.06
      this.neckBone.rotation.set(
        this._neckBase.x + pitch,
        this._neckBase.y + yaw,
        this._neckBase.z
      )
    }

    // Kepala (head) ikut gerak halus bila ada bone terpisah.
    if (this.headBone && this._headBase) {
      const yaw = Math.sin(t * 0.5 + 0.5) * 0.1
      this.headBone.rotation.set(
        this._headBase.x + Math.sin(t * 0.7) * 0.04,
        this._headBase.y + yaw,
        this._headBase.z
      )
    }

    // Badan/spine: goyang halus.
    if (this.spineBone && this._spineBase) {
      const sway = Math.sin(t * 0.4) * 0.06
      this.spineBone.rotation.set(
        this._spineBase.x + sway,
        this._spineBase.y + Math.sin(t * 0.35 + 0.7) * 0.08,
        this._spineBase.z
      )
    }
  }
}
