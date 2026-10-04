<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — jakselproperti.com

## Dokumen panduan (baca berurutan — anti-double)
1. `docs/BLUEPRINT-v0.3.md` — SATU-SATUNYA sumber keputusan (scope, penomoran, palet, role).
2. `docs/adr/` — detail tiap keputusan (ADR-001 palet, ADR-002 listing ID, ADR-003 seller/broker).
3. File ini — aturan coding operasional saja. Bila bertentangan dengan BLUEPRINT/ADR, BLUEPRINT menang.
4. `docs/PROGRESS.md` — history/changelog, BUKAN acuan keputusan.
5. Arsip (jangan jadikan acuan): `docs/archive/Blueprint-v0.2.md`,
   `docs/archive/Blueprint_v0.3_DRAFT.md`, `docs/archive/ui-foundation-v0.3.md`,
   `../../docs/Blueprint/AUTH-ROLE-IMPLEMENTATION-PLAN-v1.md`
   (teknis auth, sudah selesai di kode — target model ada di BLUEPRINT §5).
   Preview visual arsip: `docs/previews/` (sengaja di luar `public/` agar tidak terekspos publik).

## Project Overview

Platform properti nasional (berawal Jaksel).
Stack: **Next.js 16 (App Router) + Prisma 6 + MySQL + TypeScript 5**.
Foto/video disimpan di **Cloudflare R2** (via AWS S3 SDK) — bukan database,
bukan lokal. Auth: NextAuth v5 (beta).

Dokumentasi lengkap fitur yang sudah jadi: `docs/PROGRESS.md`

## Coding Standards

- **Business logic WAJIB di Service layer** (`src/lib/` atau `src/lib/services/`),
  JANGAN taruh logic langsung di API route / Server Action.
- **UI components** reusable di `src/components/ui/`, jangan bikin style
  form berulang-ulang.
- **Style field admin (FILLED)**: background `#f2f4f7` (light) / `#1a212e`
  (dark), border transparan, radius 8px. Focus → background surface +
  border amber + ring. Gunakan class `.admin-input` / `.ui-field__control`
  — JANGAN bikin style input per-module.
- **Font UI admin/broker**: Inter / Geist Sans.
- **Font angka/kode**: Geist Mono / JetBrains Mono.
- **Portal publik**: ikut `docs/BLUEPRINT-v0.3.md` §3 + ADR-001 (merah logo `#C52004`,
  dasar putih). JANGAN pakai Playfair/EB Garamond kecuali BLUEPRINT memerintahkan.
- **Prisma model naming**: PascalCase di schema, `@@map("snake_case")` untuk
  nama tabel di MySQL. Kolom: camelCase di kode, `@map("snake_case")` kalau beda.

## Portal publik (ringkas — detail di BLUEPRINT-v0.3 §3 + ADR-001)

- Token tunggal `--portal-*` di `src/app/globals.css`. Larang hex hardcode di module CSS.
- Dasar putih, aksi merah logo `#C52004`. WA hijau `#128C5E`.
- Halaman `/agents` di-HIDE via flag (data + route tetap utuh untuk section iklan broker).
- Detail properti TIDAK menampilkan broker pemilik listing.

## UI Design System Admin — "Modern SaaS Refined" (Theme C)

Ditetapkan 14 September 2026. Ini PATTERN WAJIB untuk semua UI admin/broker.

**Arsitektur 2 layer** (import di `admin/layout.tsx`, urutan penting):
1. `src/app/(admin)/admin/admin.css` — base layer (legacy)
2. `src/components/admin-ui/admin-ui.css` — **layer aktif**, sistem token
   `--workspace-*`. Selalu ubah theme lewat file ini, JANGAN admin.css.

**Palet Light (default):**
- bg `#fafafa` · surface `#ffffff` · surface-soft `#f8fafc`
- border `#eaecf0` · border-strong `#d0d5dd`
- text `#101828` · text-muted `#667085`
- primary (aksen) amber `#d97706` · hover `#b45309` · soft `#fffbf3`
- **tombol primary: tinta gelap** `#101828` (hover `#263241`) — amber BUKAN
  warna tombol primary, hanya aksen (nav aktif, focus, badge, link)
- danger `#d92d20` · success `#067647` · warning `#b54708`

**Palet Dark (`[data-theme="dark"]`):**
- bg `#0b0e14` · surface `#141821` · input `#1a212e`
- primary amber terang `#e8a849` · tombol primary amber (teks gelap `#1a1207`)

**Radius:** input/tombol/pill `--workspace-radius: 8px` ·
card/modal/stat `--workspace-radius-card: 12px`

**Shadow:** `0 1px 2px rgba(16,24,40,.04)` (light) / none (dark)

**Input (FILLED):** idle = bg `--workspace-input-bg`, border transparan ·
hover = border `border-strong` · focus = bg surface + border primary +
ring `--workspace-ring` · error = border danger + bg merah lembut ·
disabled = border dashed. Height min 42px (48px/16px font di mobile —
anti-zoom iOS).

**Aturan pakai:** modul baru WAJIB pakai primitif bersama (`.admin-card`,
`.admin-btn-*`, `.admin-input`, `.ui-field`, `.ui-button`, `.ui-status`)
— jangan bikin CSS form per-module kecuali layout spesifik (contoh:
`.search` di module CSS pakai token `--workspace-*`).

## Role & Permission (Platform)

Ditetapkan 14 September 2026. Model **flat**: `SUPER_ADMIN` / `SUPPORT`
(staff) + `BROKER` (onboarding lalu workspace operasional setelah terverifikasi).

| Kemampuan | SUPER_ADMIN | SUPPORT | BROKER |
|---|:---:|:---:|:---:|
| Kelola user & role (`/admin/users`, API users) | ✅ | ❌ | ❌ |
| Hapus permanen (DELETE endpoint resource) | ✅ | ❌ | ❌ |
| Lihat & edit seluruh data operasional | ✅ | ✅ | ❌ |
| Workspace data milik sendiri | ❌ | ❌ | ✅ (setelah VERIFIED) |

- **Guard API:** `requireOperationalUser()` / `requireStaff()` / `requireSuperAdmin()` dari
  `src/lib/api-auth.ts` — WAJIB dipakai di endpoint sensitif, jangan
  cek role manual dengan string.
- **Matriks & label role:** `src/lib/permissions.ts` — UI tidak
  meng-hardcode string role.
- **Soft delete user:** kolom `users.deletedAt` — akun terhapus tetap
  tersimpan untuk audit trail dan otomatis ditolak saat login
  (`src/auth.ts`).
- **Proteksi diri sendiri:** admin tidak bisa menonaktifkan, menghapus,
  atau mendemote akunnya sendiri (dicek di API + UI).
- DELETE endpoint resource utama (properties/owners/intermediaries/
  customers/kawasan/users) di-guard `requireSuperAdmin()`.
- User terhapus/nonaktif dengan JWT masih aktif tetap valid sampai
  token expire (JWT strategy — keterbatasan yang disadari).
- **Akun dev:** `admin@jakselproperti.com` / `jaksel-admin-2026` ·
  `support@jakselproperti.com` / `jaksel-support-2026` ·
  `sarah@jakselproperti.com` / `jaksel-broker-2026`

### Konfigurasi Akses Modul (module access)

Matriks role × modul yang bisa diubah SUPER_ADMIN dari
`/admin/settings/module-access` (tabel `role_module_access`).
- **Katalog & default:** `src/lib/module-access.ts` (`MODULES`,
  `MODULE_DEFAULTS`, `getAccessibleModules`, `canAccessModule`,
  `getModuleMatrix`). Bila baris DB belum ada → fallback default.
- **Enforcement:** nav (`AdminShell` via `accessibleModules` dari
  `admin/layout.tsx`), halaman settings (server-side check), proxy untuk
  halaman khusus SUPER_ADMIN.
- **Modul terkunci:** `users` (Tim & Akses) dan halaman Konfigurasi
  Akses selalu SUPER_ADMIN — tidak bisa dimatikan (anti-lockout).
- **Scope broker:** broker terverifikasi hanya melihat properti, listing,
  dan leads dari listing dengan `managedById` miliknya. Enforcement ada
  di halaman server dan Route Handler, bukan hanya penyaringan nav.

### Notifikasi (preferensi per user)

- **Katalog event:** `src/lib/notifications.ts` (6 event, relevansi per
  role, default enabled). Absennya baris preferensi = pakai default.
- **Tabel:** `notification_preferences` (userId × eventKey × channel).
  Channel: `IN_APP` aktif; `EMAIL`/`WHATSAPP` preferensi tersimpan,
  pengiriman menyusul setelah provider dihubungkan.
- **API:** `GET/PUT /api/notification-preferences` — user mengelola
  preferensi sendiri (staff & broker).
- **UI:** `/admin/settings/notifications` — modul `notifications`
  dalam matriks akses.
- Sonner (toast) adalah komponen UI feedback instan — bukan bagian
  sistem notifikasi ini.

### Kepemilikan Listing (scope data broker)

- **Kolom:** `listings.managedById` (nullable, relasi ke `users`,
  index). Diisi OTOMATIS dari user yang membuat listing di semua jalur
  create (manual, import CSV, smart import sebelum simpan).
- **Fungsi:** broker hanya melihat/mengelola listing yang dia kelola.
  Staff tetap bisa melihat seluruh data operasional.
- Jangan pernah mengosongkan/memindahkan `managedById` tanpa alasan
  transfer pengelolaan yang jelas.

### Area (wilayah administratif) — hierarki nasional

- **Level:** `1 = provinsi · 2 = kab/kota · 3 = kecamatan · 4 = kelurahan/desa`
  (model `Area`, relasi self `parentId`, `officialCode` = kode Kemendagri).
- **Data nasional:** dataset `prisma/data/wilayah.sql`
  (cahyadsn/wilayah, MIT, Kepmendagri 300.2.2-2430/2025 — 91.162 baris).
  Import via `npm run db:import-wilayah` (idempotent, setelah `db:seed`).
- **Kecamatan Jaksel** (seed) mempertahankan ID, slug, dan kode prefix
  lama (CLD, KBB, dst). Kecamatan lain mendapat kode prefix unik
  otomatis dari nama (mis. Tanah Sareal → `TACB`) untuk kode properti.
- **Query kecamatan WAJIB filter `level: 3`** — jangan asumsikan
  "semua area" = kecamatan (ada 91 ribu baris nasional).
- **Parser AI (ai-parse)** di-scope ke Jabodetabek (prompt LLM tidak
  muat 7 ribu kecamatan); area lain dipilih manual di form — tanpa
  fallback paksa ke area pertama.
- **Import CSV:** nama kecamatan bisa kembar antar kota — kolom
  `kota` (opsional) dipakai disambiguasi; ambigu = error baris.
- **Halaman publik** (dropdown filter `/jual`) masih di-scope ke
  kecamatan Jaksel (`parent.officialCode: "31.74"`).
- Data wilayah adalah referensi statis, bukan konten admin; tidak ada
  halaman CRUD/browser `/admin/areas`.
- Form properti memakai `AreaPicker` lazy-load berjenjang provinsi →
  kab/kota → kecamatan → kelurahan/desa. `properties.areaId` tetap
  menyimpan kecamatan untuk kode properti, sedangkan `villageId`
  menyimpan kelurahan/desa opsional.
- Form kawasan memakai `AreaPicker` sampai kecamatan (level 3).
- **API kawasan** POST/PUT memvalidasi `areaId` harus kecamatan
  (level 3).

## Konvensi Penting (JANGAN diubah tanpa konfirmasi user)

### Property Number & Listing Number

Nomor publik yang ditampilkan ke pengguna. **TERPISAH** dari primary key
database (UUID). Format: `"{nomor_urut}-{check_digit}"`.

**Spesifikasi:**
- 2 counter independen di tabel `sequence_counters`:
  - `property`: dimulai dari 100001, naik +1 tiap Property baru
  - `listing`: dimulai dari 500001, naik +1 tiap Listing baru
- Counter TIDAK saling terhubung dan TIDAK boleh reset
- Increment WAJIB atomic/thread-safe (MySQL row lock via `$transaction`)
- Check digit dihitung dengan algoritma **Luhn**:
  1. Dari digit paling kanan, gandakan (×2) setiap digit di posisi genap
  2. Jika hasil ×2 > 9, kurangi 9
  3. Jumlahkan semua digit
  4. Check digit = `(10 - (total % 10)) % 10`
- Contoh: nomor urut `100001` → check digit `7` → tampilan `"100001-7"`
- **TIDAK ADA kode wilayah/kota/area** dalam nomor ini. Informasi lokasi
  ditampilkan terpisah di UI (badge/label kawasan).
- Kolom database: `properties.property_number` dan `listings.listing_number`
  (VARCHAR(20), UNIQUE, nullable untuk backward-compatibility)

**File utama:** `src/lib/sequence-number.ts`
**Unit tests:** `src/lib/__tests__/sequence-number.test.ts` (21 tests)

### Property Code (Internal)

Kode internal properti, format **numerik murni tanpa huruf**:
`"{kode Kemendagri kecamatan}-{running 4 digit}"`.

**Spesifikasi:**
- Prefix = 6 digit kode wilayah resmi Kemendagri (prov 2 + kab/kota 2 +
  kec 2) dari `areas.officialCode`, titik dibuang.
  Contoh: `31.74.07` (Kebayoran Baru) → `317407`, `32.71.06`
  (Tanah Sareal, Kota Bogor) → `327106`.
- Running number **per-kecamatan** (masing-masing mulai `0001`),
  atomic via tabel `sequence_counters` dengan name `prop:{prefix}`
  (di-seed otomatis dari max existing saat pertama kali dipakai).
  **JANGAN SELECT MAX+1** — lihat Traps #1.
- Contoh: `317407-0001`, `317405-0002`, `327106-0001`.
- **Kawasan BUKAN bagian kode** — kawasan tampil sebagai badge/label
  terpisah di UI (konsisten dengan prinsip nomor publik).
- File: `src/lib/property-code.ts` (`getNextPropertyCode`,
  `ensurePropertyCodeCounter`, `nextPropertyCodeInTx`). Kolom:
  `properties.code` (unique).
- `Area.code` (huruf, cth. CLD/KBB) adalah **legacy** — hanya tersisa
  di 10 kecamatan Jaksel, tidak dipakai untuk kode properti lagi.

## Database

- **Primary key** semua tabel: UUID — **KECUALI tabel referensi statis `Area`
  yang pakai `Int autoincrement`** (91 ribu baris, UUID membengkakkan
  tabel & index).
- **Harga** disimpan sebagai `Decimal(15,0)` dalam Rupiah (tanpa desimal)
- **Alamat lengkap** bersifat internal — publik hanya lihat area/kawasan
- **Schema changes** di dev: gunakan `prisma db push` (ada drift dari
  setup awal tanpa migration history)

## Build & Test

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Unit tests (vitest run)
npm run test:watch   # Vitest watch mode
npm run db:push      # Push schema ke MySQL
npm run db:seed      # Seed database
npm run db:studio    # Prisma Studio GUI
```

## Traps to Avoid

1. **JANGAN pakai `SELECT MAX(id)+1`** untuk sequence counter — race condition
   saat concurrent access. Selalu pakai atomic `UPDATE ... +1` dalam transaction.
2. **JANGAN sync data demo Supabase ke production MySQL.**
3. **JANGAN hapus kolom `code` di Property** — itu kode internal, beda dari
   `property_number` (nomor publik).
4. **JANGAN masukkan kode wilayah** ke Property Number / Listing Number.
5. **JANGAN edit block `BEGIN:nextjs-agent-rules`** di atas — itu auto-generated
   oleh `next dev` dan akan dibuat ulang kalau dihapus.
