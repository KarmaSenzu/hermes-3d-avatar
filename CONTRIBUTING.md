# Pedoman Kontribusi & Kebersihan Project

> **Proyek:** Hermes 3D Avatar
> **Versi:** 1.0
> **Tujuan:** Acuan bersama agar struktur folder/file, penamaan, kode, dan
> dokumentasi tetap **bersih, konsisten, dan mudah dipahami** — baik oleh
> kontributor maupun end-user yang menemukan repo ini di GitHub.

Dokumen ini **mengikat** untuk semua eksekusi berikutnya. Sebelum menambah
file/folder apa pun, pastikan mengikuti aturan di bawah.

---

## 1. Prinsip Umum

1. **Konvensi di atas preferensi pribadi.** Jika ragu, ikuti aturan di dokumen ini.
2. **Satu tanggung jawab per file/modul.** Jangan satukan banyak hal dalam satu file besar.
3. **Nama harus menjelaskan isi** tanpa perlu membuka file (`hermes_client.js`,
   bukan `client2.js`).
4. **Tidak ada file sampah** di repo (temp, `.DS_Store`, cache, node_modules).
5. **Dokumentasi hidup berdampingan dengan kode**, bukan ditaruh di kepala.

---

## 2. Struktur Folder Kanonikal (final)

```
hermes-3d-avatar/                    # repo (nama folder, bukan nama project display)
├── README.md                        # ringkasan, cara install & pakai (wajib)
├── LICENSE                          # lisensi project
├── CONTRIBUTING.md                  # dokumen ini
├── .gitignore                       # wajib ada sebelum commit pertama
├── .editorconfig                    # konsistensi indentasi antar editor
├── docs/                            # dokumentasi (markdown)
│   ├── GOALS.md
│   ├── ARCHITECTURE.md
│   ├── API_BRIDGE.md
│   ├── ROADMAP.md
│   └── CONVENTIONS.md               # (opsional) rincian konvensi kode
├── avatar/                          # app Electron + three.js (produk utama)
│   ├── package.json
│   ├── main/                        # Electron main process
│   │   └── index.js
│   ├── preload/
│   │   └── index.js
│   ├── renderer/                    # UI + logika tampilan
│   │   ├── index.html
│   │   ├── launcher.html
│   │   ├── settings.html
│   │   ├── styles/
│   │   │   └── main.css
│   │   └── js/
│   │       ├── model-loader.js
│   │       ├── hermes-client.js
│   │       ├── avatar-controller.js
│   │       ├── lip-sync.js
│   │       └── desktop-pet.js
│   └── assets/
│       ├── models/                  # .pmx/.pmd/.vrm/.glb default
│       ├── animations/              # idle, walk, thinking
│       └── audio/                   # cache TTS (pre-generate)
├── hermes-plugin/                   # plugin Hermes `avatar-bridge`
│   ├── plugin.yaml
│   └── src/
│       └── __init__.py
├── scripts/                         # utilitas dev (build, rhubarb, dsb)
│   └── README.md                    # jelaskan tiap script
└── test/                            # test (jika ada)
```

### Alasan struktur ini

- **`avatar/main/` dan `avatar/preload/`** dipisah dari `renderer/` → batas tegas
  antara proses Electron (Node) dan proses renderer (browser/three.js).
- **`assets/`** hanya berisi media statis, tidak pernah berisi kode.
- **`scripts/`** untuk tooling yang bukan bagian runtime app.
- **`hermes-plugin/src/`** — kode plugin dipisah dari `plugin.yaml` manifest.

---

## 3. Aturan Penamaan

### File & folder

| Jenis | Konvensi | Contoh |
|-------|----------|--------|
| Markdown (docs) | `UPPER_SNAKE_CASE.md` | `ARCHITECTURE.md`, `API_BRIDGE.md` |
| Kode JS/TS | `kebab-case.js` | `model-loader.js`, `hermes-client.js` |
| Kode Python | `snake_case.py` | `avatar_bridge.py` |
| HTML/CSS | `kebab-case` | `settings.html`, `main.css` |
| Aset/model | `kebab-case` + deskriptif | `default-girl.glb` |
| Folder | `kebab-case` (kecuali folder dokumen besar) | `hermes-plugin/`, `model-loader.js` |

- **Jangan** pakai spasi atau karakter khusus pada nama file/folder repo
  (path repo saat ini mengandung spasi — di repo GitHub nanti pakai nama bersih).
- Nama harus **deskriptif & pendek** (maks ~3 kata).

### Cabang Git

- `main` — selalu dalam keadaan stabil & bisa di-build.
- `feat/<nama>` — fitur baru (contoh: `feat/transparent-window`).
- `fix/<nama>` — perbaikan bug.
- `docs/<nama>` — perubahan dokumentasi.

---

## 4. Konvensi Commit

Gunakan **Conventional Commits** (memudahkan changelog otomatis & dipahami orang):

```
<tipe>(<scope>): <deskripsi singkat, imperative, tanpa titik>

tipe: feat | fix | docs | refactor | chore | test | build | perf
scope: avatar | hermes-plugin | docs | bridge | tts | stt (opsional)
```

Contoh:
- `feat(avatar): add transparent always-on-top window`
- `feat(hermes-plugin): push thinking event via pre_llm_call hook`
- `docs: finalize bridge spec aligned with hermes serve`
- `chore: add .gitignore and .editorconfig`

Aturan:
- Satu commit = satu perubahan logis (jangan campur 5 hal berbeda).
- Pesan commit pakai **Bahasa Inggris** (repo publik internasional).
- Deskripsi ≤ 72 karakter.

---

## 5. Standar Kode

### JavaScript / Electron (avatar)

- Indentasi **2 spasi** (diatur `.editorconfig`).
- Nama variabel/fungsi `camelCase`, kelas `PascalCase`, konstanta `UPPER_SNAKE_CASE`.
- Gunakan **ESM** (`import`/`export`), bukan `require`.
- Setiap modul punya **satu tanggung jawab** + komentar header singkat.
- Hindari magic number; pakai konstanta bernama.
- `console` dipakai untuk log; error dilempar dengan pesan jelas.

### Python (hermes-plugin)

- Ikuti **PEP 8**; indentasi **4 spasi**.
- Type hints pada fungsi publik.
- Struktur plugin ikuti pola `mnemosyne` (manifest `plugin.yaml` + `register(ctx)`).

### Umum

- **Tidak ada hardcode** path/port/key yang spesifik ke satu mesin.
  Endpoint, port, voice, model → baca dari config/settings (env atau JSON).
- Secret/API key **tidak pernah** di-commit (pakai `.gitignore` + `.env.example`).

---

## 6. `.gitignore` (wajib)

Minimal berisi:

```
node_modules/
dist/
out/
.DS_Store
*.log
.env
assets/audio/cache/
```

---

## 7. Dokumentasi

- **README.md** wajib menjawab: apa ini, fitur, prasyarat, cara install, cara
  pakai, cara ganti model sendiri, cara berkontribusi, lisensi.
- Dokumen teknis di `docs/` memakai header versi + status + tautan silang.
- Setiap perubahan signifikan → update dokumen terkait di commit yang sama.

---

## 8. Checklist Sebelum Commit (Definition of Clean)

- [ ] Tidak ada file temp / cache / `node_modules` yang ter-stage.
- [ ] Nama file & folder mengikuti konvensi.
- [ ] Kode terindentasi konsisten (`.editorconfig`).
- [ ] Tidak ada hardcode secret/path spesifik mesin.
- [ ] Dokumen terkait sudah diupdate.
- [ ] Commit message mengikuti Conventional Commits.

---

> **Catatan:** Dokumen ini akan berkembang seiring project. Perubahan besar
> pada konvensi harus disepakati dulu agar tidak bikin repo "berantakan" di
> tengah jalan.
