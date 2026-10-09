# Q&A — Integrasi Hermes (Bridge)

> **Status:** ✅ ANSWERED — 2026-10-09
> **Jawaban oleh:** Hermes (inspeksi langsung ke instalasi Hermes v0.18.2 di `~/.hermes`)
> **Dokumen terkait:** `docs/ARCHITECTURE.md`, `docs/API_BRIDGE.md`

---

## 📤 Pertanyaan (diajukan ke Hermes)

### Konteks singkat
Kami sedang membangun **Hermes 3D Avatar**: lapisan visual (Electron + three.js,
desktop pet transparan) yang menampilkan hasil kerja Hermes lewat **Bridge**
(WebSocket/JSON). Hermes tetap "otak" (percakapan, tools, memory, cron,
integrasi); avatar hanya "aktor".

### 1. Bentuk integrasi yang paling pas
Bagaimana cara paling tepat menghubungkan Hermes ke bridge? Plugin system?
HTTP callback/webhook? Atau polling/API?

### 2. Mendapatkan "teks jawaban" secara real-time
Kapan Hermes mulai berpikir (→ thinking) dan kapan jawaban final siap (→
speaking)? Ada event "thinking started"/"response ready"? Dukungan streaming?

### 3. Memory & konteks
Apakah avatar perlu menangani memory, atau Hermes sepenuhnya? Perlu ID sesi?

### 4. Tools / integrasi (Home Assistant, cron, dll.)
Ada event saat Hermes menjalankan tools untuk memicu animasi/ekspresi khusus?

### 5. Emosi / ekspresi
Bisakah Hermes memberi tahu emosi tiap jawaban agar avatar menampilkan ekspresi?

### 6. Auth & keamanan
Apakah perlu auth/token untuk bridge lokal?

---

## ✅ Jawaban Hermes

### Ringkasan Eksekutif

Kabar baik: **tidak perlu membangun "jembatan" dari nol.** Hermes sudah punya
dua jalur resmi:

1. **`hermes serve`** — gateway JSON-RPC/WebSocket (default `127.0.0.1:9119`).
   API yang sama dipakai Electron desktop app & dashboard resmi Hermes. Avatar
   (Electron + three.js) bisa jadi "renderer kustom" di atas API ini.
2. **Plugin system** — tulis plugin `avatar-bridge` di `~/.hermes/plugins/`
   yang nge-hook event agent (`pre_llm_call` = mulai berpikir, `post_llm_call` =
   jawaban siap, `post_tool_call` = tools jalan, dll) lalu push ke avatar.

Rekomendasi: **dua-duanya, bertahap** — mulai dari `hermes serve` (tercepat &
paling stabil), lalu tambah plugin untuk event yang tidak tercakup (emosi,
thinking, tool).

### 1. Bentuk integrasi

Hermes punya plugin system. Struktur:

```
~/.hermes/plugins/<nama-plugin>/
├── plugin.yaml          # manifest: name, version, provides_hooks, provides_tools
└── __init__.py          # berisi def register(ctx)
```

Contoh terpasang: `hermes-mnemosyne` di `~/.hermes/plugins/mnemosyne/`
(menyediakan tools memory + hooks `pre_llm_call`, `on_session_start`,
`post_tool_call`). Gunakan sebagai template.

Tiga opsi, dari yang paling direkomendasikan:

| Opsi | Cara kerja | Cocok untuk |
|------|-----------|-------------|
| **A. `hermes serve` (JSON-RPC/WebSocket)** | Avatar connect sebagai client ke `ws://127.0.0.1:9119`, kirim pesan user & terima balasan (termasuk streaming). | Chat utama (teks masuk/keluar), sesi, streaming — **MVP** |
| **B. Plugin `avatar-bridge`** | Plugin register hooks → kirim event JSON ke avatar via WebSocket/HTTP lokal. | Event `thinking`, `emotion`, `tool_executed` yang tidak ada di RPC chat |
| **C. `hermes hooks` / `hermes webhook`** | Shell-script hooks (config.yaml) atau HTTP webhook subscription. | Trigger sederhana / notifikasi, bukan chat interaktif |

Endpoint/event konkret:
- `hermes serve` → JSON-RPC/WebSocket di `127.0.0.1:9119` (ubah pakai `--port`).
  Skema RPC di `apps/shared` (`~/.hermes/hermes-agent/apps/shared`). Reference:
  Electron desktop app resmi (`~/.hermes/hermes-agent/apps/desktop`).
- Hook plugin (dari `hermes_cli/plugins.py`): `pre_llm_call`, `post_llm_call`,
  `post_tool_call`, `pre_tool_call`, `transform_llm_output`, `on_session_start`,
  `on_session_end`, `on_session_reset`, `subagent_start`, `subagent_stop`,
  `pre_gateway_dispatch`, `pre_approval_request`, `post_approval_response`.

### 2. Teks jawaban real-time

| Kebutuhan | Cara mendapatkannya |
|-----------|---------------------|
| Thinking started | Hook `pre_llm_call` → push `{"type":"thinking"}`. MVP tanpa plugin: infer dari "pesan terkirim & belum ada balasan". |
| Response ready | Hook `post_llm_call` → push `{"type":"speaking", ...}`. Atau via `hermes serve`: balasan RPC tiba = speaking. |
| Streaming token | Gateway `serve` mendukung streaming (dipakai desktop app). Cek `apps/shared` + `.plans/streaming-support.md`. |
| Hanya final | `hermes -z "pertanyaan"` (CLI one-shot) — untuk awal, tapi tidak real-time. |

Rekomendasi latensi rendah: pakai `hermes serve` (ada streaming), dan di avatar
jalankan TTS per kalimat (kalimat pertama dibaca saat kalimat berikutnya masih
streaming).

### 3. Memory & konteks

- Hermes yang menangani memory sepenuhnya (Mnemosyne aktif). Avatar tidak perlu
  simpan riwayat.
- Avatar cukup kirim ID sesi agar konteks berlanjut. Tanpa ID, dianggap
  percakapan baru.
- Di `hermes serve`, sesi dikelola lewat API sesi (`apps/shared`).

### 4. Tools / integrasi

- Hook `post_tool_call` menangkap tiap tool selesai (Home Assistant, terminal,
  dll). Plugin bisa terjemahkan nama tool → animasi (mis. `ha_call_service` →
  avatar senyum + aksi "nyalain lampu").
- Hook `pre_tool_call` untuk indikator "Hermes sedang pakai tools".
- Cron & event lain dipantau lewat `hermes webhook` atau hook sesi.

### 5. Emosi / ekspresi

Hermes **tidak punya field emosi bawaan**. Dua cara andal:

1. **Tag emosi (direkomendasikan, deterministik).** Skill/system prompt agar
   Hermes mengawali jawaban dengan `[emotion:happy]`. Avatar memotong tag lalu
   memakainya untuk ekspresi. Hook `transform_llm_output` bisa ekstrak & sisipkan
   tag otomatis.
2. **Deteksi heuristik di avatar.** Klasifikasi teks sederhana → mapping blend
   shape, tanpa ubah sisi Hermes.

Format disarankan:
```json
{"type":"speaking","text":"...","emotion":"happy","audio_b64":"..."}
```

### 6. Auth & keamanan

- `hermes serve` default bind `127.0.0.1` → hanya dari mesin lokal. **Aman tanpa
  token** untuk MVP.
- Jangan bind `0.0.0.0`/internet. Sejak hardening Juni 2026, bind publik wajib
  pakai auth provider (password/OAuth).
- Plugin bridge cukup listen `127.0.0.1`.

---

## Arsitektur yang Disarankan

```
┌───────────────────────────┐         ┌────────────────────────────────┐
│  Avatar App               │         │  Hermes Agent (v0.18.2)        │
│  (Electron + three.js)    │  WS A   │  ┌──────────────────────────┐  │
│  · three.js renderer      │◄───────►│  │ hermes serve :9119       │  │
│  · lip sync (Rhubarb)     │ JSON-RPC│  │ (JSON-RPC/WebSocket)     │  │
│  · TTS audio player       │         │  └────────────┬─────────────┘  │
│  · mic (STT)              │         │               │                │
└───────────┬───────────────┘         │  ┌────────────▼─────────────┐  │
            │ WS B                    │  │ avatar-bridge plugin     │  │
            │ (event: thinking,       │  │  hooks: pre/post_llm_call│  │
            │  emotion, tool)         │  │  push event → WS B       │  │
            └────────────────────────►│  └──────────────────────────┘  │
                                       └────────────────────────────────┘
WS A = chat utama (kirim teks, terima jawaban/streaming, sesi)
WS B = event realtime (thinking/emotion/tool) dari plugin
```

Tahapan:
- **Fase 1 (MVP):** hanya WS A via `hermes serve`. Thinking di-infer, speaking
  dari balasan RPC.
- **Fase 2:** tambah plugin `avatar-bridge` untuk WS B.

## Contoh Payload JSON

Plugin `avatar-bridge` → avatar (WS B):
```json
{"type":"thinking","ts":1728480000,"data":{"session_id":"abc"}}
{"type":"tool","ts":1728480001,"data":{"tool":"ha_call_service","status":"ok"}}
{"type":"speaking","ts":1728480002,"data":{"text":"Halo!","emotion":"happy"}}
{"type":"idle","ts":1728480003,"data":{}}
```

Avatar → Hermes:
```json
{"type":"user_text","data":{"text":"Nyalakan lampu ruang tamu"}}
{"type":"click","data":{"x":0.5,"y":0.3,"part":"head"}}
```

## Referensi untuk Implementasi

1. `~/.hermes/hermes-agent/apps/shared` — client JSON-RPC resmi (sumber kebenaran skema RPC).
2. `~/.hermes/hermes-agent/apps/desktop` — reference renderer Electron.
3. `~/.hermes/hermes-agent/hermes_cli/plugins.py` — daftar `VALID_HOOKS` + `register(ctx)`.
4. `~/.hermes/plugins/mnemosyne/` — contoh plugin nyata.
5. `hermes serve --help`, `hermes hooks --help`, `hermes webhook --help`.
