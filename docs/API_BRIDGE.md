# Hermes 3D Avatar — Spesifikasi Bridge API

> **Versi:** 1.1 (Draft)
> **Status:** PLANNING — skema selaras dengan jawaban Hermes
> **Terkait:** `GOALS.md`, `ARCHITECTURE.md`, `../hermes-qa/01-hermes-integration.md`

---

## 1. Gambaran Umum

Komunikasi antara **Hermes (otak)** dan **Avatar (aktor)** lewat **WebSocket/JSON**.
**Tidak ada bridge server terpisah** — bridge sudah disediakan Hermes lewat dua jalur:

```
Avatar App  ⇄  hermes serve :9119  (WS A: chat utama, JSON-RPC/WebSocket)
     └──────►  avatar-bridge plugin (WS B: event thinking/emotion/tool)
```

- **WS A** = `hermes serve` (default `127.0.0.1:9119`). Avatar jadi client, kirim
  pesan user & terima balasan/streaming. Ini API resmi yang dipakai Electron desktop app.
- **WS B** = plugin `avatar-bridge` (di `~/.hermes/plugins/`) yang nge-hook event
  agent dan push JSON ke avatar.

Skema JSON di dokumen ini mendefinisikan **format event yang dipakai di kedua kanal**
(kanonikal, provider-agnostic).

---

## 2. Format Pesan Dasar

```json
{
  "type": "<jenis_event>",
  "ts": 1699999999,
  "data": {}
}
```

| Field | Tipe | Keterangan |
|-------|------|------------|
| `type` | string | Jenis event (wajib) |
| `ts` | integer | Unix timestamp (detik) saat event dibuat |
| `data` | object | Payload event (bisa kosong `{}`) |

---

## 3. Event: Hermes → Avatar

| type | data | Keterangan |
|------|------|------------|
| `thinking` | `{"session_id": "...", "duration_ms": 0}` | Hermes mulai berpikir → animasi thinking |
| `speaking` | `{"text": "...", "emotion": "happy", "audio_b64": "...", "visemes": [...]}` | Jawaban siap → TTS + lip sync |
| `idle` | `{}` | Kembali idle |
| `tool` | `{"tool": "ha_call_service", "status": "ok"}` | Tool selesai dieksekusi → animasi/aksi |
| `action` | `{"name": "walk_to", "x": 0.5, "y": 0.2}` | Perintah animasi khusus |
| `emotion` | `{"name": "happy", "intensity": 0.8}` | Ubah ekspresi wajah |
| `config` | `{"key": "value", ...}` | Update konfigurasi avatar saat runtime |

### 3.1 Detail `speaking`

```json
{
  "type": "speaking",
  "ts": 1699999999,
  "data": {
    "text": "Halo! Ada yang bisa saya bantu?",
    "emotion": "happy",
    "emotion_intensity": 0.7,
    "audio_b64": "UklGRiQAAABXQVZF...",
    "audio_format": "wav",
    "visemes": [
      { "time": 0.0, "morph": "A" },
      { "time": 0.12, "morph": "I" },
      { "time": 0.24, "morph": "U" }
    ]
  }
}
```

- `visemes` (opsional): daftar target morf mulut + timing. Edge TTS **tidak**
  menyediakan viseme, jadi dihasilkan lewat **Rhubarb Lip Sync** (offline) dari
  audio. Jika kosong, Avatar estimasi sendiri (Rhubarb atau amplitude-based).
- `audio_b64` (opsional): audio base64. Untuk MVP, **Hermes yang generate audio**
  (via TTS bawaan) lalu kirim `audio_b64`; Avatar tinggal putar + lip sync.

### 3.2 Daftar `emotion` yang didukung (awal)

`neutral`, `happy`, `sad`, `angry`, `surprised`, `thinking`, `sleepy`, `excited`.

### 3.3 Daftar `action` (awal)

`walk_to`, `jump`, `wave`, `sit`, `look_at`, `stop`.

---

## 4. Event: Avatar → Hermes

| type | data | Keterangan |
|------|------|------------|
| `user_text` | `{"text": "...", "session_id": "..."}` | User mengetik / hasil STT → ke Hermes |
| `user_voice` | `{"audio_b64": "...", "format": "wav"}` | Rekaman mic (untuk STT oleh Hermes) |
| `click` | `{"x": 0.5, "y": 0.3, "part": "head"}` | User klik avatar |
| `drag` | `{"x": 0.5, "y": 0.3}` | User drag avatar |
| `ready` | `{}` | Avatar siap menerima event |
| `ping` | `{}` | Heartbeat |
| `status` | `{"state": "idle"|"thinking"|"speaking"}` | Update state avatar |

> **Memory & konteks:** Hermes yang menangani penuh (Mnemosyne). Avatar cukup
> mengirim `session_id` (jika ada) agar konteks berlanjut; tanpa ID, dianggap
> percakapan baru.

---

## 5. Handshake & Lifecycle

1. **Avatar** terhubung → kirim `ready` `{}`.
2. **Bridge** balas `config` dengan setting awal (opsional).
3. **Heartbeat:** Avatar kirim `ping` tiap N detik; bridge balas `pong`.
4. Saat **Hermes** terhubung, kirim `ready` juga, lalu siap kirim event.

Event tambahan `pong` (bridge → avatar) untuk menjawab `ping`:

```json
{ "type": "pong", "ts": 1699999999, "data": {} }
```

---

## 6. Contoh Alur Lengkap (Mode Suara)

```
1. User bicara → Avatar rekam mic (push-to-talk untuk hemat CPU)
2. Avatar → Hermes (WS A): { "type": "user_voice", "data": { "audio_b64": "...", "format": "wav" } }
3. Hermes STT (faster-whisper) → teks → LLM berpikir
4. Hermes → Avatar (WS B plugin): { "type": "thinking", "data": { "session_id": "abc" } }
5. Avatar: animasi thinking
6. Hermes selesai → TTS (Edge) → audio + tag emosi
7. Hermes → Avatar (WS B): { "type": "speaking", "data": { "text": "...", "emotion": "happy", "audio_b64": "..." } }
8. Avatar: putar audio + Rhubarb viseme (lip sync) + ekspresi
9. Selesai → Avatar idle → kirim status idle
```

> Untuk MVP (Fase 1): `thinking` di-infer (pesan terkirim & belum ada balasan),
> `speaking` dari balasan RPC `hermes serve`. Plugin (WS B) masuk di Fase 2.

---

## 7. Aturan & Catatan

- Semua payload JSON **UTF-8**.
- `ts` memakai Unix time (detik).
- Audio besar: pertimbangkan streaming (chunk) di versi lanjut; untuk MVP,
  base64 satu blok cukup.
- **Emosi:** Hermes tak punya field emosi bawaan. Pakai tag `[emotion:happy]` di
  awal jawaban (via hook `transform_llm_output`), lalu avatar memotong tag itu.
  Alternatif: deteksi heuristik di avatar (tanpa ubah Hermes).
- `hermes serve` default bind `127.0.0.1` → aman tanpa token untuk MVP. Jangan
  bind ke `0.0.0.0`.
- Versioning: tambahkan `"v": 1` di data bila perlu di masa depan.

---

## 8. Status Implementasi

- [ ] Belum diimplementasikan (planning).
- [x] Bentuk integrasi sudah terjawab (lihat `hermes-qa/01-hermes-integration.md`):
      `hermes serve` (WS A) + plugin `avatar-bridge` (WS B).
