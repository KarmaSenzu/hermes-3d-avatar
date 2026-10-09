/**
 * service-manager.js
 * Mengelola service yang dibutuhkan avatar:
 *   - 9Router        -> DETEKSI saja (user yang mengaktifkan manual).
 *   - hermes serve   -> AUTO-SPAWN (port 9119).
 *
 * Fitur:
 *   - health check port (TCP connect — lebih robust dari HTTP GET)
 *   - anti-duplikat (tidak spawn ulang jika sudah jalan)
 *   - shutdown bersih saat app quit
 *   - token Hermes PERSISTEN (disimpan ke file, reuse antar sesi)
 *     -> mencegah token mismatch dengan hermes serve yang sudah jalan
 */

import { spawn } from 'child_process'
import net from 'net'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const HERMES_PORT = 9119
const ROUTER_PORT = 20128
const HERMES_HOST = '127.0.0.1'

// Path state dir (cross-platform: ~/.hermes-avatar di semua OS).
const STATE_DIR = join(homedir(), '.hermes-avatar')
const TOKEN_FILE = join(STATE_DIR, 'session-token')

// Command hermes — di Windows pakai hermes.cmd (agar spawn berhasil).
const HERMES_CMD = process.platform === 'win32' ? 'hermes.cmd' : 'hermes'

// Token persisten: reuse token lama bila ada, agar konsisten antar sesi.
const SESSION_TOKEN = loadOrCreateToken()

function loadOrCreateToken() {
  // Prioritas: env eksplisit > file tersimpan > generate baru.
  if (process.env['HERMES_DASHBOARD_SESSION_TOKEN']) {
    return process.env['HERMES_DASHBOARD_SESSION_TOKEN']
  }
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = readFileSync(TOKEN_FILE, 'utf8').trim()
      if (t) return t
    }
  } catch {
    // ignore
  }
  const token = 'avatar-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  try {
    mkdirSync(STATE_DIR, { recursive: true })
    writeFileSync(TOKEN_FILE, token, 'utf8')
  } catch {
    // ignore (hanya cache)
  }
  return token
}

const children = []

// Deteksi port via TCP connect (lebih andal dari HTTP GET).
function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 800 })
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true
    await sleep(400)
  }
  return false
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Deteksi status 9Router (user yang mengaktifkan manual).
 */
async function checkRouter() {
  const running = await isPortOpen(ROUTER_PORT)
  return { running }
}

/**
 * Jalankan hermes serve jika belum jalan di port 9119.
 * Token PERSISTEN di-inject agar cocok dengan avatar.
 */
async function startHermes() {
  if (await isPortOpen(HERMES_PORT)) {
    return { already: true, ok: true }
  }
  const child = spawn(
    HERMES_CMD,
    ['serve', '--host', HERMES_HOST, '--port', String(HERMES_PORT)],
    {
      stdio: 'ignore',
      // Windows: spawn .cmd butuh shell; Linux/macOS tidak.
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        HERMES_DASHBOARD_SESSION_TOKEN: SESSION_TOKEN
      }
    }
  )
  children.push({ name: 'hermes', child })
  const ok = await waitForPort(HERMES_PORT)
  return { already: false, ok, child }
}

/**
 * Siapkan service: deteksi 9Router + auto-spawn hermes serve.
 */
export async function startAllServices() {
  const router = await checkRouter()
  const hermes = await startHermes()
  return { router, hermes, token: SESSION_TOKEN }
}

/**
 * Hentikan semua child process (shutdown bersih).
 */
export function stopAllServices() {
  for (const { child } of children) {
    try {
      child.kill('SIGTERM')
    } catch {
      // sudah mati
    }
  }
  children.length = 0
}

export { SESSION_TOKEN, HERMES_PORT, ROUTER_PORT, isPortOpen }
