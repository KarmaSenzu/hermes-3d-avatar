# Hermes 3D Avatar — Goals & Blueprint

> **Versi:** 1.0 (Draft Awal)
> **Tanggal:** 2026-10-09
> **Status:** PLANNING — siap dikerjakan
> **Lokasi project:** `/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai )`

---

## 1. Nama & Visi

**Nama project:** Hermes 3D Avatar (Asisten AI)

**Visi:** Menghadirkan asisten AI yang *hadir secara visual* — bukan sekadar chatbot.
Hermes tetap menjadi "otak" (kecerdasan, tools, memory, integrasi), sedangkan avatar 3D
menjadi "wajah & badan" yang tampil di layar / background desktop, bisa berjalan,
beranimasi, dan berinteraksi dengan user sambil membantu.

---

## 2. Tujuan Utama (Goals)

1. **Tampil di layar / background desktop**
   - Avatar 3D tampil sebagai *desktop pet* dengan window transparan (atau fullscreen
     background) dan selalu ada di atas (always-on-top) tanpa mengganggu aktivitas lain.

2. **Bisa berjalan & berinteraksi**
   - Avatar punya animasi idle (diam, blink, napas, lihat sekitar), berjalan di layar,
     merespons sentuhan/klik, dan menampilkan ekspresi sesuai kondisi.

3. **Terhubung dengan Hermes sebagai otak**
   - Semua percakapan, tools, memory, cron, dan integrasi (contoh: Home Assistant)
     tetap diproses oleh Hermes. Avatar hanya *aktor* yang menampilkan hasilnya.

4. **Input & output multimodal**
   - Input: suara (mic → Speech-to-Text) dan/atau teks.
   - Output: suara (Text-to-Speech) + lip sync (gerakan mulut) + ekspresi + animasi.

5. **Interaksi real-time & responsif**
   - Latensi rendah: saat Hermes "berpikir" avatar menunjukkan animasi *thinking*;
     saat jawaban siap, avatar langsung bicara dengan gerakan bibir sinkron.

6. **Modular & mudah dikembangkan**
   - Sistem dibagi menjadi modul-modul terpisah (bridge, engine, avatar, TTS/STT)
     agar tiap bagian bisa dikembangkan, diuji, dan diganti tanpa merusak yang lain.

---

## 3. Batasan / Non-Goals (Agar Fokus)

- Bukan membuat model AI baru dari nol — kecerdasan tetap dari Hermes (atau LLM pilihan).
- Bukan menggantikan Hermes — project ini *extend* Hermes dengan lapisan visual.
- Versi awal **tidak perlu** mendukung mobile/VR — fokus desktop dulu.
- Avatar 3D versi awal diarahkan **low-poly / ringan** agar tidak makan GPU berlebihan.

---

## 4. Konsep Inti (Core Concept)

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
                        │  · Tampil di layar (transparan)  │
                        │  · Animasi: idle, jalan, thinking│
                        │  · Lip sync + ekspresi           │
                        │  · Suara (TTS)                   │
                        └─────────────────────────────────┘
```

**Prinsip:** Hermes = otak, Avatar = aktor. Keduanya dipisah lewat bridge,
sehingga avatar bisa diganti engine/model-nya tanpa menyentuh logika Hermes.

---

## 5. Alur Interaksi (User Journey)

### 5.1 Mode Suara
1. User bicara → mic menangkap audio.
2. **STT** (Whisper / Vosk / browser SpeechRecognition) → teks.
3. Teks dikirim ke Hermes via bridge.
4. Hermes berpikir → avatar memainkan **animasi thinking**.
5. Hermes menghasilkan jawaban → dikirim ke avatar via bridge.
6. **TTS** mengubah jawaban menjadi audio (+ data viseme).
7. Avatar memainkan audio + **lip sync** + ekspresi sesuai emosi jawaban.
8. Saat idle → avatar kembali ke animasi idle (blink, napas, jalan pelan).

### 5.2 Mode Teks
1. User mengetik di input (terminal / UI mini).
2. Langkah 3–8 sama seperti mode suara, tanpa langkah STT.

---

## 6. Arsitektur & Stack yang Disarankan

### 6.1 Pilihan Arsitektur (pilih salah satu, rekomendasi: **B**)

| Opsi | Nama | Deskripsi | Kelebihan | Kekurangan |
|------|------|-----------|-----------|------------|
| **A** | VTuber / Live2D | Pakai VTube Studio / VSeeFace + model Live2D/VRM | Cepat jadi, tooling matang | Setengah 2D, kurang "desktop pet" |
| **B** | Desktop Pet 3D | App desktop window transparan always-on-top (Godot/Unity/Electron+Three.js) | Sesuai gambaran, bebas kustomisasi | Perlu effort lebih di engine |
| **C** | Plugin Hermes Native | Tulis plugin Hermes yang hook event agent, stream ke app avatar | Paling rapi, resmi bagian Hermes | Perlu paham plugin system Hermes |

> **Rekomendasi:** Mulai dari **B** (Desktop Pet 3D) karena paling cocok dengan visi,
> lalu tambahkan **C** (plugin/bridge) setelah inti berjalan. Opsi **A** bisa dipakai
> untuk prototipe cepat melihat hasil visual lebih dulu.

### 6.2 Stack Teknologi (Rekomendasi)

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Avatar Engine** | Godot 4 (utama) / Unity (alternatif) | Godot ringan, gratis, cocok desktop pet |
| **Bahasa engine** | GDScript (Godot) / C# (Unity) | GDScript cepat dipelajari, C# ekosistem luas |
| **Model 3D** | VRM (anime) / Ready Player Me (semi-realistis) / GLB | Format siap animasi & rigged |
| **Bridge** | WebSocket (lokal) + JSON | Ringan, real-time, mudah debug |
| **Bridge server** | FastAPI (Python) / Node.js | Dekat dengan ekosistem Hermes (Python) |
| **STT** | OpenAI Whisper / Vosk | Akurat & bisa lokal |
| **TTS** | TTS bawaan Hermes / ElevenLabs / Edge TTS | Pilih yang bisa streaming utk latensi |
| **Lip Sync** | Rhubarb Lip Sync / uLipSync | Generate viseme dari audio |
| **Ekspresi/Animasi** | Blend Shapes / AnimationPlayer (Godot) / Animator (Unity) | Kontrol wajah & gerak |
| **Window Transparan** | Godot: transparent_bg + always_on_top / Electron: transparent + alwaysOnTop | Kunci "desktop pet" |

### 6.3 Alur Data Teknis

```
[User Input: mic/teks]
        │
        ▼
[STT Module] ──teks──▶ [Hermes Core] ──jawaban──▶ [Bridge Server]
        (opsional)          │                          │
                            │ (thinking event)         ▼
                            ▼                     [Avatar App]
                     [event: thinking] ◀────────  · terima JSON
                     [event: speaking] ◀────────  · TTS → audio
                            │                     · viseme → lip sync
                            ▼                     · ekspresi → blend shapes
                     [Memory/Tools]              · animasi idle/thinking
```

---

## 7. Struktur Folder Project (Usulan)

```
Hermes 3D Avatar (Asisten Ai )/
├── README.md                     # Ringkasan project & cara jalan
├── docs/
│   ├── GOALS.md                  # Dokumen ini
│   ├── ARCHITECTURE.md           # Detail arsitektur & diagram
│   ├── API_BRIDGE.md             # Spesifikasi protokol bridge
│   └── ROADMAP.md                # Milestone & checklist
├── bridge/                       # Server penghubung Hermes ↔ Avatar
│   ├── main.py                   # Entry point server (FastAPI/WebSocket)
│   ├── hermes_client.py          # Konektor ke Hermes
│   ├── events.py                 # Definisi event (thinking, speaking, idle)
│   └── requirements.txt
├── avatar/                       # Aplikasi avatar 3D (Godot/Unity)
│   ├── project.godot             # (jika Godot)
│   ├── scenes/
│   │   ├── Main.tscn             # Scene utama: desktop pet
│   │   ├── Avatar.tscn           # Scene model 3D + rig
│   │   └── UI.tscn               # Input teks / tombol
│   ├── scripts/
│   │   ├── bridge_client.gd      # WebSocket client
│   │   ├── avatar_controller.gd  # Kontrol animasi & ekspresi
│   │   ├── lip_sync.gd           # Lip sync dari viseme
│   │   └── desktop_pet.gd        # Logika jalan di layar
│   └── assets/
│       ├── models/               # VRM / GLB / Ready Player Me
│       ├── animations/           # Animasi idle, walk, thinking
│       └── audio/                # Cache TTS audio
├── stt_tts/                      # Modul suara (bisa terpisah)
│   ├── stt.py                    # Speech-to-text
│   ├── tts.py                    # Text-to-speech + viseme
│   └── audio_utils.py
└── notes/
    └── ideas.md                  # Catatan ide & eksperimen
```

---

## 8. Protokol Bridge (Spesifikasi Awal)

Komunikasi via **WebSocket** dengan pesan **JSON**. Format dasar:

```json
{
  "type": "<jenis_event>",
  "ts": 1699999999,
  "data": {}
}
```

### 8.1 Event dari Hermes → Avatar

| type | data | Keterangan |
|------|------|------------|
| `thinking` | `{"duration_ms": 0}` | Hermes mulai berpikir → animasi thinking |
| `speaking` | `{"text": "...", "emotion": "happy", "audio_b64": "..."}` | Jawaban siap → TTS + lip sync |
| `idle` | `{}` | Kembali idle |
| `action` | `{"name": "walk_to", "x": 0.5, "y": 0.2}` | Perintah animasi khusus |
| `emotion` | `{"name": "happy", "intensity": 0.8}` | Ubah ekspresi wajah |

### 8.2 Event dari Avatar → Hermes

| type | data | Keterangan |
|------|------|------------|
| `user_text` | `{"text": "..."}` | User mengetik di UI avatar |
| `user_voice` | `{"audio_b64": "..."}` | Rekaman mic (untuk STT) |
| `click` | `{"x": 0.5, "y": 0.3, "part": "head"}` | User klik avatar |
| `ready` | `{}` | Avatar siap menerima event |
| `ping` | `{}` | Heartbeat |

---

## 9. Milestone & Roadmap

### Fase 0 — Persiapan (sekarang)
- [x] Definisikan visi & goals
- [ ] Tentukan OS target & spesifikasi
- [ ] Pilih engine (Godot / Unity) & style avatar (VRM / Ready Player Me)
- [ ] Setup folder project + Git init

### Fase 1 — Prototipe Visual (MVP)
- [ ] Tampilkan model 3D di window transparan always-on-top
- [ ] Animasi idle dasar (blink, napas)
- [ ] Input teks sederhana → tampilkan teks balasan di UI
- [ ] Koneksi WebSocket dasar (bridge server ↔ avatar)

### Fase 2 — Integrasi Hermes
- [ ] Bridge server bisa kirim/terima event
- [ ] Sambungkan ke Hermes (conversation + tools + memory)
- [ ] Event `thinking` / `speaking` / `idle` bekerja
- [ ] Jawaban Hermes muncul di avatar (teks dulu)

### Fase 3 — Suara & Lip Sync
- [ ] Integrasi TTS (pilih engine streaming)
- [ ] Generate viseme dari audio
- [ ] Lip sync + ekspresi wajah dasar (senang, sedih, netral)
- [ ] Mode suara: mic → STT → Hermes → TTS → avatar

### Fase 4 — Desktop Pet Interaktif
- [ ] Avatar bisa berjalan di layar
- [ ] Respon klik / drag
- [ ] Animasi thinking saat Hermes berpikir
- [ ] Window transparan & selalu di atas stabil (multi-monitor)

### Fase 5 — Polishing & Rilis
- [ ] Optimasi performa (low-poly, GPU usage)
- [ ] Tray icon / auto-start / hotkey
- [ ] Dokumentasi lengkap (README, cara install & pakai)
- [ ] Packaging (build app desktop)

---

## 10. Pertanyaan yang Harus Dijawab Sebelum Mulai

1. **OS target** — Windows / macOS / Linux? (Kamu saat ini di macOS)
2. **Style avatar** — anime (VRM), semi-realistis (Ready Player Me), atau karakter tertentu?
3. **Engine pilihan** — Godot 4 (ringan) atau Unity (banyak aset)?
4. **Mode interaksi utama** — suara, teks, atau keduanya?
5. **TTS pilihan** — bawaan Hermes, Edge TTS (gratis & natural), atau ElevenLabs (berbayar)?
6. **STT pilihan** — Whisper (lokal, akurat) atau Vosk (ringan)?
7. **Arsitektur** — mulai dari B (desktop pet) atau prototipe cepat lewat A (VTuber)?

---

## 11. Risiko & Catatan Realistis

- **Latensi TTS:** bisa terasa lambat → pilih TTS streaming + pre-generate untuk kalimat umum.
- **Konsumsi GPU:** avatar berjalan terus di background → desain low-poly & batasi frame rate saat idle.
- **Lip sync butuh timing (viseme):** tidak semua TTS menyediakan → perlu estimasi dari audio (Rhubarb).
- **Window transparan di macOS:** perlu penanganan khusus (level window, shadow, click-through opsional).
- **Keamanan bridge:** cukup lokal (localhost) di versi awal, jangan expose ke internet.

---

## 12. Referensi & Sumber Belajar

- **Godot 4 docs:** https://docs.godotengine.org/
- **VRM format:** https://vrm.dev/
- **Ready Player Me:** https://readyplayer.me/
- **Rhubarb Lip Sync:** https://github.com/DanielSWolf/rhubarb-lip-sync
- **uLipSync (Unity):** https://github.com/hecomi/uLipSync
- **OpenAI Whisper:** https://github.com/openai/whisper
- **FastAPI WebSocket:** https://fastapi.tiangolo.com/advanced/websockets/

---

> **Catatan:** Dokumen ini adalah blueprint hidup — akan terus diupdate seiring project berjalan.
> File ini bisa dibaca oleh AI lain di VSCode sebagai konteks awal pengerjaan.
