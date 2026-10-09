# Keputusan — Model Default (Fase 0, item 6)

> **Status:** ✅ DIPUTUSKAN — 2026-10-09
> **Konteks:** menutup item 6 Fase 0 di `docs/ROADMAP.md`

---

## Latar Belakang

Kebutuhan: model 3D **default** yang di-ship bersama project, agar end-user
langsung melihat hasil tanpa harus mencari model sendiri. Syarat mutlak untuk
publish ke GitHub: **lisensi jelas & bebas** (bukan model MMD random dari
internet yang lisensinya tidak jelas).

## Rekomendasi (prioritas teratas)

### 1. VRM — VRoid sample (CC0) ⭐ direkomendasikan

Sumber: https://github.com/madjin/vrm-samples

- Folder `vroid/` berisi model VRoid berlisensi **CC0** (copyright dilepas,
  bebas dipakai/diubah/didistribusikan — tanpa syarat).
- Cocok untuk v1 karena: format VRM didukung `three-vrm`, **ada morph/blendshape
  ekspresi bawaan** (penting untuk ekspresi & lip sync), dan bebas lisensi total.

### 2. VRM — AvatarSample A/B/C (VRoid resmi)

Sumber: https://vroid.pixiv.help/hc/en-us/articles/4402394424089

- Model sample resmi Pixiv VRoid. Boleh dipakai/diubah/didistribusikan asal
  mengikuti **syarat pemakaian** (copyright tidak dilepas, tapi syarat longgar).
- Perlu mencantumkan atribusi/syarat di `assets/models/` (file `NOTICE.md`).

### 3. GLB low-poly — placeholder (fallback Fase 1)

- Untuk memulai coding tanpa menunggu model, pakai primitive three.js
  (kapsul/kotak) atau GLB low-poly bebas lisensi (mis. dari Kenney/Quaternius).
- Catatan Hermes (`hermes-qa/03`): v1 sebaiknya **GLB/glTF low-poly ≤ 50k
  triangle** untuk hemat resource di M2/8GB.

---

## Keputusan Akhir

| Opsi | Lisensi | Keputusan |
|------|---------|-----------|
| VRoid sample CC0 (VRM) | CC0 | **Default utama** |
| AvatarSample A/B/C (VRM) | Syarat pemakaian Pixiv | Cadangan |
| GLB low-poly placeholder | CC0/public domain | Fallback saat coding Fase 1 |

**Aksi selanjutnya (saat Fase 1):**
1. Download 1 model VRM CC0 dari `madjin/vrm-samples` → taruh di
   `avatar/assets/models/default.vrm`.
2. Buat `avatar/assets/models/NOTICE.md` berisi sumber + lisensi + link.
3. Tulis loader `.vrm` (three-vrm) sebagai jalur default; loader `.pmx`/`.pmd`
   (MMD.js) sebagai fitur drop-in user.

---

## Catatan Lisensi Model Drop-in (user)

Karena user bisa drop-in model MMD sendiri, README harus menegaskan: model yang
di-drop-in user tunduk pada lisensi masing-masing, dan bukan tanggung jawab
project. (Sudah tercantum di `README.md`.)
