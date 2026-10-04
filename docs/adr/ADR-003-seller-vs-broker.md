# ADR-003: Seller vs Broker peran terpisah

Status: Accepted 29 Sep 2026

## Konteks
Butuh peran buyer, owner/seller, broker, support/CS, super admin.
Pertanyaan: seller dan broker sama atau beda? Bagaimana adopsi di fondasi kini?

## Keputusan
- Seller/Owner (pemilik, 1-2 properti, titip + lacak) BERBEDA dari
  Broker (profesional, banyak listing, komisi, workspace).
  Satu orang dua peran = dua akun/peran terpisah. Sama seperti Rumah123
  (jalur pemilik vs agen, paket dan dashboard terpisah).
- Adopsi bertahap, aditif, tanpa bongkar:
  - Fase 0 (kini): seller via form titip tanpa akun (Owner CRM + DRAFT + CS);
    buyer guest + WA; `/agents` di-hide via flag.
  - Fase 1: tambah enum `BUYER`, `SELLER`; `SellerProfile` + link opsional
    `Owner.userId`; MEMBER dimigrasi jadi BUYER; default-deny sampai matriks akses di-seed.
  - Fase 2: workspace seller (read-only titipan), buyer (favorit sync + saved search),
    booster iklan broker di atas `managedListings`.
- Pola registrasi meniru broker: member → pengajuan eksplisit → verifikasi → workspace.

## Konsekuensi
- Enum hanya tambah nilai; tidak ada rename/hapus sampai migrasi tuntas.
- Halaman `/agents` tetap ada di kode (hidden), diaktifkan lagi saat section iklan broker.
