import { app, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { readFile } from 'fs/promises'

/**
 * Main process — Hermes 3D Avatar
 * Membuat window desktop pet: transparan, always-on-top, frameless.
 *
 * Arsitektur window:
 *  - `launcher` : window kecil pertama untuk pilih model + start.
 *  - `avatar`   : window desktop pet (transparan) yang menampilkan avatar 3D.
 */

let launcherWindow = null
let avatarWindow = null

function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    frame: true,
    title: 'Hermes 3D Avatar — Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  })

  // electron-vite: dev pakai dev server, prod pakai file hasil build.
  if (process.env['ELECTRON_RENDERER_URL']) {
    launcherWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/launcher.html`)
  } else {
    launcherWindow.loadFile(join(__dirname, '../renderer/launcher.html'))
  }

  launcherWindow.on('closed', () => {
    launcherWindow = null
  })
}

function createAvatarWindow(modelPath) {
  avatarWindow = new BrowserWindow({
    width: 360,
    height: 480,
    transparent: true, // kunci desktop pet
    frame: false, // frameless → kita buat drag manual
    hasShadow: false, // hindari bayangan kotak di sekitar karakter
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  })

  // macOS: tampil di semua workspace agar selalu "menemani" user.
  if (process.platform === 'darwin') {
    avatarWindow.setAlwaysOnTop(true, 'floating')
    avatarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  if (process.env['ELECTRON_RENDERER_URL']) {
    avatarWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html`)
  } else {
    avatarWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Kirim path model ke renderer setelah siap (renderer yang baca via read-model).
  avatarWindow.webContents.on('did-finish-load', () => {
    avatarWindow.webContents.send('avatar:load-model', modelPath)
  })

  avatarWindow.on('closed', () => {
    avatarWindow = null
  })
}

// IPC: launcher → main → buka avatar window dengan model terpilih.
ipcMain.handle('avatar:start', (_event, modelPath) => {
  if (avatarWindow && !avatarWindow.isDestroyed()) {
    avatarWindow.focus()
    return { ok: true, reused: true }
  }
  createAvatarWindow(modelPath)
  if (launcherWindow) launcherWindow.hide()
  return { ok: true, reused: false }
})

// IPC: avatar window bisa minta fokus/drag via OS-native (drag region).
ipcMain.handle('avatar:close', () => {
  if (avatarWindow) avatarWindow.close()
  if (launcherWindow && !launcherWindow.isDestroyed()) launcherWindow.show()
})

// IPC: path model default (dipakai launcher untuk pre-select).
ipcMain.handle('avatar:default-model', () => {
  return join(__dirname, '../../assets/models/default.vrm')
})

// IPC: baca file model dari disk → kirim base64 + nama file ke renderer.
// Renderer tidak bisa akses filesystem langsung, jadi main yang membacakan.
ipcMain.handle('avatar:read-model', async (_event, modelPath) => {
  try {
    const buffer = await readFile(modelPath)
    const name = modelPath.split('/').pop() || 'model'
    return {
      ok: true,
      name,
      base64: buffer.toString('base64'),
      ext: name.split('.').pop()?.toLowerCase()
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// IPC: ubah path filesystem model → URL `model://` (untuk MMD yang butuh texture relatif).
ipcMain.handle('avatar:model-url', (_event, modelPath) => {
  // Encode tiap segmen path (jaga `/` sebagai pemisah) agar texture relatif
  // bisa di-resolve MMDLoader dengan benar terhadap base URL.
  const segments = modelPath.split('/')
  const encoded = segments.map((s) => encodeURIComponent(s)).join('/')
  return `model://local/${encoded}`
})

// MIME types untuk file aset model (texture, dsb).
const MIME_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.bmp': 'image/bmp',
  '.tga': 'image/tga',
  '.gif': 'image/gif',
  '.spa': 'image/tga',
  '.sph': 'image/tga',
  '.dds': 'image/vnd-ms.dds',
  '.pmx': 'application/octet-stream',
  '.pmd': 'application/octet-stream',
  '.vmd': 'application/octet-stream',
  '.fbx': 'application/octet-stream'
}

// Register custom protocol `model://` untuk serve file model + texture dari disk.
// Diperlukan karena MMDLoader me-resolve texture relatif ke URL model.
protocol.registerSchemesAsPrivileged([
  { scheme: 'model', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

function registerModelProtocol() {
  protocol.handle('model', async (request) => {
    try {
      const url = new URL(request.url)
      // Format: model://local/<segmen-encoded path> (tiap segmen di-encode, `/` tetap).
      const encoded = url.pathname.replace(/^\//, '')
      const filePath = decodeURIComponent(encoded)

      const ext = extname(filePath).toLowerCase()
      const mime = MIME_MAP[ext] || 'application/octet-stream'

      const data = await readFile(filePath)
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': mime }
      })
    } catch (err) {
      return new Response('Not found', { status: 404 })
    }
  })
}

app.whenReady().then(() => {
  registerModelProtocol()
  createLauncherWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createLauncherWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
