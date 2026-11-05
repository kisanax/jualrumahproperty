# Akun Dev & Password Testing

> ⚠️ **HANYA untuk lingkungan development/lokal.** Akun ini ada di database dev —
> di production jangan pernah ada akun dengan password statis seperti ini.
> Password terverifikasi langsung ke hash DB: **28 Oktober 2026**.

## Login

- URL: `http://localhost:3000/login`
- Bisa pakai email ATAU username (`admin` juga valid untuk akun admin).

## Akun aktif

| Email | Role | Password | Dipakai untuk test |
|---|---|---|---|
| `admin@jualrumahproperty.com` | SUPER_ADMIN | `admin` | Semua modul, hapus permanen, kelola user, konfigurasi akses |
| `support@jualrumahproperty.com` | SUPPORT | `jaksel-support-2026` | Lihat & edit seluruh data operasional (tanpa kelola user/hapus) |

**Bukan akun dev:** `setho.juve@gmail.com` — akun pribadi (password tidak terdokumentasi,
jangan dipakai untuk testing).

## Catatan

1. **Mengapa password admin cuma `admin`?** Seed meng-upsert akun admin dengan
   `hashPassword("admin")` (`prisma/seed.ts` ~baris 450) — menjatuhkan seed akan
   mengembalikan password itu lagi.
2. **Kredensial di AGENTS.md** harus konsisten dengan tabel ini. Kalau seed berubah,
   update dua-duanya.
3. Cara verifikasi manual tanpa login (kalau lupa): bandingkan hash scrypt di DB —
   salt & key ada di kolom `users.password` (format `scrypt$salt$key`), algoritma di
   `src/lib/password.ts`.
4. Bila menambah akun dev baru, masukkan ke `prisma/seed.ts` + tabel di atas.
