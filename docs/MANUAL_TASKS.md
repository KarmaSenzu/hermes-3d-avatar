# Manual Tasks — Hal yang Harus Kamu Lakukan Sendiri

> **Status:** PENGINGAT AKTIF
> **Tujuan:** AI VSCode tidak bisa menjalankan shell/git atau download file
> biner. File ini berisi **daftar hal yang HARUS kamu lakukan manual** di
> terminal/browser. Coret `[x]` setelah selesai, dan beri tahu AI agar lanjut.

---

## ⏳ Tugas Manual yang Sedang Aktif

### T4 — Konfigurasi persona `avatar` (jawaban ringkas + tag emosi)

Berdasarkan jawaban Hermes (`hermes-qa/06-natural-conversation.md`), untuk
membuat Hermes menjawab ringkas + natural + tag emosi, edit
`~/.hermes/config.yaml`:

**1. Tambah persona `avatar` di bawah `agent:`:**

```yaml
agent:
  personalities:
    avatar: >
      Kamu adalah asisten suara dengan avatar 3D. Selalu jawab dengan gaya
      ngobrol santai, ringkas, dan natural seperti manusia.
      ATURAN WAJIB:
      1. Jawab maksimal 1-2 kalimat pendek.
      2. Jangan langsung ceramah. Setelah jawaban inti, tawarkan detail dengan
         pertanyaan balik singkat (mis. "Mau aku jelaskan lebih detail?").
      3. Awali SETIAP jawaban dengan tag emosi: [emotion:happy],
         [emotion:neutral], [emotion:thinking], [emotion:surprised], atau
         [emotion:sad]. Lalu lanjutkan teks jawaban.
      4. Teks polos tanpa markdown, tanpa emoji berlebihan.
      5. Kalimat enak dibaca TTS (hindari singkatan/simbol aneh).
      6. Jawab dalam bahasa yang sama dengan user.
```

**2. Set persona aktif:**

```yaml
display:
  personality: avatar
```

**3. Restart hermes serve:**

```bash
HERMES_DASHBOARD_SESSION_TOKEN=avatar-dev-token-123 hermes serve --host 127.0.0.1 --port 9119
```

**4. Verifikasi (opsional):**

```bash
hermes -z "Ada apa hari ini?"
```

Harusnya jawab ringkas dengan tag emosi di awal.

> Catatan: AI sudah menyiapkan pemotong tag emosi di sisi avatar — tag
> `[emotion:...]` otomatis dipotong sebelum TTS & bubble, dan dipakai untuk
> ekspresi wajah.

---

## ⏳ Tugas Manual yang Sedang Aktif (Fase 3 / P0)

### T3 — Install dependency baru (msedge-tts) + test suara

AI sudah implementasi P0 (TTS + lip sync + STT + emosi). Perlu install ulang
dependency lalu test.

**1. Install dependency baru:**

```bash
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm install
```

**2. Jalankan Hermes serve (terminal 1):**

```bash
HERMES_DASHBOARD_SESSION_TOKEN=avatar-dev-token-123 hermes serve --host 127.0.0.1 --port 9119
```

**3. Jalankan avatar (terminal 2):**

```bash
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
HERMES_DASHBOARD_SESSION_TOKEN=avatar-dev-token-123 npm run dev
```

**4. Test fitur suara:**
- [ ] Kirim pesan teks → avatar **berbicara** (TTS edge-tts, suara id-ID).
- [ ] Mulut avatar **bergerak** mengikuti suara (lip sync amplitude).
- [ ] Klik tombol 🎤 → bicara → teks transkripsi muncul → Hermes menjawab.
- [ ] Ekspresi berubah sesuai emosi jawaban (happy/sad/neutral).

> Kalau TTS gagal, cek koneksi internet (edge-tts butuh online). Kalau mic gagal,
> pastikan Hermes punya akses mic (macOS: izinkan terminal/aplikasi pakai mic).

---

## ⏳ Tugas Manual yang Sedang Aktif (Fase 2)

### T2 — Jalankan `hermes serve` + test chat nyata

AI sudah implementasi client Hermes (`hermes-client.js`) & sambungkan chat ke
Hermes. Untuk test:

**1. Jalankan Hermes serve DENGAN TOKEN (terminal terpisah):**

```bash
HERMES_DASHBOARD_SESSION_TOKEN=avatar-dev-token-123 hermes serve --host 127.0.0.1 --port 9119
```

> ⚠️ **PENTING:** endpoint `/api/ws` Hermes **butuh token auth** (bukan tanpa
> token — temuan baru dari inspeksi `web_server.py`). Set token tetap lewat env
> `HERMES_DASHBOARD_SESSION_TOKEN`.

**2. Jalankan app avatar dengan token yang SAMA (terminal lain):**

```bash
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
HERMES_DASHBOARD_SESSION_TOKEN=avatar-dev-token-123 npm run dev
```

**3. Di launcher klik "Mulai", lalu ketik pesan.** Avatar harusnya:
- "Terhubung ke Hermes. Siap!".
- Kirim pesan → Hermes berpikir → jawaban muncul (streaming + final).

> Kalau masih gagal, pastikan token di kedua terminal SAMA dan port 9119 benar.

---

## 📦 Tugas Manual Sebelumnya (Fase 1 — selesai)

### T0 — Perbaiki "Electron dianggap malware" (SEBELUM download model)

**Akar masalah:** Electron versi 31 yang terinstall sudah ditandai XProtect macOS
Sequoia sebagai malware. Solusi = **naikkan ke Electron 33+** (sudah AI update di
`package.json`).

Jalankan berurutan:

```bash
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"

# 1. Hapus node_modules lama + package-lock
rm -rf node_modules package-lock.json

# 2. Install ulang (akan download Electron versi baru)
npm install

# 3. Jalankan
npm run dev
```

> ✅ SUDAH SELESAI — Electron 33 jalan, launcher muncul.

### T0b — Restart dev setelah AI perbaiki bug preload

AI sudah perbaiki path preload (`.js` → `.mjs`) + `contextIsolation`. Restart:

```bash
# hentikan npm run dev yang lama (Ctrl+C), lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

Lalu cek: launcher seharusnya sekarang **tidak** menampilkan error
`getDefaultModelPath` lagi, dan field model terisi path default.

### T0c — Restart dev setelah AI perbaiki loader model (base64)

Error sebelumnya: `gagal memuat model : unexpected token` — karena renderer
tidak bisa fetch file lokal. AI sudah ubah: main process membaca file model →
kirim base64 → renderer load dari Blob. Restart lagi:

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

> **PENTING pastikan:** file `default.vrm` benar-benar file VRM (bukan hasil
> download halaman GitHub/HTML). Cek ukurannya wajar (ratusan KB s.d. puluhan MB),
> bukan hanya beberapa KB teks.

### T0d — Restart dev setelah AI perbaiki framing kamera (model terpotong)

Model sudah berhasil dimuat, tapi tampil setengah/terpotong. AI sudah perbaiki
`_frameModel()` di `desktop-pet.js`: hitung bounding box → arahkan kamera ke
tengah model → atur jarak agar seluruh badan masuk frame + margin 15%.

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

Lalu klik "Mulai" — model seharusnya tampil utuh (seluruh badan terlihat).

### T0e — Restart dev (framing kamera full body + responsive)

AI perbaiki ulang framing agar benar-benar full body & responsive:
- `_onResize()` kini **re-frame ulang** kamera setiap resize (responsive).
- Fallback ukuran container → `window.innerWidth/Height` (hindari aspect 0/NaN).
- `setModel()` panggil `_onResize()` dulu agar aspect benar sebelum framing.

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

Klik "Mulai" → karakter harus tampil **kepala sampai kaki, utuh, di tengah**.

### T0f — Restart dev (framing final: bounding box valid + komposisi kanan)

AI tulis ulang `desktop-pet.js` dengan pendekatan benar:
- `updateMatrixWorld(true)` sebelum hitung `Box3` (hindari box salah/NaN).
- Validasi bounding box (tolak nilai 0/NaN).
- Geser **model** (bukan kamera+lookAt bersamaan) untuk komposisi kanan.
- Variabel `sideOffsetRatio` (0=tengah, >0=kanan) & `marginRatio` mudah diatur.

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

> Karakter default **tengah** (`sideOffsetRatio = 0`). Kalau mau di kanan,
> beri tahu AI untuk ubah `sideOffsetRatio` (mis. 0.3).

### T0g — Restart dev (karakter naik ke atas kolom chat)

AI tambah `verticalOffsetRatio` agar karakter tampil **di atas kolom chat**:
- `verticalOffsetRatio = 0.22` (naik 22% dari tinggi model).
- Napas (avatar-controller) diperbaiki agar TIDAK menimpa offset vertikal.

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

> **Tuning manual (di `desktop-pet.js`):**
> - `verticalOffsetRatio`: naik/turunkan untuk atur posisi vertikal (mis. 0.15 = lebih rendah, 0.30 = lebih tinggi).
> - `sideOffsetRatio`: 0 = tengah, **negatif = kiri** (mis. -0.15), positif = kanan.
> - `marginRatio`: 0.12 = margin 12% (naikkan bila kepala/kaki terpotong).

### T0h — Restart dev (geser karakter ke kiri)

Karakter kurang ke kiri. AI set `sideOffsetRatio = -0.15` (geser kiri).

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

> Kalau masih kurang/telalu geser, ubah `sideOffsetRatio`:
> - makin negatif (mis. -0.30) = makin ke kiri
> - mendekati 0 = ke tengah

### T0i — Restart dev (geser lebih kiri + kecilkan avatar jadi setengah)

AI ubah:
- `sideOffsetRatio = -0.28` (geser lebih ke kiri, menuju tengah pandangan).
- `zoomFactor = 2.0` (model tampak setengah ukuran; kamera 2× lebih jauh).

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

> **Tuning manual (di `desktop-pet.js`):**
> - `sideOffsetRatio`: makin negatif = makin kiri, 0 = tengah, positif = kanan.
> - `verticalOffsetRatio`: naik/turun posisi vertikal.
> - `zoomFactor`: 1 = penuh frame, 2 = setengah, 1.5 = 2/3 ukuran, dst.
> - `marginRatio`: margin aman di sekeliling model.

### T0j — Restart dev (naikkan avatar + geser kiri 2× lipat)

AI ubah:
- `verticalOffsetRatio = 0.38` (naik lebih tinggi, menjauh dari bar teks chat).
- `sideOffsetRatio = -0.56` (geser kiri 2× lipat dari sebelumnya).

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

### T0k — Restart dev (naikkan lagi 2× lipat)

Posisi horizontal sudah pas (tengah). AI naikkan vertikal jadi 2×:
`verticalOffsetRatio = 0.76`.

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

### T1b — Test MMD loader (.pmx/.pmd) — OPSIONAL
AI sudah implementasi MMD loader + custom protocol `model://`:
- `.vrm`/`.glb` → base64 (sudah jalan).
- `.pmx`/`.pmd` → MMDLoader via URL `model://` (serve file + texture).
- `.fbx` → FBXLoader via URL `model://` (serve file + texture).

Untuk test, taruh file `.pmx`/`.fbx` (beserta folder texture-nya) di `avatar/assets/models/`,
lalu isi path-nya di launcher. Restart:

```bash
# Ctrl+C, lalu:
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm run dev
```

> **Catatan batasan:** texture MMD/FBX yang path-nya relatif memerlukan file
> texture berada di folder yang sama/relatif dengan model. Kalau model punya
> banyak texture terpisah, pastikan strukturnya utuh.

---

### T1 — Download model VRM default (CC0)

Kamu memilih langsung pakai model VRM. AI tidak bisa download file biner,
jadi **kamu yang download**, lalu taruh ke folder yang sudah ditentukan.

**Sumber (pilih salah satu):**

1. **Repo `madjin/vrm-samples`** (rekomendasi):
   https://github.com/madjin/vrm-samples
   - Buka folder `vroid/` → pilih salah satu file `.vrm`.
   - Atau file root `Avatar_Orion.vrm` / `cryptovoxels.vrm`.
   - Klik file → tombol **Download** (raw).

2. **VRoid sample resmi (AvatarSample A/B/C):**
   https://vroid.pixiv.help/hc/en-us/articles/4402394424089

**Langkah:**
- [ ] Download 1 file `.vrm` (pilih yang ukurannya wajar, mis. < 30 MB).
- [ ] Rename jadi `default.vrm`.
- [ ] Taruh di: `avatar/assets/models/default.vrm`

> Folder `avatar/assets/models/` sudah AI buatkan (beserta `NOTICE.md`).

---

## 📋 Tugas Manual yang Akan Datang (jangan dikerjakan dulu)

### T2 — Install dependensi (setelah scaffold selesai)

Setelah AI selesai membuat `avatar/package.json`, kamu jalankan:

```bash
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /avatar"
npm install
```

### T3 — Menjalankan app (dev mode)

```bash
npm run dev
```

### T4 — Commit tiap fase selesai

```bash
git add .
git commit -m "feat(avatar): <deskripsi singkat>"
git push
```

---

## Catatan

- Setiap tugas manual yang selesai, **beri tahu AI** (contoh: "model sudah
  didownload di default.vrm") agar AI melanjutkan langkah berikutnya.
- AI akan memperbarui file ini setiap ada tugas manual baru yang muncul.
- Konvensi commit ikuti `CONTRIBUTING.md` (Conventional Commits).
