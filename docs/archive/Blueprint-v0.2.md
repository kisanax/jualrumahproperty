> ARSIP v0.2 — digantikan `BLUEPRINT-v0.3.md` FINAL (29 Sep 2026). Jangan jadikan acuan.
> Keputusan yang masih berlaku pindah ke BLUEPRINT-v0.3 + `docs/adr/`.
> (Catatan: isi di bawah direkonstruksi dari backup bacaan 29 Sep 2026 setelah
> tertimpa akibat tabrakan nama file case-insensitive di Windows.)

Blueprint jakselproperti.com
Versi: Draft 0.2
Cakupan: tujuan bisnis, workflow listing, rancangan data, keputusan operasional
Status: konseptual disepakati + keputusan operasional awal selesai
Perubahan dari 0.1 → 0.2: menyelesaikan sebagian besar open question di bagian 15 lama. Section itu sekarang
dipecah jadi "Keputusan yang Sudah Diambil" dan "Masih Terbuka". Belum masuk ke sitemap, desain, atau pilihan
teknologi — sesuai urutan yang disepakati.
1. Tujuan Platform
jakselproperti.com adalah portal internal dan publik khusus properti dijual di wilayah Jakarta Selatan.
Tujuan utama:
- Menjadi database listing penjualan properti Jakarta Selatan.
- Membantu tim internal mengelola stok properti konsinyasi.
- Menyatukan informasi dari owner dan satu atau lebih perantara.
- Menampilkan listing terverifikasi kepada calon pembeli.
- Menghasilkan lead pembeli melalui portal dan WhatsApp.
- Menjaga data owner, perantara, komisi, dan negosiasi tetap privat.
2. Batasan Bisnis Awal
Hanya mencakup wilayah administratif Jakarta Selatan.
Fokus awal hanya properti dijual, bukan disewa.
Portal dikelola oleh satu tim internal.
Tidak ada akun untuk owner, perantara, maupun publik.
Owner dan perantara dicatat sebagai pihak terkait listing.
Semua listing diperiksa dan dipublikasikan oleh admin internal.
Sifat kerja sama properti adalah konsinyasi.
Sebuah properti dapat memiliki lebih dari satu owner atau perantara.
3. Aktor Sistem
Admin internal — membuat/update listing, mencatat owner & perantara, kelola foto/dokumen, verifikasi info,
ubah harga/status, kelola lead & tindak lanjut, atur listing yang tampil publik.
Owner — pemilik sah/berwenang jual. Tanpa akun. Kontak bersifat internal. Bisa punya banyak properti; satu
properti bisa punya beberapa owner.
•
•
•
•
•
•
•
•
jakselproperti.com — Blueprint Internal | Halaman 1 dari 7
Perantara — pembawa info properti ke tim. Tanpa akun. Satu perantara bisa bawa banyak listing; satu listing
bisa melibatkan beberapa perantara. Rantai perantara & komisi dicatat internal.
Calon pembeli — akses tanpa akun, cari & lihat listing, kontak via WhatsApp, bisa tanya/jadwal survei/ajukan
penawaran.
4. Workflow Bisnis Utama
Informasi properti diterima
↓
Owner dan perantara dicatat
↓
Pemeriksaan kemungkinan duplikat
↓
Properti fisik dibuat atau ditemukan
↓
Data dan kepemilikan diverifikasi
↓
Kesepakatan konsinyasi dicatat
↓
Listing dibuat sebagai draft
↓
Foto dan informasi publik disiapkan
↓
Admin melakukan pemeriksaan
↓
Listing dipublikasikan
↓
Lead pembeli masuk
↓
Kualifikasi dan tindak lanjut
↓
Survei properti
↓
Negosiasi dan penawaran
↓
Terjual, ditarik, atau kedaluwarsa
↓
Listing diarsipkan
5. Rantai Sumber Informasi
Bentuk hubungan yang didukung:
- Owner → Tim internal
- Owner → Perantara A → Tim internal
- Owner → Perantara A → Perantara B → Tim internal
Untuk setiap perantara, dicatat: posisi dalam rantai, peran, sumber utama/tambahan, info komisi, catatan
kesepakatan, status verifikasi/trust level, riwayat komunikasi.
jakselproperti.com — Blueprint Internal | Halaman 2 dari 7
Catatan implikasi dari keputusan sesi ini: intermediaries butuh atribut trust level — dipakai untuk
menentukan apakah listing dari sumber tersebut boleh publish sebelum owner terverifikasi penuh (lihat 15.2).
6. Pemisahan Properti dan Listing
Properti — aset fisik yang tidak berubah karena status pemasaran berubah (tanah, rumah, unit apartemen,
ruko).
Listing — periode/penawaran penjualan properti tsb. Satu properti bisa punya beberapa riwayat listing:
Properti A
├── Listing 2025 — ditarik owner
├── Listing awal 2026 — kedaluwarsa
└── Listing terbaru — aktif
Pemisahan ini mencegah data aset, foto, dan riwayat lama hilang ketika properti dipasarkan ulang.
7. Entitas Database Inti
Akses internal: users , audit_logs
Pihak terkait: owners , intermediaries , property_owners , listing_intermediaries ,
listing_sources
Properti & pemasaran: properties , listings , areas , amenities , property_amenities
Media & dokumen: property_media , documents
Riwayat: listing_status_history , price_history
Penjualan & CRM: leads , lead_activities , viewing_schedules , offers
8. Status Listing
Draft → Menunggu verifikasi → Siap dipublikasikan → Aktif → Dalam negosiasi → Terjual → Ditunda →
Ditarik owner → Kedaluwarsa → Diarsipkan.
Setiap perubahan status disimpan di riwayat: waktu, admin, alasan.
9. Pencegahan Data Duplikat
Sebelum membuat properti baru, sistem membandingkan: alamat internal, koordinat, nama/kontak owner,
nomor sertifikat (jika ada), luas tanah/bangunan, karakteristik properti, kemiripan foto, hash file foto.
Jika properti sama diterima dari perantara berbeda: tidak buat aset baru → tambahkan perantara ke properti/
listing yang sudah ada → simpan sumber & tanggal info → tandai konflik harga/info kalau ada → pertahankan
riwayat semua sumber.
jakselproperti.com — Blueprint Internal | Halaman 3 dari 7
10. Privasi Data
Publik: judul listing, area/lokasi umum, harga publik (atau "Hubungi kami" — lihat 15.5), spesifikasi,
deskripsi, foto disetujui, fasilitas, status ketersediaan, kontak WhatsApp tim.
Internal: alamat lengkap (kecuali per-listing basis, lihat 15.6), identitas & kontak owner/perantara, harga
minimum, komisi, rantai perantara, catatan negosiasi, dokumen legal, nomor sertifikat, riwayat komunikasi,
catatan reputasi sumber.
11. Arsitektur Foto dan Dokumen
Admin mengunggah foto
↓
Validasi ukuran dan format
↓
Penghapusan metadata sensitif (EXIF/GPS)
↓
Pembuatan beberapa ukuran
↓
Penyimpanan object storage
↓
Distribusi melalui CDN
↓
Database menyimpan URL dan metadata
Database tidak menyimpan file foto langsung — hanya: lokasi file, jenis media, ukuran, dimensi, format,
urutan galeri, status publik/privat, foto utama, alt text, hash file, waktu unggah.
12. Opsi Cloudflare R2
Kandidat utama storage untuk foto, denah, video pendek, dokumen internal privat.
Keuntungan: cocok untuk volume file terus bertambah, terintegrasi jaringan Cloudflare, S3-compatible, bisa
dipisah publik vs privat, lebih tepat dibanding binary di database.
Status: belum final, tapi shortlist utama.
13. Kebijakan Foto Awal
Maksimal 20–40 foto per listing.
Format input JPG, PNG, WebP, HEIC (jika konversi didukung).
Kompresi otomatis + versi WebP/AVIF untuk web. File asli bisa disimpan sebagai arsip.
Metadata GPS/EXIF sensitif dihapus.
Foto utama wajib ditentukan, urutan diatur admin.
Watermark: opsional, admin pilih per listing/per foto (diputuskan sesi ini — lihat 15.8).
Lazy loading di galeri. Alt text informatif untuk SEO lokal.
•
•
•
•
•
•
•
jakselproperti.com — Blueprint Internal | Halaman 4 dari 7
14. Pemisahan Penyimpanan
Media publik: foto listing, denah disetujui, gambar artikel, gambar Open Graph.
Dokumen privat: KTP/identitas, sertifikat, surat kuasa, perjanjian konsinyasi, bukti komunikasi, dokumen
legal lain.
Dokumen privat tidak pakai URL publik permanen — akses via dashboard dengan izin & URL sementara.
Catatan MVP (keputusan sesi ini, lihat 15.3): untuk fase awal, sistem hanya mencatat status/referensi dokumen
(ada/tidak, jenis, catatan), belum menyimpan file-nya. File fisik dokumen legal disimpan di luar sistem dulu. Struktur
tabel documents tetap disiapkan agar migrasi ke penyimpanan penuh gampang di fase 2.
15. Keputusan Operasional
15.1 Sudah diputuskan (sesi ini)
# Pertanyaan Keputusan
1 Listing boleh publish sebelum
owner terverifikasi?
Tergantung sumber — listing dari perantara dengan trust level tinggi boleh
publish lebih dulu; perlu field trust level di intermediaries
2 Owner wajib tercatat di setiap
listing?
Tergantung status — boleh kosong saat draft, wajib diisi sebelum status
naik ke publish
3 Komisi dicatat per perantara
atau total?
Belum perlu di MVP — tambahkan breakdown per perantara di fase 2
4 Dokumen legal disimpan di
sistem sejak MVP?
Tidak — MVP cuma catat status/referensi dokumen (ada/tidak), file fisik di
luar sistem dulu
5 Listing eksklusif vs terbuka
dibedakan?
Tidak perlu di MVP — semua listing diperlakukan sama dulu
6 Nomor WhatsApp: satu pusat
atau per staf?
Satu nomor pusat untuk semua listing
7 Harga publik boleh
disembunyikan?
Ya — admin bisa set status "Harga on request"; harga asli tetap tersimpan
internal
8 Alamat lengkap pernah boleh
ditampilkan publik?
Boleh, per-listing basis — admin memutuskan case-by-case
9 Watermark foto publik wajib? Opsional — admin pilih per listing atau per foto
15.2 Masih terbuka (belum dibahas)
Berapa • lama masa konsinyasi standar?
jakselproperti.com — Blueprint Internal | Halaman 5 dari 7
Langkah berikutnya (sesuai urutan yang disepakati): lanjut bahas aturan operasional listing & verifikasi
yang tersisa (masa konsinyasi), baru masuk ke sitemap, desain portal, dan pilihan teknologi/schema database.
Lampiran: Referensi Desain (dari eksplorasi terpisah)
Dikumpulkan sebelum blueprint bisnis ini — disimpan sebagai referensi visual, belum jadi keputusan final, belum dicross-
check dengan kebutuhan CRM/verifikasi di atas.
Referensi 1: William Raveis Nantucket (katalog listing)
Grid 3-kolom, card minimalis (foto + info di bawah)
Badge lokasi pill di pojok foto
Badge status nempel di foto (bukan di area teks)
Hierarchy tipografi: harga bold besar, info sekunder abu-abu kecil
Logo/branding serif — kesan premium/established
Status: belum diputuskan elemen mana yang diadopsi
Spesifikasi Tipografi (hasil inspeksi referensi)
Elemen Font asli Weight Size
Line
height
Alternatif gratis
(jakselproperti.com)
Heading utama (judul
listing/alamat, H1)
the-seasons
(Yellow Design
Studio, berbayar)
600 36px 40px Playfair Display (paling umum
dipakai real estate premium)
Heading section (contoh:
"Properties for sale")
the-seasons 600 22px 25px Playfair Display, warna
rgb(89,87,87) (abu-abu,
bukan hitam solid)
Paragraf/deskripsi EB Garamond 400 22px 31px EB Garamond
Harga & alamat di card
listing
EB Garamond 400 16px 22px EB Garamond, warna aksen
rgb(59,94,128) (biru gelap)
Navigasi & label filter
(Rent/Buy/Sell,
Neighborhoods, Bedrooms,
dst)
EB Garamond 400 16px 16px EB Garamond, warna
rgb(155,157,164) (abu-abu
terang)
Koreksi penting: dugaan awal soal Inter untuk elemen UI/data (nav, filter, badge) tidak akurat. Hasil inspeksi
menunjukkan hampir seluruh teks di site — nav, filter label, paragraf, harga, alamat — memakai EB
Garamond, hanya beda size/weight/warna per konteks. Yang benar-benar beda font cuma heading (theseasons/
Playfair Display). Rekomendasi: jakselproperti.com pakai EB Garamond sebagai font utama untuk
hampir semua teks, Playfair Display khusus heading, dan pertimbangkan drop Inter sepenuhnya kecuali
dibutuhkan untuk elemen teknis (angka di admin panel, misalnya) yang butuh keterbacaan angka lebih tajam.
•
•
•
•
•
•
jakselproperti.com — Blueprint Internal | Halaman 6 dari 7
Referensi 2: William Raveis Nantucket (hero homepage)
Hero full-width dengan video background cinematic, overlay judul besar serif di tengah video
Search widget mengambang di atas video (bukan di bawah hero) — dengan tab toggle antar mode
pencarian (di referensi: "Find a Rental" vs "Find a Home")
Untuk jakselproperti.com: karena fokus awal hanya dijual (lihat batasan bisnis #2), tab toggle ini
kemungkinan tidak diperlukan di MVP — cukup satu search bar tanpa toggle
Filter bar di dalam search widget: beberapa dropdown filter sejajar horizontal (neighborhood, tipe, harga,
amenities di referensi) — bisa diadaptasi jadi Area, Tipe Properti, Rentang Harga, Kamar Tidur
Navigasi atas: logo serif di kiri, menu items serif tipis di tengah/kanan, nomor telepon kontak langsung
terlihat di ujung kanan (pola relevan untuk nomor WhatsApp pusat)
Section di bawah hero: heading serif + paragraf (EB Garamond) + link text sederhana — konsisten dengan
spec tipografi di atas
Rencana user: cari video asset non-copyright untuk background hero (video Jakarta Selatan/aerial city,
bukan video Nantucket ini)
Status: belum diputuskan elemen mana yang diadopsi
Validasi tech stack (Wappalyzer scan raveisnantucket.com)
Referensi dibangun dengan Next.js + React — konsisten dengan stack yang sudah direncanakan, tidak ada
perubahan keputusan teknis. Tambahan kecil untuk dipertimbangkan di MVP:
- reCAPTCHA pada form kontak/inquiry (anti-spam)
- Google Analytics (GA4) + Google Tag Manager untuk tracking traffic & konversi lead
- Google Maps sudah sesuai rencana (untuk titik lokasi di detail listing)
Referensi 3: William Raveis Nantucket (halaman katalog /buy) — dengan adaptasi
Layout asli: grid 3-kolom + peta interaktif di sisi kanan (split 50/50)
Adaptasi untuk jakselproperti.com: TIDAK pakai peta di halaman katalog. Alasan bisnis: peta
interaktif dengan pin lokasi presisi memudahkan calon pembeli cross-reference posisi + foto untuk
menebak alamat persis, lalu menghubungi owner langsung tanpa lewat tim — bypass komisi. Ini konsisten
dengan keputusan privasi di bagian 10 (alamat lengkap internal-only kecuali diputuskan lain per-listing).
Karena tanpa peta, grid pakai full-width, diperbesar jadi 5-6 kolom per baris (bukan 3), dengan card
yang tetap menampilkan foto dominan + badge lokasi (area/kecamatan, bukan alamat presisi) + info ringkas
Search bar full-width di atas + filter row lengkap (area/neighborhood, rentang harga, kamar tidur, kamar
mandi, more filters, reset search)
Sort dropdown ("Sorted by...") tetap dipertahankan
Status: elemen ini disetujui untuk diadopsi ke mockup (grid besar tanpa peta, search+filter lengkap)
•
•
•
•
•
•
•
•
•
•
•
•
•
•
jakselproperti.com — Blueprint Internal | Halaman 7 dari 7
