> ARSIP — digantikan `BLUEPRINT-v0.3.md` FINAL + `docs/adr/` (29 Sep 2026). Jangan jadikan acuan.

# UI Foundation v0.3 — Marketplace Nasional

Status: prototype untuk persetujuan arah visual.

## Keputusan yang dikunci

- Portal publik mempertahankan arah premium, Belum ada permintaan client untuk mengubahnya.
- Broker workspace menggunakan visual enterprise yang terinspirasi pola kerja Odoo 19, tanpa menyalin identitas merek Odoo.
- Broker workspace menggunakan Inter dengan fallback system sans-serif.
- Mobile adalah perangkat kerja utama; tabel desktop berubah menjadi record card, bukan dipaksa mengecil.
- Form menggunakan label permanen dan underline field dengan state focus, error, disabled, dan helper text yang jelas.
- Seluruh modul memakai pola konsisten: list/kanban, record header, status, contextual actions, tabs, form sections, activity, dan audit history.

## Lapisan component library

1. Design tokens: warna, typography, spacing, border, radius, elevation, dan breakpoint.
2. Primitives: button, underline field, textarea, select, status badge, tabs, dialog, drawer, toast.
3. Patterns: record header, filter toolbar, responsive record list, form section, action bar, activity timeline.
4. Domain composition: users, organizations, branches, properties, listings, leads, dan auctions.

Business rule tidak ditempatkan di primitive visual. Query database dan tenant permission hanya dijalankan pada server.

## Prototype pertama

- `/admin/users`: direktori user dengan pencarian, filter status/role, tabel desktop, dan cards mobile.
- `/admin/users/[id]`: worksheet user dengan tab Profil, Hak akses, dan Aktivitas.
- `/admin/users/new`: form invitation versi prototype.
- `/admin/brokers`: direktori organisasi broker dengan pencarian, filter, dan ringkasan jaringan.
- `/admin/brokers/[id]`: worksheet profil broker dengan tab Profil, Cabang, Tim, dan Verifikasi.
- `/admin/brokers/new`: registrasi broker versi prototype.

Data pada tahap ini adalah fixture `.test`; tombol simpan hanya membuktikan interaction pattern dan tidak menulis ke database.

## Checkpoint client

Sebelum integrasi database, client perlu menyetujui:

- typography dan density;
- enterprise blue/neutral palette;
- app shell desktop dan mobile;
- underline fields;
- responsive record cards;
- worksheet header, tabs, sections, dan sticky mobile actions.

Setelah checkpoint disetujui, schema organisasi, cabang, membership, role, permission, invitation, dan audit log dapat diimplementasikan tanpa mengulang UI.

## Palet portal publik — Orange Action

Palet ini khusus portal publik dan tidak mengubah Theme C pada admin/broker workspace.

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `portal-action` | `#C24F24` | CTA utama, tombol pencarian, filter terpilih, focus ring, dan link interaktif |
| `portal-action-hover` | `#A83D18` | Hover dan pressed state CTA |
| `portal-action-deep` | `#742D16` | Harga, teks aksen, dan ikon berkontras tinggi |
| `portal-action-soft` | `#FAEEE8` | Latar state aktif dan badge aksen |
| `portal-action-border` | `#DEA084` | Border focus/selected yang lembut |
| `portal-ink` | `#222222` | Judul dan teks utama |
| `portal-muted` | `#717171` | Metadata dan teks sekunder |
| `portal-line` | `#E8E1D8` | Border dan divider |
| `portal-surface` | `#FFFDF9` | Latar portal |

Warna hijau hanya digunakan secara semantik: `#32C781` untuk status aktif dan `#128C5E` untuk WhatsApp. Badge tipe properti memakai charcoal agar tidak bersaing dengan CTA oranye.
