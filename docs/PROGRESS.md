# Dokumen Progres Pengembangan — jualrumahproperty.com

**Versi Acuan:** Blueprint v0.3  
**Terakhir Diperbarui:** 3 November 2026  
**Status Build:** ✅ Sukses (TypeScript 0 error, Lint 0 error, Next.js Build 0 error)  

---

## Daftar Isi
1. [Ringkasan Arsitektur & Teknologi](#1-ringkasan-arsitektur--teknologi)
2. [Implementasi Basis Data (Schema & Relasi)](#2-implementasi-basis-data-schema--relasi)
3. [Daftar Fitur & Modul yang Sudah Selesai](#3-daftar-fitur--modul-yang-sudah-selesai)
   - 3.1 [Modul Owner (Pemilik Properti)](#31-modul-owner-pemilik-properti)
   - 3.2 [Modul Perantara (Broker / Agen)](#32-modul-perantara-broker--agen)
   - 3.3 [Modul Listing & Workflow Status](#33-modul-listing--workflow-status)
   - 3.4 [Modul Properti & Edit / Safe Delete](#34-modul-properti--edit--safe-delete)
   - 3.5 [Modul Kawasan Populer](#35-modul-kawasan-populer)
   - 3.6 [Modul Customer (Calon Pembeli CRM)](#36-modul-customer-calon-pembeli-crm)
   - 3.7 [Modul Leads (CRM Kanban Board)](#37-modul-leads-crm-kanban-board)
   - 3.8 [Fitur Bulk / Batch Import Properti (CSV)](#38-fitur-bulk--batch-import-properti-csv)
   - 3.9 [Sistem Penomoran Publik (Property Number & Listing Number)](#39-sistem-penomoran-publik-property-number--listing-number)
4. [Perbaikan Bug & Solusi Arsitektur UI](#4-perbaikan-bug--solusi-arsitektur-ui)
   - 4.1 [Solusi Modal Terpotong (Height Clipping Fix)](#41-solusi-modal-terpotong-height-clipping-fix)
   - 4.2 [Responsivitas Layar & Bottom Navigation](#42-responsivitas-layar--bottom-navigation)
   - 4.3 [Sinkronisasi Tema Gelap/Terang & PWA Cache Purge](#43-sinkronisasi-tema-gelapterang--pwa-cache-purge)
5. [Panduan Menjalankan & Pengujian](#5-panduan-menjalankan--pengujian)

---

## 1. Ringkasan Arsitektur & Teknologi

| Komponen | Teknologi yang Digunakan | Keterangan |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3 (App Router + Turbopack) | Server Components + Client Interactivity |
| **Database** | MySQL (Laragon local dev / Production) | Single-database sesuai Blueprint |
| **ORM** | Prisma 6.19 | Schema declarative, type-safe query client |
| **Styling** | Tailwind CSS v4 + Vanilla CSS Tokens (`admin.css`) | Konsistensi warna tema gelap/terang |
| **Storage Engine**| Cloudflare R2 (Simulasi path relatif di DB) | Single-storage metadata |
| **Notifikasi** | Sonner | Rich toast notification di pojok atas |
| **Ikon** | Lucide React | Ikon UI modern & seragam |

---

## 2. Implementasi Basis Data (Schema & Relasi)

Struktur data mengacu penuh pada Blueprint v0.3:
1. **Area 2-Layer:**
   - Layer 1: 10 Kecamatan administratif Jakarta Selatan (`Area`).
   - Layer 2: Kawasan populer komersial/branding (`Kawasan`), e.g., Senopati, Dharmawangsa, Kemang, Pondok Indah.
2. **Entitas Properti & Listing:**
   - Properti fisik (`Property`) dipisahkan dari unit penawaran komersial (`Listing`).
   - Relasi junction `PropertyOwner` (mendukung kepemilikan ganda).
   - Relasi junction `ListingIntermediary` (mendukung rantai perantara berjenjang dengan pembagian komisi internal).
3. **Audit Trail & Riwayat:**
   - `ListingStatusHistory`: Mencatat transisi dari 10 status listing, waktu, dan alasan.
   - `PriceHistory`: Mencatat setiap perubahan harga penawaran listing beserta kalkulasi kenaikan/penurunan harga.
4. **CRM Terpisah:**
   - `Customer`: Calon pembeli unik, dengan **nomor telepon/WA sebagai kunci deduplikasi utama**.
   - `Lead`: Tiket inquiry yang menghubungkan Customer ↔ Listing tertentu dengan status Kanban Stage.
   - `LeadActivity`: Log aktivitas (telepon, chat, survei, negosiasi, perubahan stage).

---

## 3. Daftar Fitur & Modul yang Sudah Selesai

### 3.1 Modul Owner (Pemilik Properti)
- **Halaman:** `/admin/owners`
- **Fitur:**
  - Menampilkan daftar owner properti dengan nomor telepon, email, NIK, alamat, dan properti yang dimiliki.
  - **Tambah Owner Baru:** Modal input dengan validasi nama & nomor kontak.
  - **Edit Owner:** Modal formulir pre-filled untuk memperbarui kontak dan catatan internal.
  - **Hapus Owner Aman:** Validasi backend menolak penghapusan jika owner masih terikat sebagai pemilik properti aktif.
  - **API:** `GET, POST /api/owners` & `GET, PUT, DELETE /api/owners/[id]`.

### 3.2 Modul Perantara (Broker / Agen)
- **Halaman:** `/admin/intermediaries`
- **Fitur:**
  - Menampilkan kartu broker/perantara dengan level kepercayaan (*Trust Level*):
    - `NEW`: Broker Baru
    - `VERIFIED`: Kontak Terverifikasi
    - `TRUSTED`: Terpercaya / Mitra Langganan
    - `BLACKLISTED`: Masuk Daftar Hitam (ditandai merah)
  - **Direct WhatsApp Chat:** Tombol chat WA sekali klik ke nomor perantara.
  - **Catatan Spesialisasi:** Informasi area fokus (misal: spesialis Menteng/Kemang) dan komisi standar.
  - **CRUD Lengkap:** Tambah, Edit status/trust level, dan Hapus aman (terproteksi jika sedang membawa listing aktif).
  - **API:** `GET, POST /api/intermediaries` & `GET, PUT, DELETE /api/intermediaries/[id]`.

### 3.3 Modul Listing & Workflow Status
- **Halaman:** `/admin/listings` & `/admin/listings/[id]`
- **Fitur:**
  - **Transisi 10 Status Blueprint (Section 8):**
    `DRAFT` → `PENDING_VERIFICATION` → `READY_TO_PUBLISH` → `ACTIVE` → `IN_NEGOTIATION` → `SOLD` / `SUSPENDED` / `WITHDRAWN` / `EXPIRED` / `ARCHIVED`.
  - **Riwayat Perubahan Harga:** Setiap update harga penawaran otomatis mencatat entri baru di `PriceHistory` lengkap dengan persentase perubahan (+/- %).
  - **Timeline Status:** Menampilkan riwayat kronologis siapa yang mengubah status dan alasannya.
  - **Toggle Privasi:** Pengaturan `priceOnRequest` (sembunyikan harga) dan `hideAddress` (hanya tampilkan area/kawasan ke publik).
  - **Rantai Perantara:** Menampilkan broker yang membawa listing dan catatan pembagian komisi internal.
  - **API:** `GET /api/listings` & `GET, PUT /api/listings/[id]`.

### 3.4 Modul Properti & Edit / Safe Delete
- **Halaman:** `/admin/properties`, `/admin/properties/[id]`, `/admin/properties/[id]/edit`
- **Fitur:**
  - Detail komprehensif: Spesifikasi fisik (LT, LB, KT, KM, Garasi, Lantai, Daya Listrik), legalitas sertifikat (`SHM`, `SHGB`, `AJB`, dll), orientasi arah, fasilitas, galeri foto, dan histori listing.
  - **Halaman Edit Properti Lengkap:** 
    - Pembaruan spesifikasi fisik, alamat, kawasan, dan catatan internal.
    - **Manajemen Foto Terintegrasi:** Menampilkan galeri foto yang sudah ada dengan tombol *Set Foto Utama* dan *Hapus Foto* instan, serta dropzone untuk menambah foto/video baru.
  - **Hapus Properti Terproteksi:** Modal dialog khusus yang mewajibkan admin mengetikkan kode properti (contoh: `JS-0001`) untuk mencegah ketidaksengajaan. Menghapus properti akan membersihkan relasi terkait secara cascade via Prisma Transaction.
  - **API:** `GET, POST /api/properties`, `GET, PUT, DELETE /api/properties/[id]`, serta `POST, PATCH, DELETE /api/properties/[id]/media`.

### 3.5 Modul Kawasan Populer
- **Halaman:** `/admin/kawasan`
- **Fitur:**
  - Mengelola area komersial populer di Jakarta Selatan (e.g. Senopati, Senayan, Kebayoran Baru).
  - **Toggle Bintang Homepage Banner:** Menentukan kawasan mana yang muncul di slider/banner beranda publik.
  - Counter jumlah properti aktif per kawasan secara real-time.
  - **API:** `GET, POST /api/kawasan` & `GET, PUT, DELETE /api/kawasan/[id]`.

### 3.6 Modul Customer (Calon Pembeli CRM)
- **Halaman:** `/admin/customers`
- **Fitur:**
  - **Tambah Customer:** Input calon pembeli baru (Nama, Nomor WA, Email, dan Catatan Kebutuhan/Budget).
  - **Deduplikasi Otomatis:** Nomor HP/WA divalidasi unik sebagai ID CRM utama.
  - **Edit Customer:** Mengubah preferensi pencarian, nomor kontak, atau email.
  - **Hapus Aman:** Penolakan penghapusan jika customer masih memiliki tiket inquiry aktif.
  - **Daftar Listing Ditanyakan:** Setiap kartu customer merangkum listing properti apa saja yang sedang mereka minati beserta badge stage lead saat ini.
  - **API:** `GET, POST /api/customers` & `GET, PUT, DELETE /api/customers/[id]`.

### 3.7 Modul Leads (CRM Kanban Board)
- **Halaman:** `/admin/leads`
- **Fitur:**
  - **6 Kolom Pipeline Stage:**
    1. `Baru` (New Inquiry)
    2. `Kualifikasi` (Qualified / Validated Budget)
    3. `Survei` (Viewing Scheduled)
    4. `Negosiasi` (In Negotiation)
    5. `Closing (Menang)` (Won)
    6. `Closing (Hilang)` (Lost)
  - **Drag & Drop Penuh (Native HTML5):**
    - Kartu lead memiliki grip handler (`GripVertical`) dan kursor `grab`/`grabbing`.
    - Indikator drop zone dengan highlight outline putus-putus (*dashed border*) beraksen orange.
    - **Optimistic UI:** Kartu berpindah seketika tanpa jeda; jika API gagal, kartu otomatis rollback ke posisi semula.
    - Auto logging aktivitas ke database `LeadActivity` (*"Drag & drop ke stage [Stage]"*).
  - **Aksesibilitas Sentuh (Touch / Mobile):** Dropdown pilihan cepat `Pindah: →` tetap tersedia di footer kartu untuk perangkat sentuh atau admin yang ingin menuliskan catatan khusus saat berpindah stage.
  - **Filter Listing:** Dropdown filter untuk menyaring board per listing tertentu.
  - **Modal Detail & Timeline:** Riwayat lengkap pesan awal lead dan log kronologis aktivitas.

### 3.8 Fitur Bulk / Batch Import Properti (CSV)
- **Halaman:** `/admin/properties/import`
- **Komponen Pendukung:**
  - Utility Parser: `src/lib/csv-parser.ts`
  - Client View: `ImportPropertyClient.tsx`
  - Backend Endpoint: `POST /api/properties/import`
- **Fitur:**
  - **Parser Robust:** Menangani koma (`,`), titik koma (`;`), dan kolom bernilai teks dengan tanda kutip ganda.
  - **Template CSV Instan:** Tombol unduh file `template_import_properti_jaksel.csv` yang sudah terisi contoh format 10 kecamatan resmi.
  - **Validasi Baris Pra-Import:** Tabel pratinjau interaktif memvalidasi kelengkapan alamat, tipe properti, harga penawaran, dan nama pemilik sebelum data masuk ke database.
  - **Pencocokan Otomatis:**
    - Nama kecamatan dicocokkan ke entitas `Area`.
    - Nama kawasan populer dicocokkan otomatis ke entitas `Kawasan`.
    - Penomoran kode otomatis berurutan `JS-xxxx` jika kolom kode kosong.
    - Deduplikasi otomatis pemilik properti berdasarkan nomor telepon.
    - Pembuatan listing otomatis dengan status awal (Draft / Aktif).
  - **Ringkasan Hasil Eksekusi:** Menampilkan kartu statistik baris berhasil vs gagal, tabel properti yang berhasil dibuat dengan link langsung, serta keterangan baris mana yang gagal beserta alasannya.

### 3.9 Fitur AI Smart Import WhatsApp & Deduplikasi Real-Time
- **Halaman:** `/admin/properties/smart-import`
- **Komponen Pendukung:**
  - AI & Heuristic Parser Engine: `src/lib/ai/gemini-parser.ts`
  - Area Code & Sequence Generator: `src/lib/area-codes.ts`
  - Physical Fingerprint Deduplication: `src/lib/duplicate-checker.ts`
  - Backend Endpoint: `POST /api/properties/ai-parse`
  - Client UI: `SmartImportClient.tsx`
- **Fitur:**
  - **Dua Engine Ekstraksi Teks (Hybrid):**
    - Didukung **Google Gemini Flash LLM** dengan structured JSON schema untuk membedah pesan WhatsApp berantakan, singkatan pasar (*KT/KM*, *ROW*, *SHM*, *BU*, *full marmer*), dan konversi nilai rupiah miliaran secara akurat.
    - Dilengkapi **Local Heuristic Fallback Parser** berbasis regex spesifik pasar properti Indonesia yang bekerja tanpa API key.
  - **Format Kode Properti Berbasis Area (`JS-[KEC]-[NOMOR]`):**
    - Menggantikan kode umum menjadi kode berawalan 10 singkatan kecamatan Jakarta Selatan: `CLD` (Cilandak), `KBB` (Kebayoran Baru), `KBL` (Kebayoran Lama), `MPP` (Mampang Prapatan), `PSM` (Pasar Minggu), `STB` (Setiabudi), `TBT` (Tebet), `PCR` (Pancoran), `PSG` (Pesanggrahan), `JGK` (Jagakarsa).
    - Contoh: Unit Cipete Selatan otomatis diberi kode `JS-CLD-0004`.
  - **Sistem Deduplikasi Real-Time (Physical Fingerprint):**
    - Mendeteksi potensi duplikat secara instan berdasarkan kesamaan `Area/Kecamatan`, `Luas Tanah (±10 m²)`, dan `Luas Bangunan`.
    - Menampilkan *Warning Banner* interaktif dengan skor kemiripan (hingga 95%) dan alasan pencocokan.
    - Menyediakan tombol pintas untuk membuka unit terdaftar guna menambahkan perantara baru atau memperbarui harga.
  - **Multi-Photo Dropzone (Media WhatsApp):**
    - Drag & drop foto-foto properti langsung dari WhatsApp Web atau galeri laptop.
    - Preview thumbnail dengan indikator *FOTO UTAMA* dan tombol hapus individual.
    - Auto-upload foto terintegrasi saat tombol simpan properti ditekan.
  - **Dukungan Video Tour & Walkthrough Media:**
    - Penambahan kolom `videoUrl` dan `videoPlatform` di model `Listing` (mendukung YouTube, Instagram Reels, TikTok).
    - Penambahan kolom `externalUrl` dan `duration` di model `PropertyMedia`.
    - Dropzone media mendukung format foto (`JPG/PNG/WebP`) dan video (`MP4`).
    - Deteksi otomatis link video tour dari teks pesan broadcast WhatsApp oleh AI parser.
  - **Strategi Watermark & Branding Elegan:**
    - Menghindari watermark tebal/merusak di tengah foto sesuai standar portal luxury (Sotheby's/William Raveis).
    - Menerapkan pendekatan *Subtle Branding* (overlay logo elegan di portal web & proteksi privasi alamat).
  - **Aksesibilitas UI:**
    - Tombol `[✨ Smart Paste WA]` di header `/admin/properties`.
    - Tab navigasi di halaman `/admin/properties/import`.
    - Callout banner di atas formulir manual `/admin/properties/new`.

---

## 4. Perbaikan Bug & Solusi Arsitektur UI

### 4.1 Solusi Modal Terpotong (Height Clipping Fix)
- **Masalah Sebelumnya:** Pada layar laptop dengan tinggi terbatas (< 800px), bagian atas modal terpotong ke luar layar dan judul modal tidak bisa terlihat atau di-scroll.
- **Akar Masalah:** Class pembungkus animasi `.animate-fade-in` menggunakan properti `transform: translateY(...)`. Secara spesifikasi CSS, `transform` pada parent element menciptakan *containing block* baru yang membatasi posisi `position: fixed` pada modal.
- **Solusi Arsitektur 3 Bagian:**
  - Memperbaiki animasi `.animate-fade-in` agar hanya menganimasikan `opacity` tanpa `transform`.
  - Membuat layout modal terstandarisasi di `admin.css`:
    - `.admin-modal-overlay`: Menggunakan `overflow-y: auto`, padding viewport `24px 16px`, dan media query `max-height: 720px` beralih ke `align-items: flex-start`.
    - `.admin-modal-container`: Membatasi `max-height: calc(100vh - 48px)` dengan `margin: auto 0`.
    - `.admin-modal-header`: `flex-shrink: 0` (sticky di atas).
    - `.admin-modal-body`: `flex: 1; overflow-y: auto` (konten formulir ber-scroll mulus).
    - `.admin-modal-footer`: `flex-shrink: 0` (sticky di bawah).

### 4.2 Responsivitas Layar & Bottom Navigation
- **Breakpoint Bottom Nav:** Ditingkatkan dari `max-width: 640px` ke `max-width: 1024px` dengan `z-index: 80` agar navigasi bawah selalu aktif di smartphone layar lebar dan tablet (di mana sidebar desktop beralih menjadi drawer).
- **Tombol "Menu" Cepat:** Bar navigasi bawah dilengkapi 5 tombol jempol:
  1. `Dashboard`
  2. `Properti`
  3. `Listing`
  4. `Leads`
  5. `Menu` (membuka laci sidebar lengkap untuk mengakses Owner, Perantara, Customer, Kawasan, Kecamatan).
- **Kanban Horizontal Flex:** Kolom stage diubah dari wrapping grid ke kontainer horizontal flex dengan `-webkit-overflow-scrolling: touch` sehingga dapat di-swipe mulus tanpa merusak urutan pipeline.

### 4.3 Sinkronisasi Tema Gelap/Terang & PWA Cache Purge
- **Penyebab Tidak Berfungsinya Toggle di HP:**
  - Browser HP menyimpan file cache service worker lama (`jaksel-admin-v1`) dari instalasi PWA sebelumnya. Pada mode development, file HTML yang di-cache mencari hash chunk Next.js lama yang sudah tidak ada di dev server, memicu hydration error pada React di HP.
  - Komponen `ThemeToggle` sebelumnya me-render tombol `disabled` sebelum hydration selesai.
- **Solusi yang Diterapkan:**
  - File `public/sw.js` diperbarui dengan skrip **Auto-Purge & Self-Destruct**: saat HP terhubung, Service Worker langsung menghapus seluruh cache lama, meng-unregister worker, dan memuat kode segar dari server.
  - `PWARegister.tsx` dan `layout.tsx` secara proaktif menghapus cache di mode development.
  - `ThemeToggle.tsx` kini langsung aktif (*interactive on first render*), menerapkan tema ke elemen `<html>` dan `<body>`, serta menyinkronkan event perubahan tema ke seluruh tombol di halaman.

---

### 4.4 Retheme UI Admin — "Modern SaaS Refined" (Theme C)

**Tanggal:** 14 September 2026  
**Status:** ✅ Selesai (build & tampilan terverifikasi)

Perubahan arah desain admin panel dari workspace biru + input underline
menjadi **Theme C: Modern SaaS Refined** dengan **input style FILLED**.
Keputusan diambil lewat preview visual 4 arah desain + 5 style input
(`public/theme-preview.html` & `public/theme-preview-forms.html`).

**Yang berubah** (semua di layer token `src/components/admin-ui/admin-ui.css`,
tanpa menyentuh komponen per-module):
- Palet: primary `#255f8f` (biru) → `#d97706` (amber); light default
  bg `#fafafa`, surface putih, border `#eaecf0`/`#d0d5dd`, text `#101828`.
- Dark mode: refined `#0b0e14`/`#141821` + amber terang `#e8a849`.
- **Input underline → FILLED**: idle bg `#f2f4f7` border transparan,
  radius 8px; focus → surface + border amber + ring; error → border
  danger + bg merah lembut; disabled → border dashed.
- **Tombol primary: tinta gelap** `#101828` (bukan amber) — amber hanya
  aksen (nav aktif, focus ring, badge, link).
- Radius: kartu/modal 12px, input/tombol/pill 8px.
- Search bar modul users/brokers ikut dikonversi ke filled.
- Token baru: `--workspace-input-bg`, `--workspace-radius-card`,
  `--workspace-ring`, `--workspace-btn*`.

**Mengapa aman:** semua modul (properties, listings, owners, customers,
leads, auctions, brokers, users, kawasan, areas, import, smart-import)
memakai primitif bersama `.admin-input` / `.ui-field__control` /
`.admin-btn-*` — perubahan token otomatis tersambung ke semua halaman.

**Dokumentasi pattern:** `AGENTS.md` → section "UI Design System Admin —
Modern SaaS Refined (Theme C)".

## 4.x [28 Oktober 2026] Transisi shadcn/ui + beres-beres pasca audit

- Migrasi admin ke primitif shadcn/ui (`@base-ui/react`): `src/components/ui/*`,
  codemod `scripts/migrate-admin-shadcn.cjs` untuk seluruh halaman `(admin)/admin/**`.
- Perbaikan pasca audit (sesi 28 Okt):
  1. Hapus 11 import rusak `from "undefined"` (sisa bug codemod).
  2. `ui/button.tsx`: `nativeButton={false}` saat Button dirender sebagai `<Link>`
     (menghapus error Base UI "expected a native <button>").
  3. `listings/page.tsx`: hoist `buildListingUrl` & `ListingSortButton` ke module
     scope (7× "Cannot create components during render").
  4. `AuctionForm.tsx` + `FavoritesGrid.tsx`: setState dalam effect dimundurkan ke
     microtask / diturunkan ke derived value (aturan `set-state-in-effect`).
  5. `PortalFooterNews.tsx`: `<a href="/#">` → `next/link`.
  6. Bersih-bersih import tak terpakai (lucide/react/prisma, 10+ file).
  7. `eslint.config.mjs`: ignore `.kilo/**`, `mockups/**`, `public/sw.js`, `scripts/**`
     (hasil lint: 23 error/110 warning → **0 error/7 warning**; sisa = migrasi `<img>`
     ke `next/image`, dievaluasi terpisah).
  8. Perbaikan encoding UTF-8 file admin yang rusak (mojibake `â€¢` → `•`).
- Migrasi domain email dev `@jakselproperti.com` → `@jualrumahproperty.com`
  (seed, DB `users`, `docs/dev-accounts.md`, `AGENTS.md`, header schema/PROGRESS).
  Nama database MySQL `jakselproperti` sengaja TIDAK diubah (risiko migrasi DB).
- Audit transaksi lalu hapus akun dev `sarah@` & `member@` (0 transaksi di semua
  tabel; hanya 1 baris `broker_profiles` masing-masing). Blok seed-nya dihapus.
  Sisa users: admin, support, + 1 akun pribadi.
- Beres-beres file (~763 MB dibebaskan):
  - Hapus (regenerable): `web/.npm-cache/` (734 MB), `web/.kilo/` (26 MB),
    `dev-server.log`/`dev-server.pid`, `tsconfig.tsbuildinfo`.
  - Arsipkan ke `docs/archive/` (ada README penanda): `mockups/`, `scratch/`,
    `screenshots/`, `check-css.mjs` + `find-colors.mjs` + `find-theme.mjs`
    (via `git mv`). Semua `.md` arsip selamat, termasuk `mockups/KONSEP-D.md`.
  - `tsconfig.json`: exclude `docs/archive` (skrip debug lama tak boleh ter-type-check);
    `eslint.config.mjs`: ignore `docs/archive/**`, lepas `.kilo/**` (folder sudah dihapus);
    `.gitignore`: tambah `/dev-server.log`, `/dev-server.pid`, `/mockups/`, `/screenshots/`.
- Audit fungsional menyeluruh: 26 route admin, 16 endpoint API, round-trip
  CRUD kawasan, 10 halaman kompleks (0 error console), alur publik — semua hijau.
- `/agents` resmi di-HIDE via flag `NEXT_PUBLIC_AGENTS_ENABLED` (default mati):
  rencana publish agent di tiap halaman properti listing **dibatalkan** — tidak
  pernah terealisasi di kode (strip kontak di detail properti hanyalah "Advisor
  Assistance" generik, bukan broker). Route + data broker tetap utuh; link
  footer "Mode Agen" ikut hilang saat flag mati.
- Tahap 1 migrasi shadcn (unifikasi Toaster): satu `<Toaster>` global di
  `admin/layout.tsx` (position top-right, styling token admin
  `--color-admin-surface/border/text` sehingga ikut tema gelap/terang);
  11 mount `<Toaster>` per-halaman dihapus (9× top-right richColors,
  3× top-center token). Wrapper `ui/sonner.tsx` (next-themes) sengaja belum
  dipakai — tema admin pakai sistem `data-theme` sendiri, bukan next-themes.
- Tahap 2 migrasi shadcn (pilot `KawasanList`): modal `.admin-modal-*` →
  `Dialog` (DialogContent/Header/Title/Footer, controlled `open`/`onOpenChange`),
  5× `.admin-label` → `Label` (dengan `htmlFor`/`id` aksesibilitas). Terverifikasi
  visual light + dark (token `data-theme`), tutup via X/ESC/overlay bekerja.
  Sekalian fix bug codemod: class `admin-card-grid` yang terpotong jadi `"-grid"`
  (layout grid kartu kawasan hilang) dipulihkan, dan artefak `className={"  ..."}`
  dibersihkan. Modul lain menyusul setelah review user.
- Tahap 2 lanjutan (disetujui user, review menyusul): pola pilot diterapkan ke
  `OwnerList`, `IntermediaryList`, `CustomerList` — modal → `Dialog`, label →
  `Label` (+`htmlFor`/`id`). CustomerList punya 2 dialog (form + konfirmasi hapus;
  tombol hapus guard `leads.length` tetap). Semua artefak codemod dibersihkan +
  grid `admin-card-grid` dipulihkan di 3 file. Verifikasi: dialog terbuka di
  3 halaman (0 error console), tsc/lint/test hijau.
- Tahap 2 lanjutan #2: `AuctionList` + `AuctionForm` ternyata tanpa modal —
  cukup bersih-bersih artefak; `KanbanBoard` 2 modal → `Dialog` (pindah stage
  dengan form catatan; detail & timeline dengan `DialogDescription`), uji
  visual modal detail lead OK. Select native `.admin-input` (kategori/status/
  wilayah) sengaja BELUM dimigrasi ke `Select` shadcn — dampak visual besar,
  jadi keputusan terpisah.
- Bersih-bersih global artefak codemod `className={" X"}` → `className="X"`
  (206 class di 14 file, mekanis murni). Verifikasi: tsc/lint/test hijau.
- Tahap 2 finalisasi: `ListingDetailClient` 3 modal → `Dialog` (status/harga/
  detail; lebar asli dipertahankan via `sm:max-w-[480px]`/`[540px]`), 8 label
  → `Label` (+htmlFor/id), 2 checkbox card native dibiarkan. Codemod label
  45× ternyata LUPA menambahkan import `UiLabel` di `PropertyForm` +
  `SmartImportClient` (tsc merah) — diperbaiki; 3 label header section
  (Owner/Perantara/Fasilitas Terdeteksi) dikonversi manual dengan style asli.
  Scan `-LiteralPath` menemukan 2 file terlewat di folder `properties\[id]\`:
  `EditPropertyClient` (15 label) + `PropertyDetailActions` (1 modal hapus
  dengan guard ketik kode — diuji buka/tutup, TIDAK di-delete). Hasil akhir:
  **0 `admin-modal` / 0 `admin-label` tersisa di seluruh `(admin)`**.
  Catatan verifikasi: dialog tertutup sempat terlihat "macet" di test karena
  animasi exit CSS di-pause saat tab browser background — bukan bug; state
  `data-open` terlepas dengan benar. tsc/lint (0 error, 7 warning `<img>`
  backlog)/test 116 hijau, 0 error console.
- **Revisi palet admin → shadcn generik (neutral)** (permintaan user: palet
  krem+merah brand dianggap kurang menarik). Nilai token `--workspace-*`
  light+dark di `admin-ui.css` diganti skala neutral Tailwind (light: bg
  `#f5f5f5`, teks `#171717`, tombol near-black; dark: bg `#0a0a0a`, surface
  `#171717`, tombol terang `#e5e5e5` teks gelap — konvensi shadcn). Primitif
  shadcn di-scope `body:has(.admin-layout)` supaya Dialog/Toaster yang
  ter-mount di `document.body` ikut neutral (scope `.admin-layout` saja tidak
  menjangkau portal). Shadow hangat dinetralkan; warna status badge
  (draft/active/sold dll) dipertahankan karena semantik. Portal publik tidak
  tersentuh (terverifikasi: bg putih + merah brand tetap). AGENTS.md bagian
  palet diperbarui. Verifikasi probe: light+dark semua surface benar; catat
  bahwa probe CSS di tab background bisa menipu karena transisi di-freeze.
- **Bug tombol hitam-di-atas-hitam diperbaiki**: reset `a { color: inherit }`
  unlayered di `globals.css` menimpa utility Tailwind ber-`@layer` (rule
  unlayered selalu menang atas layered), sehingga semua `ButtonLink` (render
  `<a>`, mis. "Buat Listing Baru") kehilangan `text-primary-foreground` —
  teks `#171717` di atas bg `#171717`. Fix: di-scope
  `body:not(:has(.admin-layout)) a` mengikuti pola rule portal tetangganya.
  Terverifikasi light+dark; portal publik tidak berubah.
- **Palet admin Opsi A — netral murni** (keputusan user via mockup
  `docs/previews/admin-palette-mockup.html`): badge status 8-hue diganti
  badge netral (bg `surface-soft`, teks `text-muted`) + dot status 6px
  (`::before` memakai token `--color-status-*` yang sama dengan Kanban).
  Selector `[class].admin-badge-*` (0,2,0) menimpa rule light-scoped
  admin.css dan berlaku untuk UiBadge shadcn tanpa base class. Warna
  semantik dark dikalemkan ke Tailwind-400 (danger `#f87171`, success
  `#4ade80`, warning `#fbbf24`). Test 116 hijau, 0 error console.
- **Sebar komposisi Card docs — modul Owner, Perantara, Customer** (pola pilot
  KawasanList disetujui): kartu list diganti komposisi resmi
  CardHeader/CardTitle/CardDescription/CardAction/CardContent(/CardFooter) —
  className legacy `gap-0 border ... shadow-sm p-4 sm:p-[18px]` dihapus,
  empty state dibungkus CardContent. Owner: aksi pindah ke CardAction, blok
  "Properti Terdaftar" masuk CardContent. Perantara: badge trust ke
  CardAction, aksi Edit/Hapus ke CardFooter `justify-end`. Customer: toolbar
  search jadi kartu standar `mb-5 px-(--card-spacing)`, aksi WA/Edit/Hapus ke
  CardAction, timeline inquiry masuk CardContent. AuctionList sengaja
  ditunda — kartunya `<Link>` dengan cover image + CSS kustom
  (auctions.css), butuh pendekatan stretched-link dan review visual
  terpisah. tsc 0 error, test 116 hijau.
- **Bahasa desain admin = Cloudflare dashboard — Fase 1 (lapisan token)**
  (keputusan user via mockup `docs/previews/admin-cloudflare-mockup.html`,
  opsi "Tabel semua"; men-supersede palet shadcn neutral + badge Opsi A):
  token light diganti bg putih menyeluruh `#ffffff`, primary/tombol biru
  `#0051c3` (hover `#0044a3`), hairline border `#e4e4e7`/`#d9d9de`,
  radius 6px seragam (card 8px), danger `#b42318` · success `#197a3d` ·
  warning `#b45309`; dark bg `#0f0f12` · surface `#17171b` · primary/link
  `#7cb3f5` · tombol `#1c64d9`. Override shadcn `body:has(.admin-layout)`
  ikut biru + radius eksplisit per level (`--radius-sm/md/lg/xl` — turunan
  `:root` globals.css sudah ter-resolve). Nav aktif → pill abu
  `#f1f1f2`/`#26262b` tanpa garis inset. Badge → CF soft pills (soft bg +
  teks warna, 12px/600, tanpa dot/uppercase) light+dark per status.
  Judul halaman 26px/800 + deskripsi 13.5px max-w 760px (rule lama
  `25px !important` di line 252 admin-ui.css di-reconcile — duplikat
  dihapus). Terverifikasi probe: layoutBg, tombol primary, nav pill, h1,
  badge pill (`#e7f5e9`/`#197a3d`), dark bg + tombol; portal publik aman
  (merah brand utuh); 0 error console. AGENTS.md bagian UI ditulis ulang
  ke "Cloudflare-inspired". Fase 2 (pilot tabel KawasanList) menyusul.
- **Bahasa desain admin = Cloudflare — Fase 2+3 (konversi "tabel semua")**
  (3 November 2026): komponen reusable `DataTable` dibuat di
  `src/components/admin-ui/DataTable.tsx` (client, generic `DtColumn<T>`):
  toolbar search (internal uncontrolled atau terkontrol via
  `searchValue/onSearchChange` + `searchPredicate`), slot `filters`
  (pills/select milik modul), `toolbarEnd`, sort klik th
  (asc→desc→none, `aria-sort`), pagination footer "Menampilkan x–y dari
  z" + per-page select + pager «‹ 1 2 3 ›», empty state
  (`emptyTitle/Text/Action`). CSS blok `.admin-dt-*` + `.admin-notice`
  (banner kuning CF, varian dark rgba amber) di-append ke akhir
  `admin-ui.css`. Konversi selesai: KawasanList (pilot; toggle Featured
  pindah ke sel Nama), OwnerList, IntermediaryList (filter pills trust →
  slot `filters`), CustomerList (inquiry = chip kode + badge stage,
  caps 2 + "+n inquiry lainnya"), AuctionList (rewrite penuh: thumbnail
  52×38 + link judul, filter kategori/status select, badge status via
  map; `auctions.css` tetap di-import untuk `.auction-notice`), dan
  halaman Properties (server component — tabel server-rendered memakai
  class `.admin-dt-*` yang sama; pagination & filter GET tetap
  server-side, link pagination kini mempertahankan param
  search/type/area). Listings & UserDirectory sudah berbentuk
  tabel/CSS-grid → ikut token CF otomatis, tidak dikonversi. Kolom aksi
  = tombol ghost Edit/Hapus; warna hapus `--workspace-danger` bila
  bebas relasi, muted bila terikat data. Verifikasi: tsc 0 error,
  lint 0 error, `npm test` 116 hijau, probe browser 6 halaman
  (kawasan/owners/intermediaries/customers/auctions/properties) —
  tabel, search, sort, pagination, filter GET (`?search=317406` →
  1 baris), h1 26px/800, dark mode token benar; 0 error console.
- **Arsitektur UX admin = Cloudflare — Fase 4 (navigasi & header detail)**
  (5 November 2026): tiga pola UX CF diadopsi (pilihan user; Ctrl+K
  command palette sengaja TIDAK dipilih, masuk backlog).
  1. **Breadcrumb otomatis** — komponen server-safe `Breadcrumb.tsx`
     (`Crumb[]`, `aria-label="Breadcrumb"`, segmen terakhir
     `aria-current="page"`) + `AdminShell` kini merender trail otomatis
     dari `pathname` (dictionary `CRUMB_LABELS` per segmen URL; dashboard
     tanpa crumb; halaman detail dengan segmen UUID disembunyikan
     otomatis karena dirender sendiri oleh halamannya). Contoh:
     "Admin / Properti / Import CSV", "Admin / Pengaturan / Konfigurasi
     Akses".
  2. **Sidebar collapsible + filter** — kotak "Filter menu…" di atas nav
     (shortcut keyboard `/`, label kbd ala CF docs); menyaring item
     lintas section, section kosong disembunyikan, semua section
     diperlakukan terbuka saat memfilter. Judul section jadi tombol
     collapse (ChevronDown, `aria-expanded`), state persist di
     localStorage `admin-nav-collapsed`. Rule `react-hooks/
     set-state-in-effect` di-exception dengan eslint-disable
     berjustifikasi (lazy initializer menimbulkan hydration mismatch).
  3. **Header detail standar** — komponen server-safe
     `DetailHeader.tsx` (crumbs + judul 26px + badge status + deskripsi +
     meta timestamps + aksi kanan; CSS `.admin-detail-title-row`/
     `.admin-detail-meta`). Diterapkan di: detail properti
     (`properties/[id]` — crumb 3 tingkat dengan kode properti), detail
     listing (`ListingDetailClient` — meta Dibuat/Diubah/Dipublikasikan,
     aksi Edit Detail/Ubah Harga), form lelang (`AuctionForm` — route
     non-UUID sengaja TANPA crumbs karena auto-crumb AdminShell sudah
     menyediakannya; belajar: duplikasi trail terdeteksi di probe), dan
     `RecordHeader` (dipakai UserWorksheet dll) menerima prop `crumbs`
     opsional yang menggantikan back-arrow. Verifikasi: tsc 0 error,
     lint 0 error (warning `<img>` pre-existing), `npm test` 116 hijau,
     probe browser: crumb list + bertingkat + 3 halaman detail, collapse
     persist, filter "cus" → hanya CRM/Customer, 0 error console.

## 5. Panduan Menjalankan & Pengujian

### Menjalankan Server Lokal:
```bash
# Masuk ke direktori web
cd d:/Project/jakselproperti.com/web

# Menjalankan server development (akses via localhost & LAN IP)
npm run dev
```

### Akses Alamat Panel:
- **Dari Komputer / Laptop:**
  `http://localhost:3000/admin`
- **Dari Handphone (Satu Jaringan WiFi):**
  `http://192.168.100.2:3000/admin`
  *(Disarankan menggunakan **Tab Samaran / Incognito** di browser HP untuk memastikan tidak menggunakan cache browser lama).*

### Verifikasi Kualitas Kode:
```bash
# Validasi Type Safety
npx tsc --noEmit

# Validasi Production Build
npm run build
```
*(Seluruh 16 rute admin dan API route terkompilasi 100% tanpa error).*

```bash
# Unit Tests
npm test
```
*(21 test untuk sistem penomoran publik — semua passed).*

---

## 3.9 Sistem Penomoran Publik (Property Number & Listing Number)

**Tanggal:** 14 September 2026  
**Status:** ✅ Selesai (21/21 unit tests passed)

### Konsep

Setiap property & listing mendapat **nomor publik unik** yang TERPISAH dari primary
key database (UUID). Nomor ini digunakan untuk identifikasi di UI publik dan bisa
divalidasi secara offline (tanpa query database) berkat Luhn check digit.

- **Property number** dimulai dari `100001` → contoh: `100001-7`
- **Listing number** dimulai dari `500001` → contoh: `500001-3`
- Format: `"{nomor_urut}-{check_digit}"`
- Dua counter **independen**, **tidak pernah reset**, dan **tidak saling terhubung**.

### Mekanisme Atomic Counter

Counter disimpan di tabel `sequence_counters` (model `SequenceCounter`):

| name | current_value |
|---|---|
| `property` | `100000` (seed awal, nomor pertama = 100001) |
| `listing` | `500000` (seed awal, nomor pertama = 500001) |

Increment menggunakan `UPDATE ... SET current_value = current_value + 1` dalam
Prisma `$transaction`. MySQL `UPDATE` mengakuisisi exclusive row lock secara
otomatis — aman untuk concurrent access dari banyak broker.

**BUKAN** `SELECT MAX(id)+1` yang rawan race condition.

### Luhn Check Digit

Algoritma:
1. Mulai dari digit paling kanan, gandakan (×2) setiap digit di posisi genap
2. Jika hasil ×2 > 9, kurangi 9
3. Jumlahkan semua digit
4. Check digit = `(10 - (total % 10)) % 10`

Contoh: `100001` → check digit `7` → nomor publik `100001-7`

### Files

| File | Deskripsi |
|---|---|
| `src/lib/sequence-number.ts` | Service utama (5 fungsi exported) |
| `src/lib/__tests__/sequence-number.test.ts` | 21 unit tests |
| `prisma/schema.prisma` | Model `SequenceCounter` + kolom baru |
| `prisma/seed.ts` | Seed counter awal |

### API yang Tersedia

```typescript
import {
  calculateLuhnCheckDigit,  // (numberString: string) => number
  formatPublicNumber,       // (sequenceValue: number) => string
  validateCheckDigit,       // (fullNumber: string) => boolean
  getNextPropertyNumber,    // (prisma) => Promise<string>  → "100001-7"
  getNextListingNumber,     // (prisma) => Promise<string>  → "500001-3"
} from "@/lib/sequence-number";
```

### Kolom Database Baru

| Tabel | Kolom | Tipe | Constraint |
|---|---|---|---|
| `properties` | `property_number` | `VARCHAR(20)` | UNIQUE, nullable |
| `listings` | `listing_number` | `VARCHAR(20)` | UNIQUE, nullable |

> **Catatan:** Kolom `code` di `Property` adalah kode internal berbasis
> kecamatan (awalnya format `JS-KMG-0001`; sejak 14 Sep 2026 diganti
> numerik murni `{kode Kemendagri}-{running}`, cth. `317407-0001` —
> lihat section 10). `property_number` adalah nomor publik nasional
> tanpa informasi wilayah.

### Relasi dengan Fitur Lain

- `getNextPropertyNumber()` dipanggil saat create property baru.
- `getNextListingNumber()` dipanggil saat create listing baru.
- `validateCheckDigit()` dipakai di kolom pencarian untuk deteksi salah ketik
  sebelum query ke database.
- Tidak ada kode wilayah/kota/area dalam nomor — informasi lokasi ditampilkan
  terpisah di UI (badge/label kawasan).

---

## 6. Modul Tim & Akses � Manajemen User & Role

**Tanggal:** 14 September 2026
**Status:** ? Selesai (tsc/eslint/build bersih, permission teruji per-role)

### Latar
Halaman `/admin/users` sebelumnya mock total (data & role rekaan,
tidak tersambung DB) dan routing auth menganggap semua user adalah
broker � menyebabkan SUPER_ADMIN terjebak di onboarding broker.

### Perubahan
- **Schema:** kolom `users.deletedAt` (soft delete � akun terhapus
  tetap tersimpan untuk audit, otomatis ditolak saat login).
- **Permission layer:** `src/lib/permissions.ts` (matriks +
  `isStaff`/`canManageUsers`/`canHardDelete` + label) dan
  `src/lib/api-auth.ts` (`requireStaff`/`requireSuperAdmin`).
- **API users:** `GET/POST /api/users` + `GET/PUT/DELETE
  /api/users/[id]` � CRUD nyata, proteksi akun sendiri, soft delete &
  restore, hard delete menolak user yang masih terikat data historis.
- **UI Tim & Akses:** direal-kan dari DB (mock dihapus). Directory:
  cari, filter role/status, ringkasan, tabel (role, status akun, profil
  broker, tanggal gabung). Worksheet: create/edit + ringkasan izin +
  nonaktif/aktifkan + hapus-logis/pulihkan + zona berbahaya.
- **Guard DELETE resource utama** (properties/owners/intermediaries/
  customers/kawasan): khusus SUPER_ADMIN.
- **Routing sadar-role:** proxy + layout mengarahkan staff ke `/admin`,
  broker ke `/onboarding`; menu Tim & Akses hanya tampil untuk
  SUPER_ADMIN.
- **Seed:** user demo SUPPORT (`support@jakselproperti.com` /
  `jaksel-support-2026`) untuk pengujian 2 tingkat staff.

### Hasil uji
| Skenario | Hasil |
|---|---|
| SUPER_ADMIN CRUD user | 200/201 ? |
| SUPPORT POST user / DELETE property | 403 ? |
| SUPPORT buka `/admin/users` | 307 ? `/admin` ? |
| Tanpa login ? API users | 401 ? |

---

## 7. Konfigurasi Akses Modul & Notifikasi

**Tanggal:** 14 September 2026
**Status:** ? Selesai (tsc/eslint/build bersih, permission teruji per-role)

### Latar
Menyiapkan pembukaan registrasi broker bebas: perlu kontrol modul mana
yang aktif per role, dan preferensi notifikasi per user. Sonner (toast)
dipisahkan dari sistem notifikasi (toast = UI feedback instal, bukan
modul).

### Perubahan
- **Schema:** tabel `role_module_access` (role x modul -> enabled,
  unique) + `notification_preferences` (userId x eventKey x channel,
  enum IN_APP/EMAIL/WHATSAPP).
- **lib/module-access.ts:** katalog 13 modul + default per role +
  `getAccessibleModules`/`canAccessModule`/`getModuleMatrix`.
  Fallback default bila baris DB belum ada.
- **lib/notifications.ts:** katalog 6 event (leads, status/harga
  listing, expiring, verifikasi, akun) dengan relevansi per role.
- **API module-access** (GET/PUT, SUPER_ADMIN) + guard anti-lockout
  (modul users tidak bisa dimatikan untuk SUPER_ADMIN).
- **API notification-preferences** (GET/PUT, user mengelola sendiri).
- **UI:** halaman `/admin/settings/module-access` (matriks toggle
  role x modul, optimistic update) dan `/admin/settings/notifications`
  (toggle per event x channel; EMAIL/WA ditandai segera).
- **Nav:** menu admin difilter sesuai modul aktif; section Pengaturan
  (Konfigurasi Akses khusus SUPER_ADMIN, Pengaturan Notifikasi).
- **Proxy:** halaman konfigurasi di-gate SUPER_ADMIN.
- **Seed:** matriks akses default.

### Hasil uji
| Skenario | Hasil |
|---|---|
| SUPER_ADMIN GET/PUT module-access | 200 |
| Matikan modul users utk SUPER_ADMIN | 400 (anti-lockout) |
| SUPPORT GET module-access | 403 |
| Prefs GET/PUT (admin & support) | 200 |
| Anonim GET prefs | 401 |
| SUPPORT buka halaman konfigurasi | 307 -> /admin |

---

## 8. Kepemilikan Listing (`listings.managedById`)

**Tanggal:** 14 September 2026
**Status:** ? Selesai (build bersih, uji API: managedById terisi otomatis)

### Latar
Sebelum registrasi broker bebas dibuka, data kepemilikan listing wajib
terpasang sejak hari pertama � retro-assign kepemilikan setelah ribuan
listing masuk adalah migrasi yang mahal dan rawan salah. Keputusan:
kolom dipasang sekarang, enforcement scope menyusul di Fase 2.

### Perubahan
- **Schema:** `listings.managedById` (nullable, FK ke `users`,
  index) + relasi `managedBy` / `User.managedListings`.
- **Diisi otomatis** dari user pembuat di semua jalur create listing:
  - `POST /api/listings` (listing untuk properti existing)
  - `POST /api/properties` (listing inline + status history kini
    memakai session user, bukan hardcode email admin)
  - `POST /api/properties/import` (bulk CSV, dalam transaksi per baris)
- **Seed:** 2 sample listing tercatat milik akun admin.

### Hasil uji
Listing dibuat via API oleh admin ? `managedById` terisi UUID user
admin (cocok dengan session). Listing uji dihapus setelah verifikasi.

---

## 9. Wilayah Administratif Nasional (Area 4-Level)

**Tanggal:** 14 September 2026
**Status:** ? Selesai (data terverifikasi 0 missing / 0 duplikat, uji API luar Jaksel sukses)

### Latar
Broker sudah beroperasi di luar Jabodetabek, tetapi pilihan area hanya
10 kecamatan Jaksel � form listing tidak bisa diselesaikan untuk
properti di kota lain.

### Perubahan
- **Schema:** `Area.level` menjadi hierarki 4 tingkat
  (1=provinsi, 2=kab/kota, 3=kecamatan, 4=kelurahan/desa) + kolom
  `officialCode` (kode Kemendagri, unique).
- **Data nasional:** dataset `prisma/data/wilayah.sql`
  (cahyadsn/wilayah, MIT, Kepmendagri 300.2.2-2430/2025). Importer
  `prisma/import-wilayah.ts` (`npm run db:import-wilayah`):
  91.162 baris, idempotent, ID/slug/kode prefix Jaksel dipertahankan.
- **Bug data diperbaiki selama import:** 5 kecamatan Jaksel yang
  bernama sama dengan kelurahan-nya sendiri (Pancoran, Jagakarsa,
  Mampang Prapatan, Pasar Minggu, Pesanggrahan) sempat tertimpa �
  dipulihkan + matcher importer diberi constraint level & scope induk.
- **Query:** semua pemakaian `level: 1` (kecamatan lama) ? `level: 3`
  (ai-parse, import CSV, areas/search, kawasan, form properti baru/edit,
  smart-import, halaman publik /jual).
- **Form properti:** autocomplete kecamatan NASIONAL dengan konteks
  `kecamatan, kab/kota, provinsi` � kecamatan kembar antar daerah
  tetap terdistinguish.
- **Import CSV:** kolom baru `kota` (opsional) untuk disambiguasi;
  kecamatan ambigu = error baris dengan saran kota.
- **Parser AI:** di-scope Jabodetabek (prompt tidak muat 7 ribu
  kecamatan); teks di luar cakupan ? areaId null, user pilih manual
  (fallback `areas[0]` dihapus).
- **Kode properti nasional:** kecamatan baru otomatis dapat prefix
  unik dari nama (contoh nyata: Tanah Sareal, Kota Bogor ? `JS-TACB-0001`).

### Hasil uji
- Verifikasi data: dataset 91.162 = db 91.162 (0 missing, 0 extra,
  0 tanpa officialCode); 10 kecamatan Jaksel utuh dengan kode lama.
- Search API `tanah sareal` ? `Tanah Sareal | Kota Bogor | TACB`.
- POST /api/properties dengan kecamatan Bogor ? `JS-TACB-0001`.
- ai-parse teks Bogor ? areaId cocok + suggestedCode `JS-TACB-0001`.

---

## 10. Kode Properti Numerik ({Kode Kemendagri}-{Running})

**Tanggal:** 14 September 2026
**Status:** ? Selesai (migrasi + uji API Jaksel & luar kota sukses)

### Keputusan
Format kode properti internal disepakati **numerik murni tanpa huruf**,
mengombinasikan kode wilayah resmi Kemendagri (kini tersedia di kolom
`areas.officialCode` setelah import nasional) dengan running number
per-kecamatan milik sistem.

`317407-0001` = Kebayoran Baru (31.74.07), properti pertama.
`327106-0001` = Tanah Sareal, Kota Bogor (32.71.06), properti pertama.

### Perubahan
- `src/lib/property-code.ts` ditulis ulang: prefix dari
  `areas.officialCode` (6 digit tanpa titik) + running 4 digit
  per-kecamatan via `sequence_counters` (name `prop:{prefix}`,
  atomic � patuh Traps #1, di-seed otomatis dari max existing).
- 3 jalur create dipakai format baru: POST /api/properties (manual),
  ai-parse (suggested code), import CSV (counter per-baris dalam
  transaksi). Kode manual dari CSV tetap dipakai bila belum dipakai.
- Migrasi data: 4 properti dummy `JS-*` dikonversi ke numerik
  (317403-0001, 317405-0001, 317407-0001, 317408-0001).
- 7.255 kode huruf artefak generator lama di kecamatan non-Jaksel
  di-null-kan; `Area.code` huruf Jaksel (CLD, KBB, dst) dipertahankan
  sebagai legacy.
- Kawasan TIDAK lagi memengaruhi kode properti � murni badge/label UI.

### Hasil uji
| Skenario | Kode |
|---|---|
| Properti baru di Mampang Prapatan (Jaksel) | `317403-0002` |
| Properti baru di Tanah Sareal (Kota Bogor) | `327106-0001` |
| ai-parse teks Kemang | suggested `317403-0003` |
| Nomor publik (tidak berubah) | `100003-3`, `100004-1` |

---

## 11. Module Area & Lokasi Nasional

**Tanggal:** 14 September 2026
**Status:** ? Selesai (tsc/lint/build bersih, uji halaman & API sukses)

### Latar
Setelah import wilayah nasional (section 9), modul admin Area & Lokasi
masih asumsi Jaksel: halaman Kecamatan hanya menampilkan 10 Jaksel,
dan form kawasan memakai native select dengan 7 ribu opsi kecamatan
nasional tanpa konteks kota (nama kecamatan kembar jadi ambigu).

### Perubahan
- **`/admin/areas` jadi browser nasional**: ringkasan statistik
  (38 provinsi / 514 kab-kota / 7.265 kecamatan / 83.345 kelurahan),
  drill-down bertingkat via breadcrumb (provinsi -> kab/kota ->
  kecamatan -> kelurahan), dan pencarian nama wilayah lintas level
  dengan konteks path + kode Kemendagri.
- **Form kawasan**: native select -> autocomplete yang bisa dicari,
  menampilkan `kecamatan, kab/kota, provinsi`; pilihan wajib eksplisit
  (tidak lagi default ke item pertama).
- **API kawasan**: POST/PUT memvalidasi `areaId` harus kecamatan
  (level 3) -- induk kota/kelurahan ditolak 400.

### Catatan teknis
- Halaman `/admin/properties/new` mengirim daftar kecamatan nasional
  ke client (~1,2 MB) untuk autocomplete -- berfungsi, tapi TODO:
  optimasi ke server-side search bila dirasa berat.
- Kawasan tetap data kurasi internal (tidak ada dari API pemerintah);
  bertambah per kota seiring ekspansi operasional.

## 12. Migrasi Area ID — UUID ke Integer Autoincrement

### Latar
Tabel `areas` memiliki 91.162 baris (terbesar di database). Dengan
UUID `@id @default(uuid())`, ukuran tabel + index mencapai 73 MB —
menghabiskan Mayoritas alokasi storage dev.

### Keputusan
- `Area.id` diubah dari UUID (`String`) ke **Int autoincrement**.
- `Area.parentId` diubah dari `String?` ke `Int?`.
- `Property.areaId` diubah dari `String` ke `Int`.
- `Kawasan.areaId` diubah dari `String` ke `Int`.
- Tabel `areas` adalah **satu-satunya** tabel yang pakai Int autoincrement
  sebagai PK — tabel lain tetap UUID.
- Level ke-4 (`@@index([level])`) ditambahkan ke schema.

### Perubahan

**Schema (`prisma/schema.prisma`):**
- `Area.id`: `Int @id @default(autoincrement())`
- `Area.parentId`: `Int?`
- `Kawasan.areaId`: `Int`
- `Property.areaId`: `Int`
- `Area`: tambah `@@index([level])`

**Importer (`prisma/import-wilayah.ts`):**
- Dihilangkan `randomUUID()` — id dibuat oleh database.
- Diproses per level berurutan (provinsi → kab/kota → kecamatan →
  kelurahan) supaya `parentId` selalu resolvable.
- Setelah insert tiap level, peta `officialCode → id` dimuat ulang.
- Baris seed Jaksel dipertahankan (id, slug, kode legacy tetap).

**API routes (koersi body.string → number):**
- `POST /api/properties` — `Number(body.areaId)` + validasi integer
- `PUT /api/properties/[id]` — `Number(body.areaId)` bila terisi
- `POST /api/kawasan` — `Number(body.areaId)` + validasi integer + cek level 3
- `PUT /api/kawasan/[id]` — `Number(body.areaId)` bila terisi
- `POST /api/properties/duplicate-check` — `Number(areaIdRaw)` bila terisi
- `GET /api/kawasan` — `Number(areaIdParam)` untuk filter query

**Halaman publik:**
- `/jual` — query param `area` dikonversi ke `Number` untuk filter

**Client components (interface `id: number`, form state tetap string):**
- `PropertyForm` — `AreaOption.id: number`, `KawasanOption.areaId: number`,
  `selectArea()` → `String(area.id)`
- `EditPropertyClient` — tipe serupa, state init `String(property.areaId)`,
  kawasan change → `String(selectedKawasan.areaId)`
- `SmartImportClient` — filter kawasan → `String(k.areaId) === areaId`
- `KawasanList` — `AreaOption.id: number`, `KawasanItem.areaId: number`,
  `selectArea()` → `String(a.id)`
- `ImportPropertyClient` — `AreaOption.id: number`

**AGENTS.md:**
- Primary key exception: Area pakai Int autoincrement (sisanya UUID).

### Hasil uji
- `tsc --noEmit` → 0 error
- `npm run lint` → 0 error baru (hanya warning pre-existing)
- `npm run build` → sukses, 0 error
- `prisma db push --force-reset` → sukses
- `npm run db:seed` → sukses (75 areas seed + 6 kawasan + users + properties)
- `npm run db:import-wilayah` → sukses (91.162 baris terimport, 10 kecamatan
  + 63 kelurahan Jaksel dari seed dipertahankan)
- **Ukuran tabel `areas`: 26.61 MB** (8.52 data + 18.09 index) — turun 64%
  dari 73 MB versi UUID

## 13. Workspace Broker, AreaPicker, dan Scope Data

### Alur broker
- Broker mendaftar/login lewat `/daftar-broker`, melengkapi profil di
  `/onboarding`, lalu menunggu verifikasi internal.
- SUPER_ADMIN mengubah status profil broker dari halaman Tim & Akses.
- Hanya broker berstatus `VERIFIED` yang dapat masuk workspace `/admin`.
- Broker hanya dapat membuka dashboard, properti, listing, leads miliknya,
  dan preferensi notifikasi. Modul staf tetap ditutup oleh proxy dan guard.

### Scope dan keamanan
- Route Handler properti/listing memakai `requireOperationalUser()`.
- Broker hanya membaca/mengubah listing dengan `managedById` miliknya dan
  properti yang memiliki listing tersebut.
- Broker hanya dapat mengirim `DRAFT → PENDING_VERIFICATION`; verifikasi dan
  publikasi selanjutnya dilakukan staff.
- `READY_TO_PUBLISH`/`ACTIVE` memerlukan owner, foto utama, judul,
  deskripsi, dan harga atau price-on-request.
- Homepage dan detail publik hanya menampilkan listing `ACTIVE`, kecuali
  mode preview eksplisit aktif.

### Wilayah administratif
- Halaman `/admin/areas` dan menu Kecamatan dihapus karena data Kemendagri
  adalah referensi statis, bukan konten yang dikelola admin.
- Komponen reusable `AreaPicker` lazy-load provinsi → kab/kota → kecamatan
  → kelurahan/desa lewat `/api/areas`.
- Kelurahan memakai autocomplete dengan debounce; form kawasan berhenti di
  level kecamatan.
- Properti menyimpan kecamatan di `areaId` untuk kode properti dan kelurahan
  opsional di `villageId`.
- Dashboard menampilkan jumlah baris data wilayah yang tersinkron.
