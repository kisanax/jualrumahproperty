# ADR-002: Format listing ID numerik + Luhn

Status: Accepted 29 Sep 2026

## Konteks
Contoh portal: Brighton `011826-BRJ00200` (composite agen/kantor) vs
Ray White `355121` (numerik pendek). Standar RESO: ListingKey (mesin) vs
ListingId (human).

## Keputusan
- Ikut pola Ray White (numerik pendek), bukan Brighton composite.
- Publik listing `500001-3`: sequence + Luhn check digit (proteksi salah ketik).
- Strip `-` wajib di display (pemisah sequence vs check digit);
  input dilonggarkan (dengan/tanpa strip diterima).
- Kode properti kanonis `317407-0001` terpisah (basis Kemendagri, stabil ala ZPID).
- Prefix display `JRP-500001-3` opsional untuk brosur, tanpa ubah DB.
- URL publik target: `/properti/{listing-number}` (ganti UUID).

## Konsekuensi
- Tidak ada perubahan schema; hanya format display + normalisasi input + routing URL.
