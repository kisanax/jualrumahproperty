# Konsep D — "Editorial Marketplace" (paduan A + B + C)

Mockup: [konsep-d.html](konsep-d.html) · pembanding: [konsep-a.html](konsep-a.html), [konsep-b.html](konsep-b.html), [konsep-c.html](konsep-c.html)

## Tesis

Halaman detail properti harus melayani dua orang sekaligus: pembeli yang **belum yakin** (butuh dibujuk, bukan diberi tabel) dan pembeli yang **sudah serius** (butuh angka untuk memutuskan). A melayani yang kedua, B melayani yang pertama, C melayani angka. Paduannya: **kerangka A, pembuka B, isi C.**

- **Dari A** — kerangka marketplace: header ringkas, sidebar sticky berisi harga + CTA, quick-facts, "Properti serupa", sticky bar mobile. Ini yang menjaga konversi dan kontinuitas dengan homepage.
- **Dari B** — pembuka editorial: kicker, judul besar, narasi dengan drop cap lebar 660px, foto storytelling dengan caption, band angka tipografis (garis ink atas-bawah, bukan kartu). Ini yang memberi rasa premium dan membuat fotonya bernapas.
- **Dari C** — kedalaman data: band angka 6 sel, spesifikasi lengkap tanpa akordeon, riwayat & verifikasi, simulasi KPR interaktif di sidebar.

## Yang sengaja DIBUANG

| Dibuang | Asal | Alasan |
| --- | --- | --- |
| Mozaik 2×2 di galeri | A | bikin foto terasa kecil & "katalog"; diganti hero besar + strip thumbnail bercaption |
| Foto full-bleed vertikal berurutan | B | memanjangkan halaman tanpa menambah informasi; storytelling cukup 2–3 foto di dalam kerangka |
| Kartu panel berbackground abu | C | terbaca seperti dashboard internal, bukan halaman jualan; diganti hairline (garis tipis) khas B |
| Sidebar tanpa CTA / CTA terlalu halus | B | WA adalah jalur konversi utama di pasar Indonesia |
| Angka raksasa 40px di band | B | terlalu memakan layar di mobile; D pakai ukuran adaptif |
| Status internal (`DRAFT`, `SIAP PUBLISH`) | semua | tidak boleh muncul di halaman publik |

## Struktur & sumber data

| Section | Field |
| --- | --- |
| Masthead (kicker, judul, harga, lokasi, sertifikat) | `Property.title`, `Listing.askingPrice`, `Listing.priceOnRequest`, alamat, `certificateType` |
| Galeri + tab Foto/Video/Denah | `PropertyMedia` (`type`=IMAGE/VIDEO/FLOOR_PLAN, `isPrimary`, `sortOrder`), `Listing.videoUrl` |
| Band angka 6 sel | `Property.bedrooms`, `bathrooms`, `landArea`, `buildingArea`, `floors`, parkir |
| Cerita Properti | `Listing.description` (atau catatan broker), `consignmentNotes` bila perlu |
| Foto storytelling + caption | `PropertyMedia.altText` / `caption` |
| Fasilitas chips | `PropertyAmenity` → `Amenity` (sudah ada di DB, belum dipakai halaman publik) |
| Spesifikasi | atribut `Property` (sertifikat, arah hadap, daya listrik, sumber air, tahun bangun) |
| Riwayat & verifikasi | `Listing.consignmentStartDate`, `publishedAt`, `updatedAt`, `Broker.verificationStatus` |
| Sidebar | `askingPrice`, harga per m² (`askingPrice`/`landArea`), WA dari `siteConfig`, telepon |
| Simulasi KPR | turunan dari `askingPrice` (DP, tenor, bunga) — tidak butuh tabel baru |

## Kontrak interaksi galeri

Meniru pola galeri Airbnb yang paling user friendly di mobile: satu *track* berbasis `scroll-snap`, jadi geser dengan jari itu scroll native (bukan event geser buatan).

- **Mobile** — track full-bleed, satu foto per layar, geser/snap; dots di bawah, counter `3 / 9` di kanan bawah, caption di kiri bawah; panah disembunyikan.
- **Desktop** — track yang sama dipakai sebagai hero (panah + counter), strip thumbnail di bawah ikut menandai slide aktif.
- **Tab Foto / Video / Denah** melompat ke slide pertama tipe itu; keyboard panah kiri/kanan juga berpindah.
- **Data** — urutan dan jumlah slide dibangun dari `PropertyMedia` (IMAGE/VIDEO/FLOOR_PLAN + `sortOrder`); dots dibuat dari jumlah slide, bukan ditulis manual, sehingga media bertambah tidak merusak UI.

## Urutan fase

1. **Kerangka** — masthead, galeri geser (track + dots + counter + strip + tab tipe), band angka, narasi, sidebar + CTA, properti serupa. Semua dari data yang sudah ada.
2. **Kedalaman** — fasilitas dari tabel `Amenity`, spesifikasi lengkap, riwayat & verifikasi, hitungan harga per m².
3. **Fitur** — simulasi KPR (client component), sticky CTA reveal, JSON-LD `RealEstateListing`.

## Keputusan yang masih terbuka

- Kalimat disclaimer KPR (estimasi vs penawaran kredit) — perlu Anda setujui sebelum tayang.
- Asumsi bunga: mockup pakai fix 4,75% 1 tahun lalu floating 11%; angkanya harus bisa diubah tanpa deploy ulang.
- Foto berkualitas: storytelling hanya berhasil kalau broker mengunggah foto lanskap dan potret, bukan campur acak.
- Peta sengaja belum ada; kalau nanti dimasukkan, cukup tingkat kawasan (privasi pemilik).
