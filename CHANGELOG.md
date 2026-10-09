# Changelog

Semua perubahan penting pada project ini dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/),
dan versioning mengikuti [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fase 2 — Integrasi Hermes (WS A) — 2026-10-09

#### Added
- **`hermes-client.js`**: WebSocket JSON-RPC client untuk `hermes serve`
  (connect, `session.create`, `prompt.submit`, event handler).
- **Chat nyata ke Hermes**: input teks → `prompt.submit` → streaming
  (`message.delta`) + jawaban final (`message.complete`).
- **Ekspresi thinking/netral**: `message.start` → thinking, `message.complete`
  → neutral (via `AvatarController.setExpression`).
- **Konfigurasi gateway**: WS URL + token dibaca dari env
  (`HERMES_DASHBOARD_SESSION_TOKEN`, `HERMES_WS_URL`) via IPC.

#### Fixed
- **Auth WS Hermes**: koreksi — endpoint `/api/ws` butuh `?token=` (bukan tanpa
  token seperti jawaban awal). Token via env `HERMES_DASHBOARD_SESSION_TOKEN`.

#### Known Limitations
- Plugin `avatar-bridge` (WS B) untuk thinking presisi / emosi via tag / tool
  event belum diimplementasikan (Fase 2 item 4).

---

### Fase 1 — Prototipe Visual (MVP) — 2026-10-09

#### Added
- **Window desktop pet**: Electron window transparan + always-on-top + frameless
  + area drag (`-webkit-app-region: drag`).
- **Launcher**: window awal untuk memilih file model lalu "Mulai".
- **Loader model multi-format**:
  - `.vrm` — three-vrm (GLTFLoader + VRMLoaderPlugin), format utama.
  - `.glb` / `.gltf` — GLTFLoader.
  - `.pmx` / `.pmd` (MMD) — MMDLoader via custom protocol `model://`.
  - `.fbx` — FBXLoader via custom protocol `model://`.
- **Custom protocol `model://`**: serve file model + texture dari disk ke
  renderer (karena renderer Electron tidak bisa fetch file lokal langsung).
- **Animasi idle dasar**: blink (blendshape) + napas (posisi naik-turun).
- **Framing kamera otomatis**: hitung bounding box → atur jarak/arah kamera agar
  model full-body (kepala→kaki) masuk frame; responsif terhadap resize.
- **Komposisi avatar** (tunable): `sideOffsetRatio` (kiri/kanan),
  `verticalOffsetRatio` (atas/bawah), `zoomFactor` (ukuran), `marginRatio`.
- **Input teks mock**: form chat → balasan dummy (belum terhubung ke Hermes).
- **Build tooling**: Vite + electron-vite (dev dengan hot reload).

#### Docs / Infra
- `CONTRIBUTING.md` — standar kebersihan, penamaan, conventional commits.
- `docs/ARCHITECTURE.md`, `docs/API_BRIDGE.md`, `docs/ROADMAP.md`,
  `docs/DECISIONS.md`, `docs/GIT_SETUP.md`, `docs/MANUAL_TASKS.md`.
- `hermes-qa/` — Q&A dengan Hermes (integrasi, TTS/STT, analisa device).
- `.gitignore`, `.editorconfig`, `LICENSE` (MIT), `README.md`.

#### Known Limitations
- Model FBX/MMD **tanpa blendshape** → ekspresi wajah & lip sync (blink/emosi)
  hanya jalan untuk format VRM. FBX/MMD tampil statis / bone animation saja.
- Texture MMD/FBX yang path-nya relatif harus berada utuh di folder model.

---

## [0.0.0] — Fase 0 — Persiapan — 2026-10-09

- Visi, goals, dan keputusan arsitektur (Electron + three.js + three-vrm + MMD.js).
- Jawaban Hermes terkunci: `hermes serve` sebagai bridge, Edge TTS (id-ID),
  faster-whisper lokal (base/small), Rhubarb lip sync.
- Struktur repo + Git init.
