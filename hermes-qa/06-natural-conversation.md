# Q&A — Percakapan Natural (Avatar Persona)

> **Status:** ✅ ANSWERED — 2026-10-09
> **Jawaban oleh:** Hermes (inspeksi langsung: `~/.hermes/SOUL.md`,
> `~/.hermes/config.yaml`, `tui_gateway/server.py`, docs `features/personality.md`,
> `cli-config.yaml.example`)
> **Dokumen terkait:** `docs/API_BRIDGE.md`, `05-progress-report.md`

---

## 📤 Pertanyaan (diajukan ke Hermes)

### Konteks singkat
Avatar (Hermes 3D Avatar) sudah bisa chat + TTS + STT. Tapi jawaban Hermes masih
terlalu panjang/detail, sehingga audio TTS panjang & terasa "tertinggal", dan
terasa seperti membaca artikel, bukan ngobrol. Kami ingin Hermes menjawab
**ringkas & natural** seperti manusia.

### 1. Jawaban ringkas (paling penting)
Bagaimana membuat Hermes menjawab singkat & to-the-point, lalu menawarkan detail
lebih lanjut (bukan langsung ceramah)? Apakah ada skill/system prompt? Atau
konfigurasi (max tokens, verbosity)? Cara terbaik: skill, persona, atau config.yaml?

### 2. Emosi / ekspresi
Apakah ada cara agar Hermes menyisipkan tag emosi `[emotion:happy]` di awal
jawaban (untuk ekspresi avatar), tanpa merusak teks yang dibaca TTS?

### 3. Format jawaban untuk TTS
Apakah ada pengaturan agar jawaban tanpa markdown/format rumit, tanpa emoji
berlebihan, dan berupa kalimat natural yang enak dibaca TTS?

### 4. Rekomendasi konfigurasi
Konfigurasi konkret agar Hermes: (1) menjawab ringkas 1-2 kalimat,
(2) menawarkan detail lanjutan dengan pertanyaan balik, (3) menyisipkan tag
emosi, (4) output teks polos untuk TTS.

---

## ✅ Jawaban Hermes

### Ringkasan Eksekutif

Cara terbaiknya **bukan skill, tapi `SOUL.md` + `agent.personalities` +
`display.personality`**. Ini adalah lapisan resmi Hermes untuk mengatur gaya
bicara, sudah terverifikasi di instalasi kamu (v0.18.2):

- `~/.hermes/SOUL.md` — fondasi identitas Hermes (sudah ada, bisa diedit).
- `agent.personalities` di `~/.hermes/config.yaml` — definisi persona bernama.
- `display.personality` — persona aktif (nilai: nama persona yang didefinisikan).
- `display.final_response_markdown: strip` — **sudah aktif** di config kamu
  (membuang markup dari jawaban final).

**Rekomendasi: buat persona `avatar` khusus untuk mode avatar**, lalu set
sebagai `display.personality: avatar`. Gaya percakapan jadi konsisten tanpa
mengubah perilaku Hermes di CLI/chat biasa.

---

### 1. Jawaban ringkas

Ada 3 lapisan yang bisa dipakai (dari paling pas ke paling teknis):

| Cara | Di mana | Efek |
|------|---------|------|
| **Persona `avatar` (rekomendasi)** | `agent.personalities` + `display.personality` | Gaya bicara ringkas + tanya balik, bisa diaktifkan/nonaktifkan |
| **SOUL.md** | `~/.hermes/SOUL.md` | Fondasi identitas global — pasang aturan "jawab ringkas" di sini kalau mau berlaku di semua permukaan |
| **`max_tokens`** | config model (`max_tokens: N`) | Batas keras panjang jawaban per respons |

Catatan:
- `max_tokens` adalah **cap output** — bukan cara terbaik untuk "gaya natural".
  Ia membatasi, tapi tidak membuat Hermes *menawarkan detail*. Pakai persona
  untuk gaya, dan `max_tokens` hanya sebagai pengaman bila perlu.
- Tidak ada key "verbosity" di Hermes. Kontrol panjang jawaban = persona/system
  prompt + (opsional) `max_tokens`.

### 2. Emosi / ekspresi

Tidak ada fitur bawaan yang otomatis menyisipkan `[emotion:...]`. Tapi **bisa
dan aman** dilakukan lewat prompt persona:

- Instruksikan dalam persona agar Hermes mengawali jawaban dengan tag, contoh:
  `[emotion:happy]`, `[emotion:neutral]`, `[emotion:thinking]`.
- **Avatar memotong tag itu sebelum TTS & bubble** (regex sederhana:
  `^\[emotion:([a-z]+)\]\s*`), sehingga teks yang dibaca bersih.
- Jangan letakkan tag di akhir/antar kalimat — konsisten di awal saja biar mudah
  dipotong.

### 3. Format jawaban untuk TTS

Dua hal:

1. **`display.final_response_markdown: strip` sudah aktif** di config kamu —
   Hermes membuang markup di jawaban final. Ini bagus untuk TTS.
2. Tetap tambahkan aturan eksplisit di persona: "jawab dengan teks polos, tanpa
   heading/list/tabel, tanpa emoji berlebihan, maksimal N kalimat".

Karena TTS edge-tts akan membaca semua karakter yang lolos, aturan persona lebih
ampuh daripada mengandalkan strip markdown saja (mis. untuk mencegah bullet
manual `-`, emoji, atau kode).

### 4. Rekomendasi konfigurasi (langsung pakai)

#### Langkah A — Tambah persona `avatar` di `~/.hermes/config.yaml`

Di bawah `agent:`, tambahkan (atau edit jika sudah ada):

```yaml
agent:
  personalities:
    avatar: >
      Kamu adalah asisten suara dengan avatar 3D. Selalu jawab dengan gaya
      ngobrol santai, ringkas, dan natural seperti manusia.

      ATURAN WAJIB:
      1. Jawab maksimal 1-2 kalimat pendek.
      2. Jangan langsung ceramah atau memberi detail panjang. Setelah jawaban
         inti, tawarkan detail dengan pertanyaan balik singkat.
         Contoh: "Mau aku jelaskan lebih detail?"
      3. Awali SETIAP jawaban dengan tag emosi, pilih salah satu dari:
         [emotion:happy], [emotion:neutral], [emotion:thinking],
         [emotion:surprised], [emotion:sad]. Lalu lanjutkan teks jawaban.
      4. Gunakan teks polos tanpa markdown (tanpa heading, list, tabel, atau
         format kode). Tanpa emoji berlebihan.
      5. Kalimat harus enak dibaca text-to-speech: hindari singkatan aneh,
         simbol, dan struktur yang tidak wajar diucapkan.
      6. Jawab dalam bahasa yang sama dengan user (Bahasa Indonesia jika user
         berbahasa Indonesia).
```

> YAML `>` = melipat baris jadi satu paragraf. Aman untuk prompt panjang.

#### Langkah B — Set persona aktif

```yaml
display:
  personality: avatar
```

(Config kamu saat ini `display.personality: ''` — tinggal diisi `avatar`.)

#### Langkah C — (Opsional) Pengaman panjang jawaban

Di config model, hanya jika masih kepanjangan setelah persona diterapkan:

```yaml
model:
  default: cbcn/deepseek-v4-pro
  provider: custom
  # ... sisanya tetap ...
max_tokens: 512   # cap output; sesuaikan (contoh: 512 cukup utk 1-2 kalimat)
```

> **Peringatan:** `max_tokens` terlalu kecil bisa memotong jawaban penting.
> Mulai dengan persona dulu, baru set `max_tokens` jika masih over.

#### Langkah D — Restart & verifikasi

```bash
# restart hermes serve agar config baru terbaca
hermes serve --host 127.0.0.1 --port 9119
```

Cek:
```bash
hermes -z "Ada apa hari ini?" -m cbcn/deepseek-v4-pro
```

Harusnya keluar kira-kira:
```
[emotion:neutral] Sekarang Jumat, 9 Oktober. Mau aku rincikan cuaca atau agenda hari ini?
```

---

## Catatan Implementasi untuk AI VSCode (avatar side)

1. **Potong tag emosi di avatar** sebelum TTS/bubble:
   ```javascript
   const m = text.match(/^\[emotion:([a-z]+)\]\s*/i);
   if (m) {
     const emotion = m[1];
     text = text.slice(m[0].length);      // teks bersih untuk TTS/bubble
     avatarController.setExpression(emotion); // drive ekspresi
   }
   ```

2. **Mapping emosi → ekspresi** (contoh):
   ```javascript
   const EXPRESSION_MAP = {
     happy: 'smile', neutral: 'neutral', thinking: 'thinking',
     surprised: 'surprised', sad: 'sad',
   };
   ```

3. **Fallback heuristik** bila tag tidak muncul (mis. jawaban dari path lain):
   deteksi kata positif/negatif → ekspresi default. Jangan crash jika tidak ada tag.

4. **Jangan kirim tag ke TTS** — kalau lolos, edge-tts akan membacakan
   "emotion happy", merusak pengalaman.

---

## Hasil akhir yang diharapkan (terpenuhi)

- ✅ 1 cara pasti: persona `avatar` + `display.personality: avatar`.
- ✅ Konfigurasi/skill yang bisa langsung dipakai: blok YAML di atas.
- ✅ Catatan tag emosi (dipotong di avatar, tidak dibaca TTS) & format TTS
  (`final_response_markdown: strip` + aturan persona teks polos).
