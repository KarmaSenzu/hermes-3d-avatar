# Hermes 3D Avatar

> Asisten AI yang **hadir secara visual** — bukan sekadar chatbot.

Hermes 3D Avatar menghadirkan **desktop pet 3D** (window transparan,
always-on-top) yang menampilkan hasil kerja [Hermes](https://github.com/) —
asisten AI — dalam bentuk avatar 3D yang bisa beranimasi, berjalan, dan
berinteraksi. Hermes tetap menjadi **otak** (percakapan, tools, memory,
integrasi); avatar adalah **aktor** yang menampilkan hasilnya.

---

## ✨ Fitur (Roadmap)

- 🖥️ **Desktop pet transparan** — window selalu di atas, tanpa mengganggu kerja lain.
- 🎭 **Model kostumisasi** — drop-in model MMD (`.pmd`/`.pmx`) / VRM / GLB.
- 🗣️ **Suara** — Text-to-Speech (Edge TTS) + Speech-to-Text (faster-whisper lokal).
- 👄 **Lip sync** — gerak mulut sinkron (Rhubarb Lip Sync).
- 🧠 **Terhubung ke Hermes** — `hermes serve` + plugin `avatar-bridge`.

> ⚠️ **Status: PLANNING / dalam pengembangan awal.** Belum ada build siap pakai.

---

## 🧩 Prinsip Arsitektur

```
Hermes (otak)  ⇄  hermes serve :9119 + avatar-bridge plugin  ⇄  Avatar (aktor)
                (WebSocket / JSON)                              (Electron + three.js)
```

Baca detail lengkapnya di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) dan
[`docs/API_BRIDGE.md`](docs/API_BRIDGE.md).

---

## 📦 Teknologi

| Layer | Teknologi |
|-------|-----------|
| Avatar engine | Electron + three.js + three-vrm + MMD.js |
| Model | MMD (.pmd/.pmx), VRM, GLB |
| Bridge | `hermes serve` (JSON-RPC/WebSocket) + plugin |
| TTS | Edge TTS (`id-ID-GadisNeural`) |
| STT | faster-whisper lokal (model `base`/`small`) |
| Lip sync | Rhubarb Lip Sync |

---

## 🚀 Cara Pakai

> Bagian ini akan diisi lengkap setelah Fase 1 (MVP) selesai. Secara garis besar:

1. Pastikan Hermes berjalan (`hermes serve`).
2. Jalankan app avatar (Electron).
3. Pilih model MMD/VRM/GLB di launcher.
4. Mulai berinteraksi (teks / suara).

---

## 🗂️ Struktur Folder

```
├── avatar/          # Electron + three.js app (produk utama)
├── hermes-plugin/   # Plugin Hermes `avatar-bridge`
├── docs/            # Dokumentasi teknis
├── hermes-qa/       # Q&A dengan Hermes (keputusan desain)
├── scripts/         # Utilitas dev
└── test/            # Test
```

---

## 🤝 Berkontribusi

Baca [`CONTRIBUTING.md`](CONTRIBUTING.md) untuk aturan struktur, penamaan, dan
konvensi commit.

---

## 📄 Lisensi

[MIT](LICENSE). Model MMD/VRM pihak ketiga yang di-drop-in user tunduk pada
lisensinya masing-masing.
