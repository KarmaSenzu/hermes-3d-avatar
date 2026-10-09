# Q&A — Analisa Perangkat (Device)

> **Status:** ✅ ANSWERED — 2026-10-09
> **Metode:** inspeksi langsung via terminal (bukan tebakan)
> **Dokumen terkait:** `docs/ARCHITECTURE.md`

---

## 📤 Pertanyaan (diajukan ke Hermes)

Mohon analisa perangkat tempat Hermes berjalan, lalu isi tabel (OS, CPU, RAM,
GPU, koneksi internet, mic/speaker, disk, versi Python/Node). Kemudian jawab:
(1) TTS terbaik, (2) STT terbaik, (3) kuat untuk Whisper lokal?, (4) batasan yang
perlu diwaspadai, (5) rekomendasi resource budget avatar.

---

## ✅ Jawaban Hermes

### Laporan Perangkat

| Item | Detail |
|------|--------|
| OS & versi | **macOS 15.7.3 (Sequoia)** — build 24G419, kernel Darwin 24.6.0, arsitektur **arm64** |
| CPU (model/core) | **Apple M2** — 8 core (T8112) |
| RAM total | **8 GB** (unified memory, dipakai bareng CPU + GPU) |
| GPU (dedicated/integrated) | **Apple M2 integrated GPU** — dukungan **Metal 3** |
| Koneksi internet | **Stabil** — `curl https://www.google.com` → HTTP 200 dalam **0.15 detik** |
| Mic tersedia | ✅ Mikrofon MacBook Air (default input, 48 kHz, mono). Virtual: Microsoft Teams Audio, DeskFx |
| Speaker/audio output | ✅ Speaker MacBook Air (default output, 48 kHz, stereo) |
| Ruang disk tersisa | ± 100 GB dari 460 GB (10% terpakai) |
| Python version | 3.12.4 (sistem) · 3.11.15 (venv Hermes di `~/.hermes/hermes-agent/venv`) |
| Node.js version | v22.22.3 (di `~/.local/bin/node`) |

Versi Hermes: v0.18.2 — install via git di `~/.hermes/hermes-agent`, binary di
`~/.local/bin/hermes`.

### Kesimpulan

1. **TTS terbaik:** Edge TTS (via Hermes TTS bawaan, sudah aktif). Ringan
   (cloud, nol beban CPU/GPU), natural, gratis, tanpa API key. Voice Indonesia:
   `id-ID-GadisNeural` / `id-ID-ArdiNeural`.

2. **STT terbaik:** faster-whisper lokal (via Hermes STT bawaan, model `base`).
   Offline, gratis, akurat. Naik ke `small` untuk akurasi Indonesia lebih tinggi.

3. **Kuat untuk Whisper lokal?** Ya — untuk `base` dan `small`. Apple M2 8 GB
   menjalankan `base` nyaman, `small` masih aman. **Jangan** `large`/`large-v3`
   (butuh RAM besar, bikin tersendat karena RAM 8 GB dibagi bersama).

4. **Batasan yang perlu diwaspadai:**
   - **RAM 8 GB adalah batas utama** (unified — dibagi sistem, Electron,
     three.js, Whisper). Jangan bareng app berat lain (browser 50 tab, Docker).
   - GPU integrated (M2, Metal 3) bagus untuk three.js low-poly, tapi jangan
     high-poly / banyak light realtime.
   - Disk aman (± 100 GB).
   - Internet stabil → TTS/STT cloud boleh jadi andalan; offline tetap tersedia.

5. **Rekomendasi resource budget avatar:**
   - Model 3D low-poly, ≤ 50k triangle. Format GLB/glTF (hindari VRM kompleks untuk v1).
   - FPS: 30 FPS aktif, 10–20 FPS idle (pause render saat window tersembunyi —
     `backgroundThrottling` + `document.hidden`).
   - Draw calls ≤ 200. Satu material atlas, ambient + 1 directional.
   - Lip sync: Rhubarb sekali per file audio (offline), bukan loop realtime.
   - TTS: Edge TTS (cloud, nol beban lokal) + cache audio per kalimat.
   - STT: faster-whisper `base`; naik `small` jika akurasi kurang. Push-to-talk
     (bukan always-listening) untuk hemat CPU.
   - Window transparan macOS: `transparent: true` + `alwaysOnTop` +
     `hasShadow: false`; pertimbangkan `setVisibleOnAllWorkspaces`.
   - Anggaran RAM kasar: Electron ± 300–500 MB, three.js ± 200–300 MB, Whisper
     `base` ± 500 MB–1 GB → total ± 1.5 GB, **aman di 8 GB** asal tidak bareng
     app berat lain.

---

## Spesifikasi Minimum Target

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| OS | macOS 12+ / Windows 10+ / Linux | macOS 13+ (M-series) |
| RAM | 8 GB | 16 GB |
| GPU | Integrated (Metal 3 / DX12 / Vulkan) | Apple M-series / GTX 1060 |
| Disk | 2 GB bebas | 5 GB bebas |
| Internet | Opsional (ada mode offline) | Stabil untuk Edge TTS |

> **Kesimpulan akhir:** Device user (MacBook Air M2 / 8 GB) **layak** asalkan
> avatar low-poly dan STT tidak dipaksa model besar. Kombinasi final:
> **Edge TTS (id-ID) + faster-whisper base/small + three.js low-poly +
> Rhubarb lip sync + `hermes serve` sebagai bridge.**
