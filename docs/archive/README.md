# ARSIP — jangan dipakai, jangan dihapus

Dipindahkan dari lokasi asalnya pada 28 Oktober 2026 saat beres-beres pasca-audit
(lihat `docs/PROGRESS.md` entri 4.x). Isi folder ini **bekas kerja**, disimpan
hanya sebagai referensi sejarah — tidak ada yang di-build, di-lint, atau di-serve
dari sini.

| Folder | Asal | Isi |
|---|---|---|
| `mockups/` | `web/mockups/` | Mockup HTML eksplorasi tema UI (konsep A–D; final = konsep C) + snapshot QA watermark + `KONSEP-D.md` |
| `scratch/` | `web/scratch/` | Skrip debug one-off (e2e perjanjian, cek DB) + transcript `.vtt` |
| `screenshots/` | `web/screenshots/` | Screenshot progres migrasi UI admin (sudah basi, fitur live) |
| `debug-scripts/` | root `web/` | `check-css.mjs`, `find-colors.mjs`, `find-theme.mjs` — skrip cari warna CSS sekali pakai |

## Catatan

- Skrip `scripts/gen-watermark-*` masih menulis output ke `mockups/` di root
  `web/`. Kalau dijalankan lagi, folder `web/mockups/` akan dibuat ulang —
  hasilnya snapshot QA baru, bukan file arsip ini.
- File `.md` di arsip ini (termasuk `KONSEP-D.md`) adalah dokumentasi dan
  **tidak boleh dihapus**.
