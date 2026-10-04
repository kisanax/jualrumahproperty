# BLUEPRINT — jualrumahproperty.com v0.3 FINAL

Status: FINAL 29 Sep 2026. Satu-satunya sumber keputusan.
Menggantikan `Blueprint.MD` v0.2 (arsip) dan `Blueprint_v0.3_DRAFT.md` (arsip draf).
Detail tiap keputusan: `docs/adr/`.

## 1. Produk & scope
- Portal + internal listing JUAL (bukan sewa), konsinyasi, multi-owner/multi-perantara, verifikasi admin.
- Data wilayah NASIONAL 4-level (91.162 baris Kemendagri), tapi dashboard TANPA card wilayah —
  wilayah hanya dipakai di fungsi register listing.
- Flow listing (tidak berubah):
  DRAFT → PENDING_VERIFICATION → READY_TO_PUBLISH → ACTIVE → IN_NEGOTIATION →
  SOLD / SUSPENDED / WITHDRAWN / EXPIRED / ARCHIVED.
- Privasi: alamat lengkap internal-only; publik hanya area/kawasan kecuali flag per-listing.
  Katalog tanpa peta (anti-bypass komisi). Broker pemilik listing TIDAK ditampilkan di halaman publik
  (halaman `/agents` di-hide via flag, data tetap utuh untuk section iklan broker).

## 2. Identitas & penomoran → ADR-002
- PK UUID (mesin) kecuali `Area` Int autoincrement. Tidak tampil di URL publik.
- Kode properti kanonis `{kemendagri}-{running}` cth `317407-0001` (stabil ala ZPID).
- Nomor publik listing `500001-3` / properti `100001-7`: sequence + Luhn check digit.
  Strip `-` wajib di display; input terima dengan/tanpa strip. Prefix `JRP-` opsional display.
- URL publik target `/properti/{listing-number}`.

## 3. Visual portal → ADR-001
- Dasar putih `#FFFFFF` (ala Airbnb), ink `#222222`, muted `#717171`, line `#EBEBEB`.
- Aksi merah logo `#C52004` (hover `#A31803`, deep `#7A1302`, soft `#FDECE7`).
  Merah hanya CTA <10%; body putih 90%. WA hijau `#128C5E`.
- Token tunggal `--portal-*` di `globals.css`; larang hex hardcode di module.
- Font: dikunci setelah pilihan A/B/C (menyusul di ADR saat diputuskan).

## 4. Admin/broker UI
- Theme C Modern SaaS Refined, FILLED input, primitif `.admin-*` di `admin-ui.css`.
  Jangan bikin style input per-modul. Template Odoo DITOLAK (hasil buruk) — arah UX sendiri.

## 5. Role → ADR-003 + `../../docs/Blueprint/AUTH-ROLE-IMPLEMENTATION-PLAN-v1.md` (teknis)
- Seller/Owner BERBEDA dari Broker. Satu orang dua peran = akun terpisah.
- Fase 0 (kini): seller via form titip tanpa akun; buyer guest + WA.
- Fase 1: tambah `BUYER`, `SELLER`; `SellerProfile`; MEMBER → BUYER; default-deny.
- Final: SUPER_ADMIN / SUPPORT(CS) / BROKER / SELLER / BUYER.
- Registrasi kini: `/daftar` (member) → `/daftar-broker` (upgrade eksplisit) →
  `/onboarding` (verifikasi) → workspace. Staff via SUPER_ADMIN, tanpa daftar mandiri.

## 6. Katalog & iklan (belum diputuskan)
- Katalog perlu grouping ulang untuk slot iklan broker. Booster (Top/Premier/Featured
  ala Rumah123) di atas `managedListings`, tanpa ubah kepemilikan.

## 7. Aturan coding (ringkas — detail di AGENTS.md)
- Logic di service layer; guard API wajib (`requireOperationalUser/Staff/SuperAdmin`);
  matriks di `permissions.ts`/`module-access.ts`; `db push` di dev; verifikasi
  `tsc + build + test` tiap langkah; UI hanya token/komponen (rollback aman).

## 8. Kepemilikan UI/UX — keputusan 30 Sep 2026
- Hanya **Codex** yang boleh merancang dan mengubah UI/UX proyek, baik portal publik
  maupun halaman auth, admin, broker, seller, dan buyer.
- Cakupan meliputi layout, navigasi, alur interaksi, teks antarmuka, tipografi,
  warna/token desain, CSS, komponen visual reusable, responsivitas, aksesibilitas,
  serta tampilan loading, kosong, sukses, dan error.
- Agent coding lain berfokus pada backend, API, database, autentikasi/otorisasi,
  dan logika bisnis. Agent lain tidak boleh mengubah UI/UX, termasuk sebagai
  efek samping perbaikan fitur atau refactor.
- Jika pekerjaan backend membutuhkan perubahan antarmuka, agent tersebut
  mendokumentasikan kebutuhan serta kontrak datanya untuk diimplementasikan oleh Codex.
  Pada file yang mencampur logika dan tampilan, perubahan agent lain harus terbatas
  pada logika tanpa mengubah presentasi atau perilaku interaksi pengguna.
- Pengecualian pembagian tanggung jawab ini hanya atas instruksi eksplisit pemilik proyek.
- Commit dan push hanya dilakukan setelah persetujuan eksplisit pemilik proyek.
