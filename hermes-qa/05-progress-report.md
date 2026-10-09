# Progress Report & Q&A — Hermes 3D Avatar

> **Tanggal:** 2026-10-09
> **Status:** ✅ ANSWERED — Fase 0, 1, 2 SELESAI; jawaban Fase 3 terkunci; ide tambahan user sudah dianalisa
> **Jawaban oleh:** Hermes (inspeksi langsung ke source Hermes v0.18.2:
> `tui_gateway/server.py` method `voice.*`, `prompt.submit`, `session.create`)

---

## 1. Ringkasan Progress (yang sudah dikerjakan)

**Konsep:** Hermes 3D Avatar = lapisan visual (desktop pet 3D). Hermes = otak,
avatar = aktor. Dihubungkan via `hermes serve` (WebSocket JSON-RPC).

**Stack final:**
- Engine: Electron + three.js + three-vrm + MMD.js (FBX)
- Model: `.vrm` (utama), `.glb/.gltf`, `.pmx/.pmd` (MMD), `.fbx`
- Bridge: `hermes serve` — WS `ws://127.0.0.1:9119/api/ws?token=...`
- TTS: Edge TTS `id-ID-GadisNeural` (via Hermes TTS bawaan)
- STT: faster-whisper lokal (model `base`, language `id`)
- Lip sync: Rhubarb (rencana)

**Fase 0 — Persiapan ✅**
Visi, goals, keputusan arsitektur, jawaban Hermes terkunci (integrasi,
TTS/STT, device analysis), repo + Git + file pendukung.

**Fase 1 — Prototipe Visual ✅**
Window transparan + always-on-top + frameless + draggable; launcher; loader
multi-format (VRM/GLB/PMX/FBX); custom protocol `model://`; animasi idle
(blink + napas); framing kamera otomatis + komposisi tunable; input teks mock.

**Fase 2 — Integrasi Hermes ✅**
`hermes-client.js` (WebSocket JSON-RPC); chat nyata
`session.create` → `prompt.submit` → `message.delta` (streaming) +
`message.complete` (final); event `message.start`, `thinking.delta`,
`tool.start`, `tool.complete` → ekspresi/indikator avatar;
`AvatarController.setExpression()`.

### Hasil pengujian (ringkas)

| # | Pengujian | Hasil |
|---|-----------|-------|
| 1 | Window transparan + always-on-top | ✅ PASS |
| 2 | Drag window (frameless) | ✅ PASS |
| 3 | Load model VRM (`default.vrm`, 6.1 MB) | ✅ PASS |
| 4 | Animasi idle (blink + napas) | ✅ PASS |
| 5 | Framing full-body + posisi | ✅ PASS |
| 6 | Launcher pilih model → Start | ✅ PASS |
| 7 | Connect ke `hermes serve` (WS) | ✅ PASS (butuh `?token=`) |
| 8 | Kirim pesan → jawaban Hermes (streaming+final) | ✅ PASS |
| 9 | Ekspresi thinking/netral berubah | ✅ PASS (kode, visual belum detail) |

### Masalah yang ditemukan & diperbaiki

| Masalah | Akar penyebab | Solusi |
|---------|--------------|--------|
| Electron dianggap malware (macOS) | Electron 31 ditandai XProtect | Naik ke Electron 33 |
| `getDefaultModelPath` undefined | Preload path salah (`.js` vs `.mjs`) | Perbaiki path + `contextIsolation` |
| Model gagal load ("unexpected token") | Renderer tidak bisa fetch file lokal | Baca via IPC → base64 → Blob URL |
| Model tampil terpotong | Framing kamera salah | Bounding box + atur jarak kamera |
| Gagal connect WS Hermes | Endpoint butuh `?token=` | Set token via env `HERMES_DASHBOARD_SESSION_TOKEN` |

---

## 2. Pertanyaan untuk Hermes (persiapan Fase 3)

1. **TTS → audio ke avatar:** cara paling bersih agar Hermes mengirim audio
   (base64) hasil TTS ke avatar lewat WS? Ada event/field khusus di
   `prompt.submit` response/event untuk `audio_b64`? Atau avatar harus memanggil
   TTS sendiri?

2. **STT:** bagaimana avatar mengirim audio mic ke Hermes untuk di-transcribe?
   Ada method RPC (mis. `stt.transcribe`) atau harus lewat REST upload?

3. **Viseme/lip sync:** apakah Hermes TTS (Edge) bisa memberikan timing viseme?
   Kalau tidak, kami pakai Rhubarb di sisi avatar — setuju?

4. **Emosi:** apakah ada cara resmi Hermes menyertakan emosi di jawaban
   (tag `[emotion:happy]` via skill/system prompt), atau avatar deteksi
   heuristik?

---

## 3. Jawaban Hermes — Fase 3

### 3.1 TTS → audio ke avatar

**Tidak ada event/field `audio_b64` di `hermes serve`.** Jawaban chat hanya
teks (via `message.delta`/`message.complete`).

Method `voice.tts` **ada** (`tui_gateway/server.py` baris 13484), tapi fungsinya
`speak_text(text)` → **audio diputar di sisi server (mesin tempat Hermes
berjalan)**, bukan dikirim ke client WS. Jadi tidak cocok untuk "Hermes kirim
audio ke avatar".

**Dua opsi, rekomendasi: opsi A untuk Fase 3.**

| Opsi | Cara kerja | Plus | Minus |
|------|-----------|------|-------|
| **A. Avatar panggil TTS sendiri (rekomendasi)** | Avatar sudah terima teks dari `message.complete`/`message.delta` → panggil edge-tts langsung dari Node (npm `edge-tts` / `msedge-tts`) atau REST lokal → putar audio | Latensi kecil, tidak perlu ubah Hermes, tetap konsisten "avatar = aktor" | Duplikasi kecil logika suara di avatar |
| **B. Plugin `avatar-bridge` kirim audio** | Plugin hook `post_llm_call` generate audio via `tools/tts_tool.py`, push `{type:"speaking", audio_b64}` via WS B ke avatar | Paling "Hermes sentris", satu sumber kebenaran suara | Lebih kompleks, perlu plugin + WS kedua |

**Rekomendasi:** Fase 3 pakai **A** (avatar TTS sendiri). Plugin B bisa
ditambahkan nanti bila ingin logika suara terpusat di Hermes.

### 3.2 STT — input mic

**Tidak ada method `stt.transcribe`** untuk upload audio via RPC. **TAPI**
Hermes sudah punya jalur resmi yang lebih sederhana:

- **`voice.toggle`** action `on` → aktifkan mode suara (syarat).
- **`voice.record`** action `start` / `stop` → push-to-talk dengan VAD.
- Hasil transkripsi dikirim sebagai **event `voice.transcript`**:
  ```json
  {"jsonrpc":"2.0","method":"event","params":{"type":"voice.transcript","session_id":"...","payload":{"text":"hasil transkrip"}}}
  ```

**Karena avatar & Hermes berjalan di mesin yang sama, mic yang dipakai sama.**
Avatar **tidak perlu mengirim audio** — cukup panggil `voice.record start`,
lalu ambil teks dari event `voice.transcript`, lalu kirim ke `prompt.submit`.

Alur:
```
avatar: voice.toggle {action:"on"}
avatar: voice.record {action:"start"}
hermes → event voice.status (recording)
hermes → event voice.transcript {text}
avatar → prompt.submit {session_id, text}
```

Catatan: `voice.record start` tanpa mode on akan error (`voice mode is off`).
Alternatif (jika ingin rekam di sisi avatar): MediaRecorder → base64 → upload
REST — **tidak ada endpoint transcribe resmi** untuk itu, jadi jalur
`voice.record` jauh lebih bersih.

### 3.3 Viseme / lip sync

**Edge TTS tidak menyediakan timing viseme.** Setuju: pakai **Rhubarb Lip
Sync** di sisi avatar. Alur:
1. TTS → simpan audio (`.wav`).
2. Rhubarb → JSON viseme (phoneme + timing).
3. Avatar drive blendshape mulut sesuai timing.

Tambahan: sediakan **fallback amplitude-based** (Web Audio `AnalyserNode`)
untuk streaming kalimat yang belum selesai di-generate Rhubarb.

### 3.4 Emosi

**Tidak ada field emosi resmi di response Hermes.** Dua opsi (sama seperti
dokumen `01-hermes-integration.md`):

1. **Tag emosi (direkomendasikan untuk jangka panjang):** skill/system prompt
   agar Hermes mengawali jawaban dengan `[emotion:happy]`; avatar memotong tag
   sebelum ditampilkan dan memakainya untuk ekspresi.
2. **Heuristik di avatar (rekomendasi untuk Fase 3 awal):** klasifikasi teks
   sederhana (kata positif/negatif, tanda seru, konteks tool) → mapping
   ekspresi. Tidak perlu ubah sisi Hermes.

**Saran:** Fase 3 mulai dengan **heuristik** + event yang sudah ada
(`message.start` → thinking, `tool.start/complete` → sibuk/berhasil). Tag emosi
ditambahkan belakangan via skill.

---

## 4. Masukan Hermes untuk Ide Tambahan (Feature Requirements)

**Verdict: ide-idenya bagus, sejalan dengan arah project, dan layak dikerjakan.**
Ini mengubah project dari "demo teknis" menjadi "aplikasi end-user". Tapi harus
dipahami **pembagian kerja**-nya agar tidak salah arsitektur:

### 4.1 Pembagian tanggung jawab (kunci)

| Fitur | Dikerjakan di | Cara |
|-------|--------------|------|
| Settings UI, CRUD karakter, shortcut, LLM config, voice commands | **Avatar app (Electron)** | Renderer (UI) + main process (persistensi, eksekusi) |
| Menjalankan service (9Router, `hermes serve`, frontend) | **Avatar app (Electron main)** | `child_process.spawn` + service manager + health check |
| Percakapan, tools, memory, integrasi | **Hermes** | Sudah ada — avatar tinggal kirim `prompt.submit` |
| Konfigurasi LLM | **Hermes** (baca/tulis via RPC `config.get`/`config.set`) | Jangan tulis `~/.hermes/config.yaml` langsung dari avatar tanpa validasi |
| Perintah suara → aksi komputer | **Hermes** (agent + tools + approval) | Avatar cukup kirim teks; Hermes eksekusi via tools-nya |

### 4.2 Koreksi teknis penting

1. **9Router perlu dianalisa dulu.** Di `~/.hermes/config.yaml` model default
   memakai `base_url: http://localhost:20128/v1` — kemungkinan besar 9Router
   adalah **proxy LLM lokal di port 20128**. Sebelum service manager dibuat,
   cek dulu bagaimana 9Router dijalankan (binary? script? service?) dan
   apakah bisa di-spawn otomatis. Jangan asumsikan.

2. **Jangan menulis `config.yaml` Hermes langsung dari UI.** Pakai RPC
   `config.get`/`config.set` (ada di `hermes serve`) yang punya validasi, atau
   simpan config di sisi avatar lalu "apply" lewat RPC. Selalu buat cadangan
   sebelum menimpa.

3. **API key harus disimpan aman**, bukan plaintext JSON:
   - macOS: Keychain (`keytar` atau `safeStorage` Electron).
   - Windows: Credential Manager.
   - Linux: libsecret.
   - Tampilkan selalu masked (`sk-***`), jangan pernah full di UI/log/frontend.

4. **Jangan eksekusi shell arbitrer dari teks LLM.** Ini prinsip yang sudah
   benar di dokumen user. Hermes sudah punya **approval system** — pakai itu.
   Untuk perintah suara, buat **allowlist aksi** (buka Task Manager, buka
   YouTube, buka aplikasi X) dengan validasi parameter, bukan "jalankan teks
   apa pun".

5. **Token WS jangan hardcode.** Sekarang `HERMES_DASHBOARD_SESSION_TOKEN` di
   env. Untuk end-user: generate token acak, simpan di penyimpanan aman,
   pakai konsisten di avatar & saat spawn `hermes serve`.

6. **Port & proses ganda.** Deteksi port 9119 (dan port 9Router) sebelum spawn;
   cek service sudah jalan (health check `GET /api/status`) sebelum mulai ulang;
   simpan PID child dan matikan bersih saat quit.

7. **Jangan klaim cross-platform sebelum diuji.** Global shortcut, startup
   otomatis, keychain, dan service management berbeda-beda di macOS/Windows/
   Linux. Laporkan hasil per platform secara terpisah.

### 4.3 Rekomendasi arsitektur baru (modul)

```
avatar/
├── src/main/
│   ├── index.js               # Electron main (sudah ada)
│   ├── service-manager.js     # spawn/stop 9Router, hermes serve, health check
│   ├── settings-store.js      # persistensi config (JSON + safeStorage utk secret)
│   ├── shortcuts.js           # globalShortcut (macOS/Windows/Linux)
│   └── installer.js           # (fase distribusi) electron-builder hooks
├── src/renderer/
│   ├── settings/              # halaman pengaturan (karakter, shortcut, LLM, dll)
│   └── js/hermes-client.js    # sudah ada — extend: voice events + config RPC
└── ...
```

---

## 5. Roadmap Revisi (gabungan Fase 3–5 + fitur baru)

Urutan user sudah bagus; saya sesuaikan satu hal: **Fase 3 (suara) harus selesai
dulu** karena "perintah suara" di ide user bergantung pada STT/TTS.

| Prioritas | Fokus | Isi utama |
|-----------|-------|-----------|
| **P0** | Selesaikan Fase 3 (suara & lip sync) | TTS (avatar panggil edge-tts), STT (`voice.record` → `voice.transcript`), Rhubarb lip sync, emosi heuristik |
| **P1** | Stabilitas & one-click run | Service manager (9Router + `hermes serve` + frontend), health check, anti-duplikat proses, shutdown bersih, startup otomatis (opsional) |
| **P2** | Settings panel + CRUD | CRUD karakter, CRUD shortcut (globalShortcut), LLM provider/model (via RPC config), voice commands CRUD, persistensi, integrasi UI↔backend nyata |
| **P3** | Integrasi OS via suara | Perintah suara → aksi (Task Manager/Activity Monitor/System Monitor, buka YouTube & putar musik, buka aplikasi/website/folder), allowlist + konfirmasi |
| **P4** | Distribusi & instalasi | Installer (electron-builder: `.app`/`.exe`/`.AppImage`), `curl install.sh | bash` dari GitHub, update & uninstall aman, dokumentasi end-user |

> **Catatan:** P0 dan P1 bisa paralel. P2 boleh dipecah: mulai dari CRUD karakter
> (paling terlihat), lalu LLM, lalu shortcut, lalu voice commands.

---

## 6. Checklist Fitur Baru (ringkas dari Feature Requirements user)

### A. Character Management
- [ ] Tambah karakter (pilih file lokal, validasi, nama/label)
- [ ] Daftar karakter (nama, preview, status aktif)
- [ ] Pilih aktif & set default
- [ ] Edit/update (ganti file, nama, pengaturan)
- [ ] Hapus (konfirmasi, tidak hapus file asli, amankan karakter aktif)
- [ ] Persistensi daftar karakter

### B. Shortcut Keyboard
- [ ] Tambah/lihat/edit/hapus shortcut
- [ ] Aktif/nonaktif + bedakan bawaan vs custom
- [ ] Validasi konflik + peringatan keterbatasan OS
- [ ] Dukungan macOS/Windows/Linux (Cmd/Ctrl/Option/Alt/Fn)

### C. LLM & Provider
- [ ] Tambah config (nama, provider, base URL, API key, model, param)
- [ ] Daftar config (mask API key, status tes koneksi)
- [ ] Edit/update/hapus + pilih model aktif (restart terkontrol bila perlu)
- [ ] Tombol uji koneksi (status jelas, tanpa bocor kredensial)
- [ ] Penyimpanan API key aman (keychain/safeStorage)

### D. Voice Commands
- [ ] CRUD perintah (trigger, aksi, respons bubble, ekspresi)
- [ ] Aktif/nonaktif perintah
- [ ] Validasi & allowlist aksi (tidak ada shell arbitrer)

### E. One-Click & Service Management
- [ ] Ikon/shortcut satu klik → semua service jalan
- [ ] Urutan startup sesuai dependensi + status kesiapan tiap service
- [ ] Anti-duplikat proses + stop/restart/status
- [ ] Deteksi port & health check

### F. Startup & Ketahanan
- [ ] Persistensi semua pengaturan
- [ ] Startup otomatis saat login (opsional, bisa dimatikan)
- [ ] Pemulihan setelah restart / mati-nyala

### G. Installer & GitHub
- [ ] Pemeriksaan sistem + dependensi sebelum install
- [ ] Instalasi + setup awal terpandu (karakter, LLM, API key, tes)
- [ ] Shortcut aplikasi otomatis
- [ ] Update tanpa merusak config + uninstall aman
- [ ] `curl -fsSL .../install.sh | bash` dari GitHub (dengan checksum)

### H. Keamanan (lintas fitur)
- [ ] API key tidak di source/repo/log/frontend
- [ ] Tidak eksekusi teks LLM sebagai shell
- [ ] Konfirmasi untuk tindakan berisiko
- [ ] Tidak minta admin tanpa kebutuhan jelas

---

## 7. Cara Menjalankan (referensi)

```bash
# Terminal 1 — Hermes serve (dengan token)
HERMES_DASHBOARD_SESSION_TOKEN=avatar-dev-token-123 hermes serve --host 127.0.0.1 --port 9119

# Terminal 2 — Avatar app (token sama)
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
HERMES_DASHBOARD_SESSION_TOKEN=avatar-dev-token-123 npm run dev
```

> Setelah P1 (one-click), dua terminal di atas otomatis dijalankan oleh
> service manager di Electron main process.

---

## 8. Tujuan Akhir (disepakati)

Hermes 3D = aplikasi desktop asisten AI berbasis avatar 3D untuk pengguna umum:
**install → konfigurasi awal → klik satu ikon → Hermes siap digunakan.**
Avatar menerima perintah suara, merespons lewat suara + ekspresi + bubble chat,
dan menjalankan tindakan yang diizinkan di komputer. Semua konfigurasi
(karakter, shortcut, LLM, perintah suara, preferensi) dikelola lewat UI —
bukan terminal atau edit source code — dengan stabilitas, keamanan, dan
kemudahan pemakaian sebagai prioritas utama.

---

## Arahan untuk AI Coding Agent (VSCode)

1. **Jangan menulis ulang sistem.** Mulai dari analisis repository & code
   `avatar/` yang sudah ada (progress Fase 0–2 valid).
2. Kerjakan berurutan: **P0 (Fase 3 suara)** → **P1 (service manager/one-click)**
   → **P2 (settings + CRUD)** → **P3 (OS integration)** → **P4 (installer)**.
3. Untuk P0, pakai jawaban §3: TTS di sisi avatar (edge-tts Node),
   STT via RPC `voice.toggle` + `voice.record` → event `voice.transcript`,
   lip sync Rhubarb, emosi heuristik dulu.
4. Untuk P2, simpan config di `settings-store.js` (JSON + safeStorage untuk
   secret); apply config LLM via RPC `config.get`/`config.set`, jangan tulis
   `~/.hermes/config.yaml` langsung.
5. Implementasi harus nyata (bukan mockup/tombol mati). Setiap fitur diuji,
   hasilnya didokumentasikan per platform, dan fitur lama yang berfungsi
   dipertahankan.
