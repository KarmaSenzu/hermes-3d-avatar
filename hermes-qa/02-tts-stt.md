# Q&A — TTS & STT

> **Status:** ✅ ANSWERED — 2026-10-09
> **Jawaban oleh:** Hermes (setelah analisa device di `03-device-analysis.md`)
> **Dokumen terkait:** `docs/ARCHITECTURE.md`, `docs/API_BRIDGE.md`

---

## 📤 Pertanyaan (diajukan ke Hermes)

Kami belum menentukan mesin Text-to-Speech (TTS) dan Speech-to-Text (STT).
Mohon Hermes menganalisa device user lalu memberi rekomendasi paling cocok.

Avatar butuh: (1) **STT** — suara user → teks; (2) **TTS** — jawaban teks →
audio (dengan viseme untuk lip sync). Target cross-platform, latensi rendah,
mudah dipakai end-user.

Pertanyaan: (1) rekomendasi TTS, (2) rekomendasi STT, (3) streaming/latensi,
(4) lip sync/viseme, (5) bahasa, (6) prioritas gratis vs kualitas.

---

## ✅ Jawaban Hermes

### Rekomendasi Final

| Fungsi | Pilihan Utama (v1) | Alternatif (upgrade) |
|--------|--------------------|----------------------|
| **TTS** | **Hermes TTS bawaan → Edge TTS** (gratis, natural, tanpa API key, sudah aktif) | ElevenLabs (premium, streaming, berbayar) |
| **STT** | **Hermes STT bawaan → faster-whisper lokal** (gratis, offline, model `base`) | Groq Whisper API (gratis tier) / naik ke model `small` |

**Alasan inti:** Hermes sudah punya mesin TTS & STT bawaan, keduanya **sudah
aktif**. Versi 1 cukup "pakai yang sudah ada, ganti voice & bahasa ke Indonesia"
— nol setup end-user, nol API key.

### 1. Rekomendasi TTS → Edge TTS (Hermes TTS bawaan)

- Sudah aktif: `tts.provider: edge`, voice `en-US-AriaNeural` (`~/.hermes/config.yaml`
  baris 239–241).
- Gratis, tanpa API key, neural natural, latensi < 1 detik per kalimat.
- Mendukung Bahasa Indonesia: `id-ID-GadisNeural` (perempuan) / `id-ID-ArdiNeural`
  (laki-laki). Tinggal ganti voice.

| Mesin | Verdict |
|-------|---------|
| Edge TTS | ✅ PILIHAN UTAMA |
| ElevenLabs | Alternatif premium (streaming & natural, butuh `ELEVENLABS_API_KEY`, berbayar). Config sudah ada (`voice_id: pNInz6obpgDQGcFmaJgB`). |
| TTS bawaan lain | OpenAI, MiniMax, Gemini, xAI, **Piper (lokal offline)** — tinggal ganti provider. |
| Coqui | Tidak perlu (Piper sudah ada & lebih ringan). |
| Web Speech API | Skip (kualitas standar, tergantung OS/browser). |

### 2. Rekomendasi STT → faster-whisper lokal

- Sudah aktif: `stt.provider: local`, model `base` (`~/.hermes/config.yaml`
  baris 264–268).
- Gratis, offline, tanpa API key. Model `base` ≈ 150 MB.
- Di Apple M2 (8 GB) nyaman; naik ke `small` (≈ 460 MB) untuk akurasi Indonesia lebih baik.

| Mesin | Verdict |
|-------|---------|
| faster-whisper lokal (base/small) | ✅ PILIHAN UTAMA |
| OpenAI Whisper API | Berbayar & butuh key. Skip v1. |
| Groq Whisper API | Alternatif tercepat (gratis tier), butuh `GROQ_API_KEY`. |
| Vosk | Ringan tapi akurasi Indonesia di bawah Whisper. Skip. |
| Web Speech API | Praktis tapi kontrol terbatas. Skip. |

### 3. Streaming / latensi

- Edge TTS tidak streaming kata-per-kata, tapi sangat cepat per kalimat.
  Teknik efektif: **sentence chunking + pre-generate** — pecah jawaban jadi
  kalimat, generate TTS kalimat 1, mainkan, sambil generate kalimat 2, dst.
- Pre-generate frasa umum ("Sebentar ya", "Oke", "Siap") di cache `assets/audio/`.
- Streaming sungguhan di kemudian hari: ElevenLabs (didukung Hermes TTS).

### 4. Lip sync / viseme

- Edge TTS **tidak** menyediakan viseme → setuju pakai **Rhubarb Lip Sync**
  (offline, cross-platform, output `.json` timing per phoneme).
  (uLipSync itu untuk Unity — tidak relevan dengan stack kamu.)
- Alur: TTS → `.wav`/`.mp3` → Rhubarb → JSON viseme → three.js blend shapes
  (mulut AIUE-O).
- Alternatif tanpa Rhubarb: **amplitude-based lip sync** (AnalyserNode Web
  Audio) — lebih kasar, nol dependency.

### 5. Bahasa

- Bahasa Indonesia didukung baik oleh kedua pilihan:
  - Edge TTS: `id-ID-GadisNeural`, `id-ID-ArdiNeural`.
  - faster-whisper: set `stt.local.language: id` (atau env `HERMES_LOCAL_STT_LANGUAGE=id`).
- Perubahan config Hermes:
  ```yaml
  tts:
    provider: edge
    edge:
      voice: id-ID-GadisNeural
  stt:
    provider: local
    local:
      model: base      # atau small
      language: id
  ```

### 6. Prioritas: gratis vs kualitas

**Gratis + mudah dipakai end-user untuk versi 1.** Edge TTS + faster-whisper =
kualitas "cukup natural" tanpa API key/biaya — penting karena mau di-publish ke
GitHub. Bridge tetap **provider-agnostic** (avatar cukup terima audio), jadi
upgrade ke ElevenLabs cukup ganti config Hermes tanpa ubah kode avatar.

---

## Catatan Implementasi

- Fungsi TTS Hermes: `~/.hermes/hermes-agent/tools/tts_tool.py` (provider: edge,
  elevenlabs, openai, minimax, gemini, xai, piper, custom command).
- Fungsi STT Hermes: `~/.hermes/hermes-agent/tools/transcription_tools.py`
  (provider: local/groq/openai/mistral/elevenlabs).
- Cara avatar memanggil TTS:
  1. **Langganan Hermes serve/plugin** → Hermes generate audio, kirim `audio_b64`
     (paling bersih, logika suara tetap di Hermes). ← **Rekomendasi MVP**
  2. Avatar panggil TTS sendiri (`edge-tts` via Node/Python) — lebih cepat
     iterasi tapi duplikasi logika.
- Rhubarb Lip Sync: https://github.com/DanielSWolf/rhubarb-lip-sync
