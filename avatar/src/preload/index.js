import { contextBridge, ipcRenderer } from 'electron'

/**
 * Preload — jembatan aman antara renderer (three.js) dan main process.
 * Renderer hanya boleh akses API yang diekspos di sini (context isolation).
 */

const api = {
  // Launcher: mulai avatar dengan model terpilih.
  startAvatar: (modelPath) => ipcRenderer.invoke('avatar:start', modelPath),

  // Avatar: menerima event load model dari main.
  onLoadModel: (callback) => {
    ipcRenderer.on('avatar:load-model', (_event, modelPath) => callback(modelPath))
  },

  // Avatar/launcher: baca file model dari disk → { ok, name, base64, ext }.
  readModel: (modelPath) => ipcRenderer.invoke('avatar:read-model', modelPath),

  // Avatar: ubah path filesystem → URL model:// (untuk MMD .pmx/.pmd + texture).
  getModelUrl: (modelPath) => ipcRenderer.invoke('avatar:model-url', modelPath),

  // Avatar: tutup / kembali ke launcher.
  closeAvatar: () => ipcRenderer.invoke('avatar:close'),

  // Akses path model default (baca dari argumen/env, bukan hardcode mesin lain).
  getDefaultModelPath: () => ipcRenderer.invoke('avatar:default-model'),

  // Konfigurasi Hermes gateway (WS URL + token dari env).
  getHermesConfig: () => ipcRenderer.invoke('avatar:hermes-config')
}

contextBridge.exposeInMainWorld('hermesAvatar', api)
