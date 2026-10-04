# ADR-001: Palet portal ikut logo client

Status: Accepted 29 Sep 2026

## Konteks
Palet lama Orange Action (#C24F24) tidak sreg. Logo client: background merah, teks putih.
Dasar portal harus putih (betah scroll, referensi Airbnb).

## Keputusan
- Merah logo terukur dari file: `#C52004` (sudut background murni).
- Token: surface `#FFFFFF`, soft `#F7F7F7`, ink `#222222`, muted `#717171`,
  line `#EBEBEB`, action `#C52004`, hover `#A31803`, deep `#7A1302`,
  soft `#FDECE7`, border `#F0C4B8`, WA `#128C5E`.
- Merah hanya untuk CTA <10% (tombol/badge/header aksen); body putih 90%.
- Diterapkan di `src/app/globals.css` (`--portal-*`); modul lain via var, tanpa hex hardcode.

## Konsekuensi
- Fallback hex lama di module CSS tidak aktif; dibereskan tahap unifikasi PortalCard.
- Preview: `public/palette-v3.html`.
