# jualrumahproperty.com — Portal & Internal Properti

Portal internal dan publik khusus listing penjualan properti (berawal Jakarta Selatan,
data wilayah nasional 4-level). Acuan keputusan: **[docs/BLUEPRINT-v0.3.md](docs/BLUEPRINT-v0.3.md)**,
detail per keputusan di **[docs/adr/](docs/adr/)**. Riwayat implementasi: **[docs/PROGRESS.md](docs/PROGRESS.md)**.
Agen coding wajib baca **[AGENTS.md](AGENTS.md)** dulu (hierarki dokumen ada di atas file itu).

---

## 🚀 Memulai (Local Development)

### 1. Prasyarat
- Node.js 20+
- MySQL (Laragon / MySQL Server lokal berjalan pada port 3306)

### 2. Konfigurasi Environment (`.env`)
Pastikan variabel basis data mengarah ke database lokal Anda:
```env
DATABASE_URL="mysql://root:@localhost:3306/jakselproperti"
```

### 3. Setup Basis Data
```bash
# Sinkronisasi schema Prisma ke MySQL
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Isi data awal (seed + wilayah nasional, lihat BLUEPRINT §1)
npm run db:seed
npm run db:import-wilayah
```

### 4. Menjalankan Server Development
```bash
npm run dev
```

Buka di browser:
- **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Portal Publik:** [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Fitur Utama yang Tersedia
- **Manajemen Properti & Listing:** Transisi 10 status workflow listing, tracking riwayat harga & status, edit properti, dan safe delete terproteksi kode.
- **Penomoran:** Nomor publik `100001-7` / `500001-3` (Luhn) + kode kanonis `{kemendagri}-{running}` — lihat ADR-002.
- **Bulk / Batch Import CSV + Smart Import WA:** Validasi pra-import, pencocokan wilayah nasional, deduplikasi fingerprint.
- **Pihak Terkait (Owner & Perantara):** Full CRUD owner & perantara, badge kepercayaan (*Trust Level*), proteksi integritas data.
- **CRM Leads (Kanban):** Pipeline 6-stage kanban dengan Drag & Drop, optimistic updates, audit logging.
- **Database Customer:** Deduplikasi via nomor telepon + riwayat minat properti.
- **Role:** SUPER_ADMIN / SUPPORT / BROKER (+ BUYER/SELLER bertahap, ADR-003). Halaman `/agents` di-hide via flag.
