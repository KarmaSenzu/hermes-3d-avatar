# Hermes 3D Avatar — Roadmap

> **Versi:** 1.1 (Draft)
> **Status:** Fase 0 SELESAI ✅ — Fase 1 SELESAI ✅ — Fase 2 (WS A) SELESAI ✅
> **Terkait:** `GOALS.md`, `ARCHITECTURE.md`, `API_BRIDGE.md`

Roadmap ini memperbarui `GOALS.md` bagian 9 sesuai keputusan final:
Electron + three.js + MMD drop-in + launcher/settings + cross-platform +
`hermes serve` sebagai bridge + Edge TTS + faster-whisper.

---

## Fase 0 — Persiapan

- [x] Definisikan visi & goals
- [x] Pilih arah engine: Electron + three.js + three-vrm + MMD.js
- [x] Struktur dokumen (ARCHITECTURE, API_BRIDGE, ROADMAP)
- [x] Jawab pertanyaan ke Hermes (folder `hermes-qa/`)
- [x] Tentukan OS target & spesifikasi minimum (lihat `hermes-qa/03`)
- [x] Pilih model MMD/VRM default (bebas lisensi) → lihat `docs/DECISIONS.md`
- [x] Setup folder project + Git init (selesai — push ke `KarmaSenzu/hermes-3d-avatar`)

## Fase 1 — Prototipe Visual (MVP)

- [x] Electron window transparan + always-on-top (frameless, draggable)
- [x] Load model MMD (.pmd/.pmx) via MMD.js + fallback VRM/GLB
- [x] Animasi idle dasar (blink, napas)
- [x] Launcher sederhana: pilih model → Start
- [x] Input teks sederhana → tampilkan balasan di UI (mock/dummy dulu)

## Fase 2 — Integrasi Hermes

- [x] Connect ke `hermes serve` (WS A, `ws://127.0.0.1:9119/api/ws`) untuk chat utama
- [x] Event `thinking` (message.start) / `speaking` (message.complete) / `idle` bekerja
- [x] Jawaban Hermes muncul di avatar (teks dulu)
- [ ] Plugin `avatar-bridge` (WS B): thinking presisi, emosi via tag, tool event

## Fase 3 — Suara & Lip Sync

- [ ] TTS: Hermes → Edge TTS (`id-ID-GadisNeural`) → `audio_b64` ke avatar
- [ ] STT: Hermes → faster-whisper lokal (model `base`, language `id`)
- [ ] Generate viseme dari audio (Rhubarb Lip Sync, offline)
- [ ] Lip sync + ekspresi wajah dasar (senang, sedih, netral, thinking)
- [ ] Mode suara end-to-end: mic → STT → Hermes → TTS → avatar

## Fase 4 — Desktop Pet Interaktif

- [ ] Avatar bisa berjalan di layar
- [ ] Respon klik / drag
- [ ] Animasi thinking saat Hermes berpikir
- [ ] Window transparan & always-on-top stabil (multi-monitor, 3 OS)
- [ ] Settings panel lengkap (model, ukuran, mode, TTS/STT, endpoint)

## Fase 5 — Polishing & Rilis

- [ ] Optimasi performa (low-poly ≤ 50k tri, 30 FPS aktif / 10–20 FPS idle)
- [ ] Tray icon / auto-start / hotkey
- [ ] Dokumentasi lengkap (README, cara install & pakai, cara ganti model sendiri)
- [ ] Packaging cross-platform (Electron-builder → .exe/.app/.AppImage)
- [ ] Publish ke GitHub (dengan panduan "tinggal jalan" untuk end-user)

---

## Prioritas Saat Ini (Fokus)

1. **Fase 0 sisa** → pilih model default (bebas lisensi) + Git init.
2. **Fase 1 MVP** → buktikan visual (window transparan + model MMD jalan).
3. **Fase 2** → sambungkan `hermes serve` (jalur termurah & paling stabil).

---

## Milestone & Definisi "Selesai" (DoD)

| Fase | DoD |
|------|-----|
| 1 | Model MMD tampil di window transparan always-on-top, bisa idle/blink |
| 2 | Teks dari Hermes muncul di avatar lewat `hermes serve` |
| 3 | Mic → jawaban terdengar (Edge TTS) + mulut sinkron (Rhubarb) |
| 4 | Avatar bisa drag/jalan + setting panel berfungsi |
| 5 | Build .exe/.app/.AppImage jalan di mesin orang lain tanpa setup |
