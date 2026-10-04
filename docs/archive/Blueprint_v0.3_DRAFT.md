> ARSIP — digantikan `BLUEPRINT.md` v0.3 FINAL (29 Sep 2026). Jangan jadikan acuan.
> Keputusan berlaku pindah ke BLUEPRINT + `docs/adr/`.

# Blueprint jakselproperti.com — v0.3 DRAFT (untuk review)

> Status: DRAFT untuk review user. Belum menggantikan `Blueprint.MD` v0.2.
> Tujuan: mengunci keputusan yang sudah jalan di kode agar AGENTS + UI tidak belang.
> Prinsip aman: flow bisnis tidak berubah, refactor UI hanya token/komponen, verifikasi `tsc + build + test`.

## 0. Delta v0.2 → v0.3 DRAFT

| Area | v0.2 | v0.3 DRAFT (praktik berjalan) |
|---|---|---|
| Scope wilayah | Jaksel only (10 kecamatan) | Nasional 4-level (provinsi→kab/kota→kecamatan→kelurahan, 91.162 baris, kode Kemendagri) |
| Font publik | Referensi: Playfair Display (heading) + EB Garamond (body), status belum final | **Perlu dikunci di review ini — opsi A/B/C di §4** |
| Palet publik | Biru gelap `#3B5E80` di komentar CSS lama | Orange Action `#C24F24` + soft `#FAEEE8` (sudah di `globals.css`) |
| Admin UI | Tidak diatur | Theme C Modern SaaS Refined, FILLED input, tombol primary tinta `#101828` |
| Storage | R2 kandidat | R2 via S3 SDK (dipakai) |
| Penomoran | Belum ada | Property `100001-7` + Listing `500001-3` (Luhn, atomic), kode internal `{kemendagri}-{running}` cth `317407-0001` |
| Role | Single admin | Flat: SUPER_ADMIN / SUPPORT / BROKER (verified) + module-access + `managedById` |
| Katalog | Grid 5-6 kolom + peta kanan | Grid 4→3→2 kolom, **tanpa peta** (privasi §10 tetap) |

## 1. Tujuan & Batasan (tetap dari v0.2)

- Database listing jual, internal + publik terverifikasi, lead via WA.
- Fokus jual saja, konsinyasi, multi-owner / multi-perantara, verifikasi admin.
- Privasi: alamat lengkap internal-only, publik hanya area/kawasan kecuali flag per-listing.

## 2. Arsitektur Data (kunci v0.3)

- PK UUID kecuali `Area` Int autoincrement.
- Area 4-level + `officialCode` Kemendagri. Query kecamatan wajib `level:3`.
- Property (fisik) terpisah dari Listing (penawaran). Junction `PropertyOwner`, `ListingIntermediary`.
- `listings.managedById` otomatis dari pembuat, dipakai scope broker.
- `sequence_counters` atomic, tanpa `MAX+1`. Luhn untuk nomor publik.
- Media di R2, DB hanya metadata.

## 3. Flow Bisnis (tidak berubah — sudah smooth)

DRAFT → PENDING_VERIFICATION → READY_TO_PUBLISH → ACTIVE → IN_NEGOTIATION → SOLD / SUSPENDED / WITHDRAWN / EXPIRED / ARCHIVED.
Tetap catat `ListingStatusHistory` + `PriceHistory`. Deduplikasi properti via fingerprint fisik.

## 4. Keputusan Font Publik (PERLU REVIEW — pilih satu)

Kondisi kini belang: `AGENTS.md` tulis Playfair+EB Garamond, `sales.module.css` komentar tulis EB Garamond tapi kode pakai Jakarta Sans, `globals.css` pakai Jakarta Sans.

- **Opsi A — Blueprint murni:** Heading Playfair Display, body/nav/harga EB Garamond. Pro: premium, sesuai referensi Raveis. Kontra: EB Garamond kecil 16px kurang tajam di HP, perlu load 2 font serif.
- **Opsi B — Jakarta penuh (status quo kode):** Semua Jakarta Sans. Pro: modern, tajam di mobile, 0 perubahan. Kontra: menyimpang dari blueprint premium.
- **Opsi C — Hybrid (rekomendasi):** Heading Playfair Display (premium), body/UI/harga Jakarta Sans (readability). Pro: kompromi, hanya 1 font serif untuk heading.

Setelah pilih, `AGENTS.md` + `globals.css` + `sales.module.css` disamakan, komentar lama dihapus.

## 5. Sistem UI Terkunci (anti-belang)

- **Portal publik:** token `--portal-*` di `globals.css` saja. Dilarang hex hardcode di module CSS. Komponen bersama: `PortalHeader`, `PortalCard`, `PortalPrice` (`src/components/portal/`), helper `formatRupiah` tunggal di `src/lib/format.ts`.
- **Admin/broker:** Theme C di `admin-ui.css` saja. Primitif `.admin-card/.admin-btn/.admin-input/.ui-field`. Dilarang style input per-modul.
- Ikon portal: satu set SVG (atau lucide) — hapus duplikasi inline per-page.
- Grid katalog: 4→3→2 kolom, tanpa peta (alasan bypass komisi tetap berlaku).

## 6. Strategi Ubah UI Tanpa Error

1. Hanya sentuh CSS + presentasi, jangan ubah query Prisma / status flow / API shape.
2. Urutan: token → komponen bersama → migrasi `/`, `/jual`, `/properti/[id]` satu per satu.
3. Verifikasi tiap langkah: `npx tsc --noEmit`, `npm run build`, `npm test`.
4. Rollback aman: karena logic tidak berubah, revert CSS/komponen tidak merusak data.

## 7. Yang Perlu Persetujuan User

- [ ] Pilih Opsi font A/B/C
- [ ] Setuju grid tanpa peta tetap dipertahankan?
- [ ] Setuju `Blueprint.MD` v0.2 diganti file ini jadi v0.3-final setelah review?
- [ ] Urutan eksekusi: font → PortalCard/Price → header/footer unifikasi?

## 8. Catatan User 29 Sep 2026 (7 point — belum diputuskan, untuk riset)

1. Scope wilayah: data nasional tetap, tapi card wilayah TIDAK tampil di dashboard. Wilayah hanya dipakai di fungsi register listing property.
2. Font: lock hanya yang disepakati (tunggu pilihan A/B/C §4).
3. Palet publik: belum sreg → riset ulang color palette dari nol (bukan debat Orange Action lama).
   → 29 Sep: logo client (#C52004 merah, teks putih) disepakati jadi acuan. Preview `public/palette-v3.html`.
   Token usulan: surface #FFFFFF, soft #F7F7F7, ink #222222, muted #717171, line #EBEBEB,
   action #C52004, hover #A31803, deep #7A1302, soft #FDECE7, border #F0C4B8, WA #128C5E.
4. UX belang: adopsi template Odoo dicoba tapi hasil buruk, di luar ekspektasi → perlu arah UX sendiri, bukan tiru Odoo.
5. Penomoran/listing ID: riset apakah ada SOP / aturan baku internasional untuk format listing ID.
   → 29 Sep DIPUTUSKAN: ikut pola Ray White (numerik pendek), bukan Brighton composite.
   Alasan: Brighton `011826-BRJ00200` mengikat agen/kantor → basi saat oper listing + susah didikte;
   Ray White `355121` stabil + phone-friendly. RESO MLS juga bedakan ListingKey (mesin) vs ListingId (human).
   Format kita:
   - Publik listing `500001-3` = sequence + Luhn check digit (lebih bagus dari Ray White yg tanpa proteksi typo).
   - Strip `-` WAJIB di display sebagai pemisah sequence vs check digit; input dilonggarkan (dengan/tanpa strip diterima).
   - Kode properti kanonis `317407-0001` terpisah (basis Kemendagri, stabil ala ZPID), bukan info agen.
   - Prefix display `JRP-500001-3` opsional untuk brosur, tanpa ubah DB.
6. Role: pikir ulang — perkembangan butuh SUPER_ADMIN, broker, buyer, owner/seller, admin support/CS (ganti model flat sekarang).
7. Katalog: perlu pengelompokan ulang karena rencana section broker beriklan listing propertinya.
