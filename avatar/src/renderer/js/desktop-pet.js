/**
 * desktop-pet.js
 * Logika desktop pet: membuat canvas three.js, kamera, lampu, dan render loop.
 * File ini mengatur POSISI & UKURAN karakter (via kamera 3D + posisi model).
 */

import * as THREE from 'three'

export class DesktopPet {
  constructor(container) {
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0) // transparan
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000)
    this.camera.position.set(0, 1.5, 5)
    this.camera.lookAt(0, 1.2, 0)

    // Cahaya: ambient + 1 directional (hemat GPU).
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2))
    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(0, 3, 2)
    this.scene.add(dir)

    // Konfigurasi komposisi karakter.
    this.sideOffsetRatio = -0.56 // 0 = tengah; positif = kanan, negatif = kiri (fraksi lebar model)
    this.verticalOffsetRatio = 0.76 // 0 = tengah; positif = naik ke atas (fraksi tinggi model), agar di atas chat
    this.marginRatio = 0.12 // margin aman 12% di sekeliling model
    this.zoomFactor = 2.0 // 1 = model memenuhi frame; 2 = model tampak setengah ukuran

    this._onResize = this._onResize.bind(this)
    window.addEventListener('resize', this._onResize)
    this._onResize()

    // Batasi FPS saat idle (hemat resource).
    this.targetFps = 30
    this.frameInterval = 1000 / this.targetFps
    this.lastFrame = performance.now()
  }

  setModel(object) {
    if (this.currentModel) this.scene.remove(this.currentModel)
    this.currentModel = object
    this.scene.add(object)
    this._onResize() // pastikan aspect benar
    this._frameModel()
  }

  /**
   * Atur framing kamera agar SELURUH model (kepala→kaki, tangan terentang)
   * masuk frame, dengan komposisi yang bisa digeser ke kanan.
   *
   * Pendekatan yang BENAR:
   *  1. Pastikan matrix world ter-update dulu (updateMatrixWorld).
   *  2. Hitung bounding box yang valid (model pada posisi dasar, offset 0).
   *  3. Hitung jarak kamera dari tinggi + lebar model (fov + aspect).
   *  4. Kamera lurus menghadap +Z ke titik tengah model.
   *  5. Geser MODEL (bukan kamera) ke kanan untuk komposisi kanan.
   *     Karena kamera diam & lurus, pergeseran model menghasilkan pergeseran
   *     komposisi NYATA di layar tanpa mengubah sudut pandang.
   */
  _frameModel() {
    if (!this.currentModel) return

    // 0. Kembalikan model ke posisi dasar (tanpa offset), agar box diukur benar.
    this.currentModel.position.x = 0
    this.currentModel.position.y = 0

    // 1. Perbarui seluruh transformasi (termasuk bone VRM) sebelum hitung box.
    this.currentModel.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(this.currentModel)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // 2. Validasi bounding box.
    if (!isFinite(size.x) || !isFinite(size.y) || !isFinite(size.z)) return
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) return

    const modelHeight = size.y
    const modelWidth = Math.max(size.x, size.z)

    // 3. Jarak kamera agar tinggi & lebar model sama-sama masuk frame.
    const fov = (this.camera.fov * Math.PI) / 180
    const aspect = this.camera.aspect || 1
    const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * aspect)

    const distByHeight = modelHeight / (2 * Math.tan(fov / 2))
    const distByWidth = modelWidth / (2 * Math.tan(horizontalFov / 2))
    const dist = Math.max(distByHeight, distByWidth) * (1 + this.marginRatio) * this.zoomFactor

    // 4. Kamera lurus di depan model, sejajar titik tengahnya.
    this.camera.position.set(center.x, center.y, center.z + dist)
    this.camera.lookAt(center)

    this.camera.near = Math.max(0.01, dist / 100)
    this.camera.far = dist * 100
    this.camera.updateProjectionMatrix()

    // 5. Geser MODEL untuk komposisi: horizontal (kiri/kanan) + vertikal (atas).
    //    Kamera tetap diam & lurus, sehingga pergeseran model menghasilkan
    //    pergeseran komposisi NYATA di layar tanpa mengubah sudut pandang.
    const offsetX = modelWidth * this.sideOffsetRatio
    const offsetY = modelHeight * this.verticalOffsetRatio
    this.currentModel.position.x = offsetX
    this.currentModel.position.y = offsetY
  }

  _onResize() {
    const w = this.container.clientWidth || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight
    if (w === 0 || h === 0) return

    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()

    // Re-frame agar tetap full body saat ukuran berubah (responsive).
    if (this.currentModel) this._frameModel()
  }

  startRenderLoop() {
    const loop = (now) => {
      requestAnimationFrame(loop)
      if (now - this.lastFrame < this.frameInterval) return
      this.lastFrame = now

      if (this.onBeforeRender) this.onBeforeRender(this.frameInterval)
      this.renderer.render(this.scene, this.camera)
    }
    requestAnimationFrame(loop)
  }
}
