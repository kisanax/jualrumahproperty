import { formatTanggalIndonesia, durationMonths } from "./agreement-number";

// =============================================================================
// TEMPLATE SURAT PERJANJIAN PEMASARAN
//
// Pasal-pasal disimpan di tabel `agreement_templates` (editable SUPER_ADMIN),
// bukan di kode, supaya perubahan kalimat tidak butuh deploy ulang.
// Konstanta di file ini hanya TEMPLATE DEFAULT untuk seeding.
//
// Isi surat berisi placeholder {{nama_variabel}}. Saat surat DITERBITKAN,
// seluruh placeholder di-render jadi teks final lalu disimpan sebagai
// `snapshot`. Setelah itu isi surat tidak pernah berubah lagi — inilah yang
// membuat surat yang sudah ditandatangani tetap bisa diverifikasi.
// =============================================================================

export type AgreementPassage = {
  title: string;
  paragraphs: string[];
};

export type AgreementTemplateBody = AgreementPassage[];

// =============================================================================
// KATALOG PLACEHOLDER — ditampilkan sebagai bantuan di editor template
// =============================================================================

export type PlaceholderDef = { key: string; label: string; group: string };

export const AGREEMENT_PLACEHOLDERS: PlaceholderDef[] = [
  // Surat
  { key: "nomor_surat", label: "Nomor surat", group: "Surat" },
  { key: "tanggal_surat", label: "Tanggal surat diterbitkan", group: "Surat" },
  { key: "tempat_ttd", label: "Kota penandatanganan", group: "Surat" },
  { key: "tanggal_mulai", label: "Tanggal mulai berlaku", group: "Surat" },
  { key: "tanggal_berakhir", label: "Tanggal berakhir", group: "Surat" },
  { key: "durasi_bulan", label: "Durasi (bulan)", group: "Surat" },

  // Broker — PIHAK KEDUA
  { key: "nama_broker", label: "Nama broker", group: "Broker" },
  { key: "perusahaan_broker", label: "Nama kantor broker", group: "Broker" },
  { key: "jabatan_broker", label: "Jabatan/tipe broker", group: "Broker" },
  { key: "telepon_broker", label: "Telepon broker", group: "Broker" },
  { key: "email_broker", label: "Email broker", group: "Broker" },
  { key: "kota_broker", label: "Kota broker", group: "Broker" },
  { key: "nomor_izin_broker", label: "Nomor izin broker", group: "Broker" },

  // Owner — PIHAK PERTAMA
  { key: "nama_owner", label: "Nama pemilik", group: "Pemilik" },
  { key: "telepon_owner", label: "Telepon pemilik", group: "Pemilik" },
  { key: "email_owner", label: "Email pemilik", group: "Pemilik" },
  { key: "alamat_owner", label: "Alamat pemilik", group: "Pemilik" },
  { key: "nomor_ktp_owner", label: "Nomor identitas pemilik", group: "Pemilik" },

  // Properti
  { key: "kode_properti", label: "Kode properti internal", group: "Properti" },
  { key: "nomor_properti", label: "Nomor properti publik", group: "Properti" },
  { key: "jenis_properti", label: "Jenis properti", group: "Properti" },
  { key: "alamat_properti", label: "Alamat properti", group: "Properti" },
  { key: "kelurahan", label: "Kelurahan", group: "Properti" },
  { key: "kecamatan", label: "Kecamatan", group: "Properti" },
  { key: "kota", label: "Kota/kabupaten", group: "Properti" },
  { key: "provinsi", label: "Provinsi", group: "Properti" },
  { key: "luas_tanah", label: "Luas tanah (m²)", group: "Properti" },
  { key: "luas_bangunan", label: "Luas bangunan (m²)", group: "Properti" },
  { key: "kamar_tidur", label: "Jumlah kamar tidur", group: "Properti" },
  { key: "kamar_mandi", label: "Jumlah kamar mandi", group: "Properti" },
  { key: "tahun_dibangun", label: "Tahun dibangun", group: "Properti" },
  { key: "jenis_sertifikat", label: "Jenis sertifikat", group: "Properti" },
  { key: "nomor_sertifikat", label: "Nomor sertifikat", group: "Properti" },

  // Komersial
  { key: "nomor_listing", label: "Nomor listing", group: "Komersial" },
  { key: "harga_tawar", label: "Harga penawaran", group: "Komersial" },
  { key: "harga_minimum", label: "Harga minimum", group: "Komersial" },
  { key: "komisi_persen", label: "Persentase komisi", group: "Komersial" },
  { key: "komisi_nominal", label: "Nominal komisi", group: "Komersial" },
  { key: "catatan_komisi", label: "Catatan komisi", group: "Komersial" },
  { key: "sifat_perjanjian", label: "Eksklusif / non-eksklusif", group: "Komersial" },
];

/** Nilai placeholder yang kosong diganti ini supaya surat cetak tidak bolong. */
export const EMPTY_PLACEHOLDER = "-";

// =============================================================================
// RENDER
// =============================================================================

export type RenderResult = {
  text: string;
  /** Placeholder yang dipakai template tapi tidak punya nilainya. */
  unknownKeys: string[];
};

/**
 * Ganti semua {{key}} dengan nilainya.
 *
 * Key yang tidak dikenal DIBIARKAN apa adanya (tidak dihapus) dan dilaporkan
 * lewat `unknownKeys`, supaya kesalahan ketik di template terlihat saat
 * pratinjau alih-alih diam-diam menghasilkan surat yang cacat.
 */
export function renderText(
  template: string,
  vars: Record<string, string>
): RenderResult {
  const unknownKeys = new Set<string>();
  const seen = new Set<string>();

  const text = template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const value = vars[key];
    if (value === undefined) {
      unknownKeys.add(key);
      return match;
    }
    seen.add(key);
    return value;
  });

  return { text, unknownKeys: [...unknownKeys] };
}

/** Render seluruh pasal sekaligus. */
export function renderPassages(
  body: AgreementTemplateBody,
  vars: Record<string, string>
): { passages: AgreementPassage[]; unknownKeys: string[] } {
  const unknown = new Set<string>();

  const passages = body.map((passage) => {
    const title = renderText(passage.title, vars);
    title.unknownKeys.forEach((k) => unknown.add(k));
    return {
      title: title.text,
      paragraphs: passage.paragraphs.map((p) => {
        const rendered = renderText(p, vars);
        rendered.unknownKeys.forEach((k) => unknown.add(k));
        return rendered.text;
      }),
    };
  });

  return { passages, unknownKeys: [...unknown] };
}

// =============================================================================
// PEMBANGUN NILAI PLACEHOLDER
// =============================================================================

export type AgreementVarsInput = {
  agreementNumber: string;
  issuedAt: Date;
  startDate: Date;
  endDate: Date;
  signedPlace: string | null;
  exclusive: boolean;
  commissionPercent: number | null;
  commissionAmount: number | null;
  commissionNotes: string | null;

  brokerName: string;
  brokerCompany: string | null;
  brokerType: string | null;
  brokerPhone: string | null;
  brokerEmail: string | null;
  brokerCity: string | null;
  brokerLicense: string | null;

  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  ownerAddress: string | null;
  ownerIdNumber: string | null;

  listingNumber: string | null;
  askingPrice: number | null;
  minimumPrice: number | null;

  propertyCode: string;
  propertyNumber: string | null;
  propertyType: string;
  propertyAddress: string;
  village: string | null;
  district: string | null;
  city: string | null;
  province: string | null;
  landArea: number | null;
  buildingArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  yearBuilt: number | null;
  certificateType: string | null;
  certificateNo: string | null;
};

const PROPERTY_TYPE_ID: Record<string, string> = {
  HOUSE: "Rumah",
  APARTMENT: "Apartemen",
  LAND: "Tanah",
  SHOPHOUSE: "Ruko",
};

const CERTIFICATE_TYPE_ID: Record<string, string> = {
  SHM: "Sertifikat Hak Milik (SHM)",
  SHGB: "Sertifikat Hak Guna Bangunan (SHGB)",
  SHSRS: "Sertifikat Hak Satuan Rumah Susun (SHSRS)",
  AJB: "Akta Jual Beli (AJB)",
  GIRIK: "Girik / Letter C",
  PPJB: "Perjanjian Pengikatan Jual Beli (PPJB)",
  OTHER: "Lainnya",
};

const BROKER_TYPE_ID: Record<string, string> = {
  INDEPENDENT: "Broker Independen",
  AGENCY_OWNER: "Pemilik Kantor Broker",
  AGENCY_MEMBER: "Agen Kantor Broker",
};

const a = (value: string | null | undefined): string =>
  value && value.trim() ? value.trim() : EMPTY_PLACEHOLDER;

const num = (value: number | null | undefined): string =>
  value === null || value === undefined ? EMPTY_PLACEHOLDER : value.toLocaleString("id-ID");

/** Format rupiah penuh: 5000000000 → "Rp5.000.000.000" */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_PLACEHOLDER;
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

export function buildAgreementVars(input: AgreementVarsInput): Record<string, string> {
  return {
    nomor_surat: input.agreementNumber,
    tanggal_surat: formatTanggalIndonesia(input.issuedAt),
    tempat_ttd: a(input.signedPlace),
    tanggal_mulai: formatTanggalIndonesia(input.startDate),
    tanggal_berakhir: formatTanggalIndonesia(input.endDate),
    durasi_bulan: durationMonths(input.startDate, input.endDate).toString(),

    nama_broker: input.brokerName,
    perusahaan_broker: a(input.brokerCompany),
    jabatan_broker: input.brokerType
      ? BROKER_TYPE_ID[input.brokerType] ?? a(input.brokerType)
      : EMPTY_PLACEHOLDER,
    telepon_broker: a(input.brokerPhone),
    email_broker: a(input.brokerEmail),
    kota_broker: a(input.brokerCity),
    nomor_izin_broker: a(input.brokerLicense),

    nama_owner: input.ownerName,
    telepon_owner: a(input.ownerPhone),
    email_owner: a(input.ownerEmail),
    alamat_owner: a(input.ownerAddress),
    nomor_ktp_owner: a(input.ownerIdNumber),

    kode_properti: input.propertyCode,
    nomor_properti: a(input.propertyNumber),
    jenis_properti: PROPERTY_TYPE_ID[input.propertyType] ?? a(input.propertyType),
    alamat_properti: input.propertyAddress,
    kelurahan: a(input.village),
    kecamatan: a(input.district),
    kota: a(input.city),
    provinsi: a(input.province),
    luas_tanah: num(input.landArea),
    luas_bangunan: num(input.buildingArea),
    kamar_tidur: num(input.bedrooms),
    kamar_mandi: num(input.bathrooms),
    tahun_dibangun: num(input.yearBuilt),
    jenis_sertifikat: input.certificateType
      ? CERTIFICATE_TYPE_ID[input.certificateType] ?? a(input.certificateType)
      : EMPTY_PLACEHOLDER,
    nomor_sertifikat: a(input.certificateNo),

    nomor_listing: a(input.listingNumber),
    harga_tawar: formatRupiah(input.askingPrice),
    harga_minimum: formatRupiah(input.minimumPrice),
    komisi_persen:
      input.commissionPercent === null
        ? EMPTY_PLACEHOLDER
        : `${input.commissionPercent.toLocaleString("id-ID")}%`,
    komisi_nominal: formatRupiah(input.commissionAmount),
    catatan_komisi: a(input.commissionNotes),
    sifat_perjanjian: input.exclusive ? "Eksklusif" : "Non-Eksklusif",
  };
}

// =============================================================================
// TEMPLATE DEFAULT (untuk seeding)
//
// Konvensi pihak: PIHAK PERTAMA = Pemilik Properti (pemberi kuasa pemasaran),
// PIHAK KEDUA = Broker (pelaksana pemasaran).
// =============================================================================

export const DEFAULT_AGREEMENT_TEMPLATE: {
  name: string;
  headerTitle: string;
  opening: string;
  body: AgreementTemplateBody;
  closing: string;
} = {
  name: "Perjanjian Pemasaran Properti — Standar",
  headerTitle: "SURAT PERJANJIAN PEMASARAN PROPERTI",
  opening: [
    "Pada hari ini, {{tanggal_surat}}, yang bertanda tangan di bawah ini:",
    "",
    "1. {{nama_owner}}, selanjutnya disebut PIHAK PERTAMA, selaku pemilik sah atas objek properti yang diperjanjikan dalam surat ini, beralamat di {{alamat_owner}}, dengan nomor identitas {{nomor_ktp_owner}} dan nomor telepon {{telepon_owner}}.",
    "",
    "2. {{nama_broker}}, selanjutnya disebut PIHAK KEDUA, selaku {{jabatan_broker}} yang menjalankan kegiatan pemasaran properti{{perusahaan_broker}}, dengan nomor telepon {{telepon_broker}} dan alamat surat elektronik {{email_broker}}.",
    "",
    "PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama selanjutnya disebut PARA PIHAK, dan masing-masing disebut PIHAK. PARA PIHAK terlebih dahulu menerangkan bahwa PIHAK PERTAMA bermaksud memberikan kuasa pemasaran atas objek properti miliknya kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan kesanggupannya untuk melaksanakan pemasaran tersebut. Selanjutnya PARA PIHAK sepakat untuk mengikatkan diri dalam perjanjian pemasaran properti dengan syarat dan ketentuan sebagai berikut:",
  ].join("\n"),
  body: [
    {
      title: "PASAL 1 — OBJEK PERJANJIAN",
      paragraphs: [
        "PIHAK PERTAMA dengan ini menyerahkan kepada PIHAK KEDUA untuk dipasarkan, objek properti berupa {{jenis_properti}} dengan rincian sebagai berikut:",
        "a. Kode Properti: {{kode_properti}} (nomor publik: {{nomor_properti}})",
        "b. Alamat: {{alamat_properti}}",
        "c. Wilayah: Kelurahan {{kelurahan}}, Kecamatan {{kecamatan}}, {{kota}}, {{provinsi}}",
        "d. Luas tanah: {{luas_tanah}} m²; Luas bangunan: {{luas_bangunan}} m²",
        "e. Jumlah kamar tidur: {{kamar_tidur}}; Jumlah kamar mandi: {{kamar_mandi}}",
        "f. Tahun dibangun: {{tahun_dibangun}}",
        "g. Bukti kepemilikan: {{jenis_sertifikat}} dengan nomor {{nomor_sertifikat}}",
        "Selanjutnya objek properti tersebut dalam perjanjian ini disebut OBJEK PROPERTI.",
      ],
    },
    {
      title: "PASAL 2 — LINGKUP KERJA SAMA",
      paragraphs: [
        "PIHAK KEDUA diberikan kuasa oleh PIHAK PERTAMA untuk memasarkan OBJEK PROPERTI, yang meliputi kegiatan pemasaran, penjajakan calon pembeli, pengaturan jadwal survei, pendampingan negosiasi harga, serta penyampaian laporan berkala kepada PIHAK PERTAMA.",
        "Perjanjian pemasaran ini bersifat {{sifat_perjanjian}}. Dalam hal perjanjian bersifat eksklusif, PIHAK PERTAMA tidak akan menunjuk pihak lain untuk memasarkan OBJEK PROPERTI selama masa berlaku perjanjian ini.",
        "PIHAK KEDUA tidak berwenang untuk menandatangani perjanjian jual beli atas nama PIHAK PERTAMA, maupun menerima pembayaran dalam bentuk apapun atas harga jual OBJEK PROPERTI. Segala bentuk transaksi jual beli hanya sah apabila dilakukan secara langsung oleh PIHAK PERTAMA selaku pemilik.",
      ],
    },
    {
      title: "PASAL 3 — HARGA JUAL DAN KOMISI",
      paragraphs: [
        "Harga penawaran OBJEK PROPERTI adalah sebesar {{harga_tawar}}. Harga minimum yang disetujui PIHAK PERTAMA adalah sebesar {{harga_minimum}}, dan bersifat internal serta tidak boleh diungkapkan kepada calon pembeli tanpa persetujuan tertulis dari PIHAK PERTAMA.",
        "Atas keberhasilan pemasaran OBJEK PROPERTI, PIHAK KEDUA berhak menerima komisi sebesar {{komisi_persen}} dari nilai transaksi, setara dengan {{komisi_nominal}} untuk harga penawaran saat ini.",
        "Komisi sebagaimana dimaksud di atas menjadi hak PIHAK KEDUA dan dibayarkan pada saat terjadinya transaksi jual beli OBJEK PROPERTI, atau pada waktu lain yang disepakati secara tertulis oleh PARA PIHAK.",
        "Catatan komisi: {{catatan_komisi}}",
      ],
    },
    {
      title: "PASAL 4 — MASA BERLAKU PERJANJIAN",
      paragraphs: [
        "Perjanjian ini berlaku sejak tanggal {{tanggal_mulai}} sampai dengan tanggal {{tanggal_berakhir}}, untuk jangka waktu {{durasi_bulan}} bulan.",
        "Apabila sampai berakhirnya jangka waktu tersebut OBJEK PROPERTI belum terjual, PARA PIHAK dapat memperpanjang perjanjian ini melalui perjanjian baru yang ditandatangani secara sah oleh PARA PIHAK. Perjanjian perpanjangan dibuat sebagai dokumen tersendiri, bukan perubahan atas surat ini.",
        "Perjanjian ini berakhir dengan sendirinya apabila OBJEK PROPERTI telah terjual dan transaksi jual beli dinyatakan selesai oleh PARA PIHAK.",
      ],
    },
    {
      title: "PASAL 5 — KEWAJIBAN PIHAK PERTAMA",
      paragraphs: [
        "a. Menyediakan data dan dokumen OBJEK PROPERTI yang benar, lengkap, dan tidak menyesatkan, termasuk bukti kepemilikan, data luas, dan informasi kondisi bangunan.",
        "b. Menyatakan secara jujur apabila OBJEK PROPERTI sedang dijaminkan, disewakan, dalam sengketa, atau sedang dipasarkan oleh pihak lain.",
        "c. Memberikan akses yang wajar kepada PIHAK KEDUA dan calon pembeli untuk melakukan survei terhadap OBJEK PROPERTI, dengan pemberitahuan sebelumnya.",
        "d. Memberitahukan kepada PIHAK KEDUA secara tertulis apabila OBJEK PROPERTI terjual melalui pihak lain atau tidak lagi dijual.",
      ],
    },
    {
      title: "PASAL 6 — KEWAJIBAN PIHAK KEDUA",
      paragraphs: [
        "a. Melaksanakan pemasaran OBJEK PROPERTI secara profesional, jujur, dan sesuai dengan ketentuan peraturan perundang-undangan yang berlaku di bidang perantara properti.",
        "b. Menyampaikan informasi dan data OBJEK PROPERTI kepada calon pembeli secara benar dan tidak menyesatkan.",
        "c. Melaporkan perkembangan pemasaran kepada PIHAK PERTAMA secara berkala dan atas permintaan PIHAK PERTAMA.",
        "d. Menjaga rahasia harga minimum dan data internal PIHAK PERTAMA sebagaimana diatur dalam Pasal 7 perjanjian ini.",
        "e. Menyampaikan seluruh penawaran harga yang masuk dari calon pembeli kepada PIHAK PERTAMA untuk diputuskan.",
      ],
    },
    {
      title: "PASAL 7 — KERAHASIAAN DATA",
      paragraphs: [
        "PIHAK KEDUA wajib menjaga kerahasiaan seluruh data dan informasi yang diperoleh dari PIHAK PERTAMA dalam rangka perjanjian ini, termasuk namun tidak terbatas pada harga minimum, dokumen kepemilikan, dan data pribadi PIHAK PERTAMA.",
        "Kewajiban kerahasiaan ini tetap berlaku setelah berakhirnya perjanjian ini.",
      ],
    },
    {
      title: "PASAL 8 — PENGGANTIAN BIAYA",
      paragraphs: [
        "Segala biaya pemasaran, termasuk biaya promosi, dokumentasi, dan transportasi survei, ditanggung sepenuhnya oleh PIHAK KEDUA dan tidak dapat ditagihkan kepada PIHAK PERTAMA.",
        "PIHAK PERTAMA tidak berkewajiban mengganti biaya apapun yang telah dikeluarkan PIHAK KEDUA apabila OBJEK PROPERTI tidak terjual.",
      ],
    },
    {
      title: "PASAL 9 — PENYELESAIAN SENGKETA",
      paragraphs: [
        "Segala perselisihan yang timbul dari pelaksanaan perjanjian ini akan diselesaikan terlebih dahulu secara musyawarah untuk mencapai mufakat oleh PARA PIHAK.",
        "Apabila musyawarah tidak mencapai kesepakatan, PARA PIHAK sepakat untuk menyelesaikannya melalui jalur hukum yang berlaku di wilayah hukum Negara Republik Indonesia.",
      ],
    },
    {
      title: "PASAL 10 — LAIN-LAIN",
      paragraphs: [
        "Perjanjian ini dibuat dan ditandatangani secara elektronik oleh PARA PIHAK. PARA PIHAK menyatakan telah membaca, memahami, dan menyetujui seluruh isi perjanjian ini tanpa paksaan dari pihak manapun.",
        "Tanda tangan elektronik yang dibubuhkan pada perjanjian ini disertai dengan catatan waktu, alamat protokol internet, dan sidik jari dokumen yang tercatat pada sistem, sehingga keabsahan dokumen dapat diverifikasi.",
        "Hal-hal yang belum diatur dalam perjanjian ini akan ditentukan kemudian dalam addendum yang ditandatangani oleh PARA PIHAK dan menjadi bagian yang tidak terpisahkan dari perjanjian ini.",
      ],
    },
  ],
  closing:
    "Demikian perjanjian ini dibuat dan ditandatangani secara elektronik oleh PARA PIHAK pada tanggal sebagaimana tercatat pada sistem, dan mempunyai kekuatan hukum yang mengikat bagi PARA PIHAK.",
};
