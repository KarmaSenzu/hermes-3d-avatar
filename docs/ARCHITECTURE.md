# Hermes 3D Avatar — Arsitektur

> **Versi:** 1.1 (Draft)
> **Status:** PLANNING — keputusan inti sudah terkunci
> **Terkait:** lihat `GOALS.md`, `API_BRIDGE.md`, `ROADMAP.md`
> **Jawaban Hermes:** `../hermes-qa/01-hermes-integration.md`, `02-tts-stt.md`, `03-device-analysis.md`

---

## 1. Ringkasan Keputusan Arsitektur

Dokumen ini memperbarui rekomendasi di `GOALS.md` bagian 6 berdasarkan kebutuhan
kamu yang lebih spesifik dan **jawaban resmi Hermes** (inspeksi langsung instalasi
Hermes v0.18.2 di `~/.hermes`):

| Aspek | Keputusan Awal (GOALS) | Keputusan Final | Alasan |
|-------|------------------------|-----------------|--------|
| **Engine** | Godot 4 (utama) | **Electron + three.js + three-vrm + MMD.js** | Dukungan native `.pmd`/`.pmx` (MMD) + transparan + mudah di-publish & dipakai orang lain |
| **Model** | VRM / GLB | **MMD (.pmd/.pmx) + VRM + GLB** (v1: GLB low-poly ≤ 50k tri) | User bisa kostum sendiri, drop-in file |
| **Bridge** | Buat bridge server (FastAPI/Node) | **`hermes serve` (JSON-RPC/WS di `127.0.0.1:9119`) + plugin `avatar-bridge`** | Bridge sudah ada di Hermes, tidak perlu dibangun ulang |
| **TTS** | — | **Hermes TTS → Edge TTS, `id-ID-GadisNeural`** (gratis, sudah aktif) | Nol setup end-user, nol API key |
| **STT** | — | **Hermes STT → faster-whisper lokal, model `base`/`small`** | Offline, gratis, sudah aktif |
| **Lip sync** | — | **Rhubarb Lip Sync** (offline, JSON viseme) | Edge TTS tidak sediakan viseme |
| **Emosi** | — | **Tag `[emotion:...]`** via `transform_llm_output` | Hermes tak punya field emosi bawaan |
| **Launcher/Settings** | — | **Ada: launcher + panel setting sebelum mulai** | Sesuai keinginan "ruang setting sendiri" |
| **Target OS** | macOS | **Cross-platform (macOS + Windows + Linux)** | via Electron |
| **Mode input** | salah satu | **Teks + suara sekaligus** | — |
| **Device** | — | **MacBook Air M2 / 8GB / Metal 3** → low-poly, batasi FPS | Lihat `hermes-qa/03` |

### Kenapa berpindah ke Electron + three.js (bukan Godot)

1. **Dukungan MMD native.** Godot tidak punya importer `.pmd`/`.pmx` bawaan.
   three.js punya `MMD.js` (loader + physics) yang matang dan teruji — persis
   yang dipakai referensi kamu (`SystemAnimatorOnline`).
2. **"Tinggal jalan tanpa ribet".** Kamu ingin publish ke GitHub dan orang lain
   mudah pakai. Electron menghasilkan build `.exe`/`.app`/`.AppImage` yang
   end-user tinggal download & jalankan, tanpa perlu install engine/godot.
3. **Transparan + always-on-top.** Electron punya `transparent` + `alwaysOnTop`
   native, didukung baik di ketiga OS.
4. **Ekosistem web.** three-vrm, MMD.js, Web Speech API, MediaPipe (opsional
   motion capture) semuanya tersedia di JS.

> **Catatan (trade-off):** Electron lebih berat RAM daripada Godot. Untuk
> desktop pet low-poly yang berjalan di background, ini perlu mitigasi
> (batasi framerate saat idle, model low-poly, dsb). Lihat bagian 6.

---

## 2. Prinsip Inti (tidak berubah)

```
                        ┌─────────────────────────────────┐
   User ──mic/teks──▶  │           HERMES (OTAK)          │
                        │  · Conversational logic          │
                        │  · Tools & plugins               │
                        │  · Memory (Mnemosyne)            │
                        │  · Integrasi (HA, cron, dll)     │
                        └───────────────┬─────────────────┘
                                        │
                             Bridge (WebSocket/MQTT/HTTP)
                                        │
                        ┌───────────────▼─────────────────┐
                        │       AVATAR 3D (AKTOR)          │
                        │  · Electron window transparan    │
                        │  · three.js render MMD/VRM       │
                        │  · Animasi: idle, jalan, thinking│
                        │  · Lip sync + ekspresi           │
                        │  · Suara (TTS)                   │
                        └─────────────────────────────────┘
```

**Hermes = otak, Avatar = aktor.** Dipisah lewat bridge supaya avatar bisa
diganti engine/model tanpa menyentuh logika Hermes.

---

## 3. Komponen Sistem

### 3.1 Avatar App (Electron + three.js)

Proses utama yang tampil di layar sebagai desktop pet.

- **Main process (Electron):** buat window transparan, always-on-top,
  frameless, draggable, click-through opsional, tray icon.
- **Renderer process:** three.js scene → load model MMD/VRM → animasi.
- **Modul JS:**
  - `model_loader.js` — load `.pmd`/`.pmx` (MMD.js) atau `.vrm` (three-vrm) atau `.glb`.
  - `bridge_client.js` — WebSocket client ke bridge server.
  - `avatar_controller.js` — kontrol animasi & ekspresi (idle, walk, thinking, speaking).
  - `lip_sync.js` — sinkronkan viseme ke morph/blendshape mulut.
  - `desktop_pet.js` — logika jalan di layar, respon klik/drag.
  - `settings.js` — baca/tulis konfigurasi (lihat 3.3).

### 3.2 Bridge = Hermes (tidak perlu server terpisah)

**Penting:** sesuai jawaban Hermes, **tidak perlu membangun bridge server baru.**
Hermes sudah menyediakan dua jalur resmi:

1. **`hermes serve`** — gateway JSON-RPC/WebSocket di `127.0.0.1:9119`
   (port bisa diubah `--port`). Ini API yang dipakai Electron desktop app &
   dashboard resmi Hermes. Avatar connect sebagai client untuk chat utama
   (teks masuk/keluar, sesi, streaming).
2. **Plugin `avatar-bridge`** (di `~/.hermes/plugins/`) — register hook
   (`pre_llm_call`, `post_llm_call`, `post_tool_call`, `transform_llm_output`,
   dll) lalu push event JSON ke avatar via WebSocket/HTTP lokal.

Tahapan integrasi:
- **Fase 1 (MVP):** hanya `hermes serve` (WS A). `thinking` di-infer dari
  "pesan terkirim & belum ada balasan", `speaking` dari balasan RPC.
- **Fase 2:** tambah plugin `avatar-bridge` (WS B) untuk event presisi:
  thinking, emosi (via tag), tool_executed.

Keamanan: `hermes serve` default bind `127.0.0.1` (aman tanpa token untuk MVP).
Jangan bind ke `0.0.0.0`.

Referensi yang harus dibaca saat implementasi (di mesin user):
- `~/.hermes/hermes-agent/apps/shared` — client JSON-RPC resmi (sumber kebenaran skema).
- `~/.hermes/hermes-agent/apps/desktop` — reference renderer Electron.
- `~/.hermes/hermes-agent/hermes_cli/plugins.py` — daftar `VALID_HOOKS` + `register(ctx)`.
- `~/.hermes/plugins/mnemosyne/` — contoh plugin nyata (manifest + register).

### 3.3 Launcher + Settings Panel

Keinginan: **ada tempat/ruang sendiri untuk mengatur setting sebelum memulai.**

- **Launcher** — window kecil saat pertama buka: pilih model, cek koneksi
  bridge/Hermes, pilih mode (teks/suara), lalu "Start".
- **Settings panel** — bisa dibuka dari tray/klik-kanan avatar. Berisi:
  - Path/upload file model (`.pmd`/`.pmx`/`.vrm`/`.glb`).
  - Ukuran & skala avatar.
  - Mode window (transparan / wallpaper / fullscreen).
  - TTS & STT engine + API key.
  - Endpoint bridge/Hermes.
  - Behavior (idle, sensitivitas klik, framerate).
- Konfigurasi disimpan di file JSON lokal (mis. `~/.hermes-avatar/settings.json`).

### 3.4 STT / TTS (sudah final)

Modul suara **sudah ditentukan** (jawaban Hermes di `hermes-qa/02-tts-stt.md`):

- **TTS:** Hermes TTS bawaan → **Edge TTS**, voice `id-ID-GadisNeural` (atau
  `id-ID-ArdiNeural`). Sudah aktif di `~/.hermes/config.yaml` (ganti voice ke ID).
  Alternatif premium: ElevenLabs (streaming, butuh API key).
- **STT:** Hermes STT bawaan → **faster-whisper lokal**, model `base` (naik ke
  `small` bila akurasi kurang). Set `stt.local.language: id`.
- **Lip sync:** **Rhubarb Lip Sync** (offline) — Edge TTS tidak sediakan viseme,
  jadi generate JSON viseme dari audio. Alternatif kasar: amplitude-based lip
  sync (Web Audio `AnalyserNode`), nol dependency.
- **Latensi:** sentence chunking + pre-generate frasa umum (cache `assets/audio/`).

**Prinsip penting:** bridge tetap **provider-agnostic**. Avatar cukup menerima
`audio_b64` (atau file) dari Hermes, jadi upgrade TTS/STT nanti cukup ubah config
Hermes tanpa ubah kode avatar. Untuk MVP, biarkan **Hermes yang generate audio**
(agar konsisten dengan "Hermes = otak").

---

## 4. Alur Data Teknis

```
[User Input: mic/teks]
        │
        ▼
[STT: faster-whisper] ──teks──▶ [Hermes Core] ──jawaban──▶ [hermes serve :9119]
   (via Hermes STT)                 │                          │
                                    │ (thinking event)         ▼
                                    ▼                     [Avatar App]
                     [event: thinking] ◀────────  · terima JSON (WS A/B)
                     [event: speaking] ◀────────  · TTS (Edge) → audio
                                    │                · viseme → Rhubarb → lip sync
                                    ▼                · ekspresi → morph
                     [Memory/Tools]                  · animasi idle/thinking
```

Dua kanal WebSocket (dari jawaban Hermes):

- **WS A** = chat utama via `hermes serve` (kirim teks, terima jawaban/streaming, sesi).
- **WS B** = event realtime (`thinking`/`emotion`/`tool`) dari plugin `avatar-bridge`.

---

## 5. Struktur Folder (usulan terbaru)

```
Hermes 3D Avatar (Asisten Ai )/
├── README.md
├── docs/
│   ├── GOALS.md
│   ├── ARCHITECTURE.md
│   ├── API_BRIDGE.md
│   └── ROADMAP.md
├── hermes-qa/                    # Q&A dengan Hermes (pertanyaan + jawaban)
│   ├── 01-hermes-integration.md
│   ├── 02-tts-stt.md
│   └── 03-device-analysis.md
├── avatar/                      # Electron + three.js app (fokus utama)
│   ├── package.json
│   ├── main.js                  # Electron main process (transparan, alwaysOnTop)
│   ├── preload.js
│   ├── renderer/
│   │   ├── index.html
│   │   ├── launcher.html        # Launcher / settings sebelum start
│   │   ├── settings.html
│   │   └── js/
│   │       ├── model_loader.js
│   │       ├── hermes_client.js # WS A (hermes serve) + WS B (plugin)
│   │       ├── avatar_controller.js
│   │       ├── lip_sync.js
│   │       └── desktop_pet.js
│   └── assets/
│       ├── models/              # .pmx/.pmd/.vrm/.glb default
│       ├── animations/          # idle, walk, thinking
│       └── audio/               # cache TTS (pre-generate)
├── hermes-plugin/               # Plugin Hermes `avatar-bridge` (Fase 2)
│   ├── plugin.yaml
│   └── __init__.py              # def register(ctx)
└── notes/
    └── ideas.md
```

> Catatan: folder `bridge/` dan `stt_tts/` dari versi sebelumnya **dihapus** —
> fungsi bridge & suara sudah ditangani Hermes (`hermes serve` + plugin + TTS/STT bawaan).

---

## 6. Risiko & Mitigasi (update, dari jawaban Hermes)

- **RAM 8 GB (unified) adalah batas utama** → anggaran: Electron ± 300–500 MB,
  three.js ± 200–300 MB, Whisper base ± 500 MB–1 GB → total ± 1.5 GB, aman bila
  tidak bareng app berat lain. Jangan jalankan Whisper `large`.
- **Electron lebih berat RAM/CPU** → batasi FPS: **30 FPS aktif, 10–20 FPS idle**
  (atau pause render saat `document.hidden` / `backgroundThrottling`).
- **GPU integrated (M2 Metal 3)** → model low-poly ≤ 50k triangle, draw calls ≤ 200,
  ambient + 1 directional light saja.
- **Lip sync timing** → Rhubarb sekali per file audio (offline), bukan loop realtime.
- **Latensi TTS** → Edge TTS cepat per kalimat; sentence chunking + pre-generate.
- **Window transparan macOS** → `transparent: true` + `alwaysOnTop` + `hasShadow: false`,
  pertimbangkan `setVisibleOnAllWorkspaces`.
- **MMD physics (rambut/rok)** → `MMD.js` punya physics; bisa dimatikan untuk hemat CPU.
- **Keamanan bridge** → `hermes serve` default `127.0.0.1`, aman untuk MVP.
- **Lisensi model MMD** → banyak model MMD punya lisensi tersendiri; sediakan model
  default bebas lisensi & dokumentasikan kepatuhan lisensi untuk model drop-in.

---

## 7. Spesifikasi Minimum Target (dari jawaban Hermes)

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| OS | macOS 12+ / Windows 10+ / Linux | macOS 13+ (M-series) |
| RAM | 8 GB | 16 GB |
| GPU | Integrated (Metal 3 / DX12 / Vulkan) | Apple M-series / GTX 1060 |
| Disk | 2 GB bebas | 5 GB bebas |
| Internet | Opsional (ada mode offline) | Stabil untuk Edge TTS |

---

## 8. Keputusan Terbuka (belum final)

Setelah jawaban Hermes, hanya tersisa:

1. **Model default** (yang bebas lisensi) untuk ship awal.
2. Apakah **motion capture (MediaPipe)** mau dimasukkan (opsional, dari referensi).
3. Nama/model `.pmx` default + voice final (Gadis vs Ardi).

---

> **Catatan:** Dokumen ini blueprint hidup — diupdate seiring project berjalan.
