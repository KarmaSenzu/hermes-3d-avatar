# Q&A — Integrasi Chat (Fase 2, Follow-up)

> **Status:** ✅ ANSWERED — 2026-10-09
> **Jawaban oleh:** Hermes (inspeksi langsung ke source Hermes v0.18.2:
> `tui_gateway/server.py`, `apps/shared/src/json-rpc-gateway.ts`,
> `apps/desktop/src/*`, `apps/desktop/electron/*`)
> **Dokumen terkait:** `docs/API_BRIDGE.md`, `docs/ARCHITECTURE.md`

---

## 📤 Pertanyaan (diajukan ke Hermes)

### Konteks singkat
Kami sudah inspeksi `apps/shared` dan `apps/desktop` milik Hermes, dan menemukan
dua jalur komunikasi (WebSocket JSON-RPC + REST API), tapi belum menemukan
method pasti untuk **mengirim pesan chat** dan **menerima jawaban**.

### 1. Cara mengirim pesan user (paling penting)
Cara paling sederhana & resmi bagi aplikasi pihak ketiga (avatar) untuk mengirim
teks user ke Hermes dan menerima jawaban? Via WebSocket JSON-RPC method tertentu
(sebutkan nama + params), atau via REST endpoint? Mana yang direkomendasikan
untuk MVP?

### 2. Cara menerima jawaban (teks)
Setelah pesan terkirim, bagaimana menerima teks jawaban final? Event WebSocket
apa? Format payload-nya? Atau REST response langsung berisi jawaban?

### 3. Streaming (opsional, untuk latensi rendah)
Apakah ada event streaming (`message.delta`) yang mengirim teks per token/chunk?
Format payload-nya?

### 4. Session ID
Apakah wajib membuat session terlebih dahulu sebelum kirim pesan? Atau boleh
tanpa `session_id` dan Hermes buatkan otomatis?

### 5. Auth / koneksi
WebSocket URL yang benar untuk `hermes serve`? Path setelah host:port? Perlu
token/auth untuk localhost? REST base URL-nya apa?

### 6. Contoh minimal end-to-end
Contoh konkret alur lengkap: connect → kirim "Halo" → terima jawaban.

---

## ✅ Jawaban Hermes

### Ringkasan Eksekutif

| Item | Jawaban |
|------|---------|
| **Metode kirim pesan** | WebSocket JSON-RPC: **`prompt.submit`** |
| **Metode terima jawaban** | Event WS **`message.complete`** (field teks: `payload.text`) |
| **Streaming** | Event WS **`message.delta`** (field teks: `payload.text`) |
| **Session** | **Wajib** buat dulu via RPC **`session.create`** → dapat `session_id` |
| **WS URL** | `ws://127.0.0.1:9119/api/ws` |
| **REST base URL** | `http://127.0.0.1:9119` |
| **Auth localhost** | **Tidak perlu token** (bind 127.0.0.1 = trusted lokal) |
| **REST untuk kirim chat** | **Tidak ada** — REST hanya untuk session CRUD; kirim chat harus via WS |

**Rekomendasi MVP: WebSocket JSON-RPC.** Ini satu-satunya jalur resmi untuk
mengirim pesan & menerima jawaban secara live. REST `POST /api/chat` **tidak ada**
(yang ada hanya `POST /api/chat/image-upload` untuk upload gambar).

### 1. Cara mengirim pesan user

**Method RPC: `prompt.submit`**

Sumber: `tui_gateway/server.py` baris 8420–8508 (dekorator `@method("prompt.submit")`).

Contoh frame JSON-RPC yang dikirim avatar → Hermes:

```json
{
  "jsonrpc": "2.0",
  "id": "r1",
  "method": "prompt.submit",
  "params": {
    "session_id": "a1b2c3d4",
    "text": "Halo, perkenalkan dirimu!"
  }
}
```

Response RPC (langsung, bukan jawaban chat):

```json
{
  "jsonrpc": "2.0",
  "id": "r1",
  "result": {
    "ok": true,
    "status": "streaming"
  }
}
```

> ⚠️ **Penting:** Response RPC di atas **bukan** jawaban Hermes. Itu hanya
> konfirmasi "pesan diterima & turn dimulai". Jawaban asli datang lewat **event
> WS** (lihat bagian 2), bukan lewat response `id` ini.

Opsi lain: `llm.oneshot` (stateless, tanpa sesi, tanpa history):

```json
{
  "jsonrpc": "2.0",
  "id": "r2",
  "method": "llm.oneshot",
  "params": {
    "instructions": "Kamu asisten avatar. Jawab singkat.",
    "input": "Halo"
  }
}
```

Response langsung berisi teks: `{"jsonrpc":"2.0","id":"r2","result":{"text":"Halo! ..."}}`.
Cocok untuk MVP super sederhana, **tapi tidak menyimpan konteks percakapan**
(rekomendasi: jangan untuk avatar utama — pakai `prompt.submit`).

### 2. Cara menerima jawaban (teks)

**Event: `message.complete`** — membawa teks jawaban final.

Event dikirim Hermes sebagai frame `method: "event"`:

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "type": "message.complete",
    "session_id": "a1b2c3d4",
    "payload": {
      "text": "Halo! Saya Hermes, asisten AI kamu. Ada yang bisa saya bantu?",
      "usage": { "input_tokens": 120, "output_tokens": 45 },
      "status": "complete",
      "rendered": "<versi-teks-dengan-markup-ANSI>"
    }
  }
}
```

Field penting di `payload`:
- `text` → **teks jawaban final** (pakai ini untuk TTS & tampilan).
- `status` → `complete` | `interrupted` | `error`.
- `rendered` → opsional, versi render markup (biasanya diabaikan avatar).
- `usage` → statistik token (opsional).
- `reasoning` → opsional, teks reasoning kalau model mengeluarkannya.

Urutan event satu turn lengkap:

```
message.start        → turn dimulai (payload kosong/None)
message.delta        → streaming potongan teks (berulang)
... (reasoning.delta, tool.start/complete bisa muncul di antaranya)
message.complete     → teks final (payload.text)
```

Sumber: `tui_gateway/server.py` baris 9150–9160.

### 3. Streaming (opsional, untuk latensi rendah)

**Ya, ada: event `message.delta`.**

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "type": "message.delta",
    "session_id": "a1b2c3d4",
    "payload": {
      "text": "Halo! Saya ",
      "rendered": "Halo! Saya "
    }
  }
}
```

- Field teks: **`payload.text`** (potongan/token).
- Event ini berulang; gabungkan (`concat`) semua `payload.text` sampai
  `message.complete` tiba.
- Cocok untuk: avatar mulai TTS kalimat pertama begitu ada cukup delta, tanpa
  menunggu seluruh jawaban selesai.

### 4. Session ID

**Wajib membuat session terlebih dahulu** sebelum `prompt.submit`.

Cara membuat session — RPC `session.create`:

```json
{
  "jsonrpc": "2.0",
  "id": "r0",
  "method": "session.create",
  "params": {
    "title": "Avatar chat",
    "cwd": "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai )"
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": "r0",
  "result": {
    "ok": true,
    "session_id": "a1b2c3d4",
    "stored_session_id": "sess_01J...",
    "message_count": 0,
    "messages": [],
    "info": { "model": "cbcn/deepseek-v4-pro", "cwd": "...", "lazy": true }
  }
}
```

- `session_id` (8 hex chars) → **dipakai untuk `prompt.submit`**.
- `stored_session_id` → ID durable di DB (untuk resume lintas restart).
- `cwd` opsional tapi disarankan, biar Hermes tahu workspace project.
- Tanpa `session.create`, `prompt.submit` akan error karena session tidak ada
  (server memakai `_sess_nowait`).

### 5. Auth / koneksi

| Item | Nilai |
|------|-------|
| **WebSocket URL** | `ws://127.0.0.1:9119/api/ws` |
| **REST base URL** | `http://127.0.0.1:9119` |
| **Auth localhost** | **Langsung connect, tanpa token.** `hermes serve` default bind `127.0.0.1` (loopback = trusted). |
| **Remote/token** | `ws://<host>:9119/api/ws?token=<TOKEN>` (hanya jika bind non-loopback; bind publik wajib auth sejak hardening Juni 2026) |

Bukti dari source:
- Path WS `/api/ws` dikonfirmasi di `apps/desktop/electron/connection-config.test.ts`:
  `buildGatewayWsUrl('http://127.0.0.1:9119', 'abc')` → `ws://127.0.0.1:9119/api/ws?token=abc`
  → tanpa token: `ws://127.0.0.1:9119/api/ws`.
- `hermes serve --help` menyatakan default `--host 127.0.0.1 --port 9119`.

> **Catatan:** Untuk jalan manual, start server dengan:
> ```bash
> hermes serve --port 9119 --host 127.0.0.1
> ```
> (Desktop app resmi memanggil `serve --host 127.0.0.1 --port 0` untuk auto-port.)

### 6. Contoh minimal end-to-end

**Langkah 1 — Connect WebSocket:**

```javascript
const ws = new WebSocket("ws://127.0.0.1:9119/api/ws");

ws.onmessage = (msg) => {
  const frame = JSON.parse(msg.data);

  if (frame.method === "event" && frame.params?.type === "message.delta") {
    console.log("STREAM:", frame.params.payload.text);
  }

  if (frame.method === "event" && frame.params?.type === "message.complete") {
    console.log("FINAL:", frame.params.payload.text);
    // → kirim ke TTS + lip sync di avatar
  }
};
```

**Langkah 2 — Buat session:**

```javascript
function rpc(method, params, id) {
  ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
}

// setelah ws.onopen:
rpc("session.create", {
  title: "Avatar chat",
  cwd: "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai )"
}, "r0");
```

**Langkah 3 — Kirim pesan "Halo" setelah `session.create` sukses**
(ambil `result.session_id`, misal `a1b2c3d4`):

```javascript
rpc("prompt.submit", {
  session_id: "a1b2c3d4",
  text: "Halo"
}, "r1");
```

**Langkah 4 — Terima jawaban** (event, bukan response `id`):

```json
{"jsonrpc":"2.0","method":"event","params":{"type":"message.start","session_id":"a1b2c3d4"}}

{"jsonrpc":"2.0","method":"event","params":{"type":"message.delta","session_id":"a1b2c3d4","payload":{"text":"Halo!"}}}

{"jsonrpc":"2.0","method":"event","params":{"type":"message.complete","session_id":"a1b2c3d4","payload":{"text":"Halo! Ada yang bisa saya bantu?","usage":{"input_tokens":12,"output_tokens":8},"status":"complete"}}}
```

---

## Rekomendasi Final untuk Avatar

1. **MVP (tanpa streaming):**
   - WS connect ke `ws://127.0.0.1:9119/api/ws`
   - `session.create` sekali saat avatar start → simpan `session_id`
   - Kirim teks via `prompt.submit`
   - Ambil jawaban dari event `message.complete` → `payload.text`
2. **Latensi rendah:** dengarkan `message.delta`, mulai TTS kalimat pertama
   begitu teks terkumpul cukup.
3. **Thinking/emosi/tool event:** pakai plugin `avatar-bridge` (lihat
   `01-hermes-integration.md`) — `pre_llm_call` = thinking, `post_llm_call` =
   jawaban siap, `post_tool_call` = animasi tool.
4. **Jangan** pakai REST untuk kirim chat — tidak ada endpoint-nya. REST hanya
   untuk session CRUD (`GET /api/sessions`, dsb).

## Referensi Source (untuk AI VSCode)

| File | Isi |
|------|-----|
| `~/.hermes/hermes-agent/tui_gateway/server.py` | `@method("prompt.submit")` baris 8420, `@method("session.create")` baris 5161, `@method("llm.oneshot")` baris 6277, emit `message.complete` baris 9160 |
| `~/.hermes/hermes-agent/apps/shared/src/json-rpc-gateway.ts` | Format frame JSON-RPC & dispatch event |
| `~/.hermes/hermes-agent/apps/desktop/electron/connection-config.test.ts` | Konfirmasi URL `ws://127.0.0.1:9119/api/ws` |
| `~/.hermes/hermes-agent/apps/desktop/src/hermes.ts` | REST API list (`/api/sessions`, dll) |
