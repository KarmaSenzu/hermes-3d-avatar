/**
 * launcher.js — entry untuk launcher.html.
 * Menampilkan path model default & memulai avatar window via IPC.
 */

const pathInput = document.getElementById('model-path')
const startBtn = document.getElementById('start-btn')
const statusEl = document.getElementById('status')

async function init() {
  try {
    const defaultPath = await window.hermesAvatar.getDefaultModelPath()
    if (defaultPath && !pathInput.value) {
      pathInput.value = defaultPath
      statusEl.textContent = `Default: ${defaultPath}`
    }
  } catch (err) {
    statusEl.textContent = `Info: ${err.message}`
  }
}

startBtn.addEventListener('click', async () => {
  const modelPath = pathInput.value.trim()
  if (!modelPath) {
    statusEl.textContent = '⚠️ Isi path model terlebih dahulu.'
    return
  }

  startBtn.disabled = true
  statusEl.textContent = 'Memulai…'

  try {
    await window.hermesAvatar.startAvatar(modelPath)
  } catch (err) {
    statusEl.textContent = `Gagal: ${err.message}`
    startBtn.disabled = false
  }
})

init()
