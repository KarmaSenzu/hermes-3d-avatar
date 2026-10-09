# Panduan Git Init & Push Awal (Fase 0, item 7)

> **Status:** SIAP DIJALANKAN (oleh user di terminal)
> **Repo target:** https://github.com/KarmaSenzu/hermes-3d-avatar.git

---

## ⚠️ Catatan penting sebelum mulai

1. AI VSCode **tidak bisa menjalankan `git`** (tidak ada akses shell). Jadi
   langkah di bawah **kamu jalankan sendiri di terminal** project ini.
2. **Nama folder lokal** saat ini mengandung spasi & tanda kurung:
   `Hermes 3D Avatar (Asisten Ai )`. Ini **tidak masalah untuk Git**, tapi saat
   mengetik path di terminal, wajib pakai tanda kutip `"..."`.
3. Repo GitHub kamu (`hermes-3d-avatar.git`) **nama bersih** (tanpa spasi) —
   ini bagus. Folder lokal boleh tetap, hanya nama repo GitHub yang bersih.

---

## Langkah 1 — Cek apakah sudah ada repo GitHub-nya

- Jika kamu sudah membuat repo kosong di GitHub (`KarmaSenzu/hermes-3d-avatar`),
  ikuti **Skenario A**.
- Jika belum (URL itu masih rencana), buat dulu repo kosong **tanpa** README/
  .gitignore/license di GitHub (biar tidak bentrok), lalu ikuti **Skenario A**.

---

## Skenario A — Repo GitHub kosong (rekomendasi)

Buka terminal, masuk ke folder project:

```bash
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) "
```

Inisialisasi & konfigurasi identitas (ganti nama/email sesuai akun GitHub kamu):

```bash
git init
git branch -M main
git config user.name "KarmaSenzu"
git config user.email "emailkamu@example.com"
```

Hubungkan remote & commit awal:

```bash
git remote add origin https://github.com/KarmaSenzu/hermes-3d-avatar.git
git add .
git commit -m "chore: initial project scaffold (docs, q&a, contributing, license)"
git push -u origin main
```

---

## Skenario B — Repo GitHub sudah ada isinya (README dsb.)

Jika repo GitHub sudah punya commit, tarik dulu lalu gabungkan:

```bash
git remote add origin https://github.com/KarmaSenzu/hermes-3d-avatar.git
git pull origin main --allow-unrelated-histories
# selesaikan konflik bila ada, lalu:
git push -u origin main
```

---

## Verifikasi Fase 0 selesai

Setelah push sukses, cek:

- [ ] `git status` bersih (tidak ada file belum di-commit).
- [ ] Folder lama `answers/` dan `questions-for-hermes/` **sudah dihapus**
      sebelum commit (lihat catatan di bawah).
- [ ] `node_modules/`, `.DS_Store`, `*.log` **tidak ikut ter-commit**
      (terblokir `.gitignore`).

---

## ⚠️ Sebelum commit: hapus folder lama

Dua folder ini sudah tidak dipakai (isinya sudah digabung ke `hermes-qa/`).
Hapus sebelum `git add .` agar repo bersih:

```bash
rm -rf "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /answers"
rm -rf "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) /questions-for-hermes"
```

> Folder ini berisi `README.md` penunjuk "dipindahkan" — aman dihapus, konten
> aslinya sudah utuh di `hermes-qa/`.

---

## Catatan

- Setelah ini, setiap commit ikuti **Conventional Commits** (lihat `CONTRIBUTING.md`).
- `main` adalah branch utama & stabil.

---

## Commit Fase 1 — Prototipe Visual (MVP)

> **Status:** SIAP DIJALANKAN (oleh user di terminal)

### Strategi branch

Gunakan branch fitur `feat/avatar-mvp` untuk pekerjaan Fase 1, lalu merge ke
`main` setelah stabil. Ini menjaga `main` selalu bersih.

```bash
cd "/Users/damarfikrie/Documents/Coding/Hermes 3D Avatar (Asisten Ai ) "

# 1. Buat & pindah ke branch fitur
git checkout -b feat/avatar-mvp

# 2. Pastikan node_modules TIDAK ter-stage (sudah di .gitignore)
git status

# 3. Stage semua perubahan Fase 1
git add .

# 4. Commit dengan pesan jelas (Conventional Commits)
git commit -m "feat(avatar): implement Fase 1 MVP (transparent window, multi-format model loader, idle animation, launcher)"
```

### Deskripsi singkat commit (untuk GitHub)

Judul: `feat(avatar): implement Fase 1 MVP`

Isi (bisa dipakai saat merge/pull request):

```
Implementasi Fase 1 (Prototipe Visual MVP):

- Electron window transparan + always-on-top + frameless + draggable.
- Launcher untuk pilih model lalu Start.
- Loader model multi-format: .vrm (three-vrm), .glb/.gltf (GLTFLoader),
  .pmx/.pmd (MMDLoader), .fbx (FBXLoader).
- Custom protocol model:// untuk serve file model + texture dari disk.
- Animasi idle: blink (blendshape) + napas.
- Framing kamera otomatis (full-body) + komposisi tunable + responsive.
- Input teks mock (chat dummy, belum terhubung ke Hermes).
- Build tooling: Vite + electron-vite.
- Docs: CHANGELOG, CONTRIBUTING, ARCHITECTURE, API_BRIDGE, ROADMAP, dll.
```

### Push branch ke GitHub

```bash
git push -u origin feat/avatar-mvp
```

### Merge ke main (setelah diuji)

```bash
git checkout main
git merge feat/avatar-mvp
git push origin main
```

> **Catatan:** Kalau kamu belum commit Fase 0 sebelumnya (repo masih kosong),
> jalankan dulu bagian "Skenario A" di atas untuk commit awal, baru lanjut ke
> commit Fase 1 ini.
