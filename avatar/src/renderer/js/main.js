import { DesktopPet } from './desktop-pet.js'
import { loadModelFromBase64, loadMMDModel, loadFBXModel } from './model-loader.js'
import { AvatarController } from './avatar-controller.js'

/**
 * main.js — entry renderer untuk window avatar (index.html).
 * 1. Terima path model dari main process.
 * 2. Baca file model (via IPC) + load ke scene.
 * 3. Jalankan animasi idle + mock chat.
 */

const container = document.getElementById('app')
const pet = new DesktopPet(container)
pet.startRenderLoop()

let controller = null

// MIME type berdasarkan ekstensi file model.
const MIME_BY_EXT = {
  vrm: 'model/vrm',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  pmx: 'application/octet-stream',
  pmd: 'application/octet-stream',
  fbx: 'application/octet-stream'
}

// Ekstensi yang di-load via URL `model://` (butuh texture relatif dari disk).
const URL_BASED_EXTS = new Set(['pmx', 'pmd', 'fbx'])

// Terima path model dari main process (via preload).
window.hermesAvatar.onLoadModel(async (modelPath) => {
  try {
    const result = await window.hermesAvatar.readModel(modelPath)
    if (!result.ok) throw new Error(result.error)

    const ext = result.ext

    let scene, vrm
    if (URL_BASED_EXTS.has(ext)) {
      // MMD/FBX: load via URL `model://` (custom protocol serve file + texture).
      const modelUrl = await window.hermesAvatar.getModelUrl(modelPath)
      if (ext === 'fbx') {
        const loaded = await loadFBXModel(modelUrl)
        scene = loaded.scene
        vrm = loaded.vrm
      } else {
        const loaded = await loadMMDModel(modelUrl)
        scene = loaded.scene
        vrm = loaded.vrm
      }
    } else {
      // VRM/GLB: load dari base64.
      const mime = MIME_BY_EXT[ext] || 'application/octet-stream'
      const loaded = await loadModelFromBase64(result.base64, mime)
      scene = loaded.scene
      vrm = loaded.vrm
    }

    pet.setModel(scene)
    controller = new AvatarController(vrm)
    pet.onBeforeRender = (deltaMs) => controller?.update(deltaMs)
    log('avatar', 'Model dimuat. Halo! 👋')
  } catch (err) {
    log('avatar', `Gagal memuat model: ${err.message}`)
  }
})

// --- Mock chat (Fase 1: belum terhubung ke Hermes) ---
const form = document.getElementById('chat-form')
const input = document.getElementById('chat-input')
const chatLog = document.getElementById('chat-log')

function log(who, text) {
  const line = document.createElement('div')
  line.className = who
  line.textContent = `${who === 'user' ? 'Kamu' : 'Hermes'}: ${text}`
  chatLog.appendChild(line)
  chatLog.scrollTop = chatLog.scrollHeight
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  log('user', text)
  input.value = ''

  // Balasan dummy — nanti diganti koneksi ke hermes serve (Fase 2).
  setTimeout(() => {
    log('avatar', `(mock) Kamu berkata: "${text}"`)
  }, 400)
})

// Tutup window → kembali ke launcher.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.hermesAvatar.closeAvatar()
})
