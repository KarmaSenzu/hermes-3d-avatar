import { DesktopPet } from './desktop-pet.js'
import { loadModelFromBase64, loadMMDModel, loadFBXModel } from './model-loader.js'
import { AvatarController } from './avatar-controller.js'
import { HermesClient } from './hermes-client.js'

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

// --- Chat ke Hermes (Fase 2) ---
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

// Inisialisasi client Hermes (connect + buat session).
let hermes = null
let hermesReady = false
let streamingLine = null // div untuk teks streaming (message.delta)

async function initHermes() {
  try {
    // Baca WS URL + token dari main process (env saat app diluncurkan).
    const cfg = await window.hermesAvatar.getHermesConfig()
    hermes = new HermesClient(cfg.wsUrl, cfg.token)

    await hermes.connect()
    await hermes.createSession('Avatar chat')
    hermesReady = true
    log('avatar', 'Terhubung ke Hermes. Siap! 👋')

    // Jawaban final.
    hermes.on('message.complete', (evt) => {
      const text = evt?.payload?.text ?? ''
      if (streamingLine) {
        // Ganti isi baris streaming dengan teks final.
        streamingLine.textContent = `Hermes: ${text}`
        streamingLine = null
      } else {
        log('avatar', text)
      }
      controller?.setExpression('neutral')
    })

    // Streaming delta.
    hermes.on('message.delta', (evt) => {
      const chunk = evt?.payload?.text ?? ''
      if (!streamingLine) {
        streamingLine = document.createElement('div')
        streamingLine.className = 'avatar'
        chatLog.appendChild(streamingLine)
      }
      streamingLine.textContent = `Hermes: ${streamingLine.textContent.replace(/^Hermes: /, '')}${chunk}`
      chatLog.scrollTop = chatLog.scrollHeight
    })

    // Turn dimulai → thinking.
    hermes.on('message.start', () => {
      controller?.setExpression('thinking')
    })
  } catch (err) {
    hermesReady = false
    log('avatar', `⚠️ Gagal hubung Hermes: ${err.message}`)
  }
}

initHermes()

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return

  log('user', text)
  input.value = ''

  if (!hermesReady) {
    log('avatar', '(offline) Hermes belum terhubung.')
    return
  }

  try {
    await hermes.submitPrompt(text)
  } catch (err) {
    log('avatar', `Gagal kirim: ${err.message}`)
  }
})

// Tutup window → kembali ke launcher.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.hermesAvatar.closeAvatar()
})
