import { describe, it, expect } from "vitest";
import {
  formatAgreementNumber,
  formatTanggalIndonesia,
  formatWaktuIndonesia,
  durationMonths,
} from "../agreement-number";
import {
  renderText,
  renderPassages,
  buildAgreementVars,
  formatRupiah,
  AGREEMENT_PLACEHOLDERS,
  DEFAULT_AGREEMENT_TEMPLATE,
  EMPTY_PLACEHOLDER,
  type AgreementVarsInput,
} from "../agreement-template";

// =============================================================================
// Unit Tests — Penomoran & Template Surat Perjanjian Pemasaran
// =============================================================================

describe("formatAgreementNumber", () => {
  it("harus memformat nomor dengan urut 3 digit, bulan romawi, dan tahun", () => {
    expect(formatAgreementNumber(1, new Date(2026, 9, 7))).toBe("001/JRP-AGR/X/2026");
  });

  it("harus memakai bulan romawi yang benar untuk setiap bulan", () => {
    const expected = [
      "I", "II", "III", "IV", "V", "VI",
      "VII", "VIII", "IX", "X", "XI", "XII",
    ];
    expected.forEach((roman, monthIndex) => {
      const nomor = formatAgreementNumber(5, new Date(2026, monthIndex, 15));
      expect(nomor).toBe(`005/JRP-AGR/${roman}/2026`);
    });
  });

  it("harus melanjutkan urutan tanpa padding berlebih di atas 999", () => {
    expect(formatAgreementNumber(1000, new Date(2026, 0, 1))).toBe(
      "1000/JRP-AGR/I/2026"
    );
  });

  it("harus menaikkan urutan secara monotonik", () => {
    const date = new Date(2026, 9, 7);
    const numbers = [1, 2, 3, 10, 42].map((n) => formatAgreementNumber(n, date));
    expect(numbers).toEqual([
      "001/JRP-AGR/X/2026",
      "002/JRP-AGR/X/2026",
      "003/JRP-AGR/X/2026",
      "010/JRP-AGR/X/2026",
      "042/JRP-AGR/X/2026",
    ]);
  });
});

describe("formatTanggalIndonesia", () => {
  it("harus memformat tanggal tanpa leading zero", () => {
    expect(formatTanggalIndonesia(new Date(2026, 9, 7))).toBe("7 Oktober 2026");
  });

  it("harus memakai nama bulan Indonesia", () => {
    expect(formatTanggalIndonesia(new Date(2026, 0, 1))).toBe("1 Januari 2026");
    expect(formatTanggalIndonesia(new Date(2026, 11, 31))).toBe("31 Desember 2026");
  });
});

describe("formatWaktuIndonesia", () => {
  it("harus menyertakan jam menit detik dengan padding", () => {
    const hasil = formatWaktuIndonesia(new Date(2026, 9, 7, 9, 5, 3));
    expect(hasil).toBe("7 Oktober 2026, 09:05:03 WIB");
  });
});

describe("durationMonths", () => {
  it("harus menghitung tepat 12 bulan untuk rentang satu tahun", () => {
    expect(durationMonths(new Date(2026, 9, 7), new Date(2027, 9, 7))).toBe(12);
  });

  it("harus membulatkan ke atas bila tanggal akhir melewati tanggal mulai", () => {
    expect(durationMonths(new Date(2026, 9, 7), new Date(2026, 10, 8))).toBe(2);
  });

  it("harus menghitung 3 bulan untuk Okt → Jan", () => {
    expect(durationMonths(new Date(2026, 9, 7), new Date(2027, 0, 7))).toBe(3);
  });

  it("harus minimal 1 bulan walau rentangnya kurang dari sebulan", () => {
    expect(durationMonths(new Date(2026, 9, 7), new Date(2026, 9, 10))).toBe(1);
  });
});

describe("renderText", () => {
  it("harus mengganti placeholder yang dikenal", () => {
    const result = renderText("Nomor: {{nomor_surat}}", {
      nomor_surat: "001/JRP-AGR/X/2026",
    });
    expect(result.text).toBe("Nomor: 001/JRP-AGR/X/2026");
    expect(result.unknownKeys).toEqual([]);
  });

  it("harus toleran terhadap spasi di dalam kurung kurawal", () => {
    expect(renderText("{{ nama_owner }}", { nama_owner: "Budi" }).text).toBe("Budi");
  });

  it("harus menoleransi placeholder berhuruf besar", () => {
    expect(renderText("{{NAMA_OWNER}}", { nama_owner: "Budi" }).text).toBe("Budi");
  });

  it("harus MEMBIARKAN placeholder tak dikenal apa adanya dan melaporkannya", () => {
    const result = renderText("Halo {{nama_salah_ketik}}", { nama_owner: "Budi" });
    expect(result.text).toBe("Halo {{nama_salah_ketik}}");
    expect(result.unknownKeys).toEqual(["nama_salah_ketik"]);
  });

  it("harus mengganti placeholder yang sama berulang kali", () => {
    const result = renderText("{{a}} dan {{a}}", { a: "X" });
    expect(result.text).toBe("X dan X");
  });

  it("harus melaporkan setiap key tak dikenal satu kali saja", () => {
    const result = renderText("{{x}} {{x}} {{y}}", {});
    expect(result.unknownKeys.sort()).toEqual(["x", "y"]);
  });

  it("harus mengembalikan teks apa adanya bila tidak ada placeholder", () => {
    const result = renderText("Tanpa placeholder.", {});
    expect(result.text).toBe("Tanpa placeholder.");
    expect(result.unknownKeys).toEqual([]);
  });
});

describe("renderPassages", () => {
  it("harus merender judul dan seluruh paragraf", () => {
    const result = renderPassages(
      [
        { title: "PASAL {{n}}", paragraphs: ["Nilai {{v}}."] },
        { title: "PASAL 2", paragraphs: ["Tanpa variabel."] },
      ],
      { n: "1", v: "100" }
    );
    expect(result.passages).toEqual([
      { title: "PASAL 1", paragraphs: ["Nilai 100."] },
      { title: "PASAL 2", paragraphs: ["Tanpa variabel."] },
    ]);
    expect(result.unknownKeys).toEqual([]);
  });

  it("harus mengumpulkan key tak dikenal dari judul maupun paragraf", () => {
    const result = renderPassages(
      [{ title: "{{judul_salah}}", paragraphs: ["{{isi_salah}}"] }],
      {}
    );
    expect(result.unknownKeys.sort()).toEqual(["isi_salah", "judul_salah"]);
  });
});

describe("formatRupiah", () => {
  it("harus memformat dengan pemisah ribuan Indonesia", () => {
    expect(formatRupiah(5000000000)).toBe("Rp5.000.000.000");
  });

  it("harus mengembalikan tanda kosong untuk null/undefined", () => {
    expect(formatRupiah(null)).toBe(EMPTY_PLACEHOLDER);
    expect(formatRupiah(undefined)).toBe(EMPTY_PLACEHOLDER);
  });

  it("harus membulatkan nilai desimal", () => {
    expect(formatRupiah(1500000.7)).toBe("Rp1.500.001");
  });

  it("harus menangani nol sebagai nilai sah", () => {
    expect(formatRupiah(0)).toBe("Rp0");
  });
});

// =============================================================================
// Nilai placeholder — memastikan surat cetak tidak pernah bolong
// =============================================================================

const baseVars: AgreementVarsInput = {
  agreementNumber: "001/JRP-AGR/X/2026",
  issuedAt: new Date(2026, 9, 7),
  startDate: new Date(2026, 9, 7),
  endDate: new Date(2027, 9, 7),
  signedPlace: "Jakarta Selatan",
  exclusive: false,
  commissionPercent: 2.5,
  commissionAmount: 125000000,
  commissionNotes: null,

  brokerName: "Rizky Ramadhan",
  brokerCompany: null,
  brokerType: "INDEPENDENT",
  brokerPhone: "08123456789",
  brokerEmail: "rizky@example.com",
  brokerCity: "Jakarta Selatan",
  brokerLicense: null,

  ownerName: "Budi Santoso",
  ownerPhone: "08987654321",
  ownerEmail: null,
  ownerAddress: null,
  ownerIdNumber: null,

  listingNumber: "500001-4",
  askingPrice: 5000000000,
  minimumPrice: 4800000000,

  propertyCode: "317407-0001",
  propertyNumber: "100001-7",
  propertyType: "HOUSE",
  propertyAddress: "Jl. Kemang Selatan No. 10",
  village: "Cilandak Barat",
  district: "Cilandak",
  city: "Kota Administrasi Jakarta Selatan",
  province: "DKI Jakarta",
  landArea: 250,
  buildingArea: 180,
  bedrooms: 4,
  bathrooms: 3,
  yearBuilt: 2015,
  certificateType: "SHM",
  certificateNo: null,
};

describe("buildAgreementVars", () => {
  const vars = buildAgreementVars(baseVars);

  it("harus mengisi seluruh placeholder yang ada di katalog", () => {
    const missing = AGREEMENT_PLACEHOLDERS.filter((p) => vars[p.key] === undefined);
    expect(missing).toEqual([]);
  });

  it("harus mengubah nilai kosong menjadi tanda kosong, bukan string kosong", () => {
    expect(vars.perusahaan_broker).toBe(EMPTY_PLACEHOLDER);
    expect(vars.email_owner).toBe(EMPTY_PLACEHOLDER);
    expect(vars.nomor_sertifikat).toBe(EMPTY_PLACEHOLDER);
    expect(vars.nomor_ktp_owner).toBe(EMPTY_PLACEHOLDER);
  });

  it("harus TIDAK punya key di luar katalog (penjaga salah ketik nama variabel)", () => {
    const catalogKeys = new Set(AGREEMENT_PLACEHOLDERS.map((p) => p.key));
    const strayKeys = Object.keys(vars).filter((k) => !catalogKeys.has(k));
    expect(strayKeys).toEqual([]);
  });

  it("harus tidak pernah menghasilkan string kosong untuk nilai apa pun", () => {
    const blanks = Object.entries(vars).filter(([, v]) => v.trim() === "");
    expect(blanks).toEqual([]);
  });

  it("harus menerjemahkan jenis properti dan sertifikat ke bahasa Indonesia", () => {
    expect(vars.jenis_properti).toBe("Rumah");
    expect(vars.jenis_sertifikat).toBe("Sertifikat Hak Milik (SHM)");
    expect(vars.jabatan_broker).toBe("Broker Independen");
  });

  it("harus memformat harga sebagai rupiah", () => {
    expect(vars.harga_tawar).toBe("Rp5.000.000.000");
    expect(vars.harga_minimum).toBe("Rp4.800.000.000");
    expect(vars.komisi_nominal).toBe("Rp125.000.000");
  });

  it("harus memformat komisi persen dengan tanda persen", () => {
    expect(vars.komisi_persen).toBe("2,5%");
  });

  it("harus menandai perjanjian sebagai Non-Eksklusif bila exclusive false", () => {
    expect(vars.sifat_perjanjian).toBe("Non-Eksklusif");
    expect(buildAgreementVars({ ...baseVars, exclusive: true }).sifat_perjanjian).toBe(
      "Eksklusif"
    );
  });

  it("harus menghitung durasi bulan dari tanggal mulai dan berakhir", () => {
    expect(vars.durasi_bulan).toBe("12");
  });

  it("harus menangani komisi persen null tanpa melempar error", () => {
    const tanpaKomisi = buildAgreementVars({ ...baseVars, commissionPercent: null });
    expect(tanpaKomisi.komisi_persen).toBe(EMPTY_PLACEHOLDER);
  });

  it("harus menangani luas dan jumlah kamar null", () => {
    const sebagian = buildAgreementVars({
      ...baseVars,
      landArea: null,
      bedrooms: null,
      yearBuilt: null,
    });
    expect(sebagian.luas_tanah).toBe(EMPTY_PLACEHOLDER);
    expect(sebagian.kamar_tidur).toBe(EMPTY_PLACEHOLDER);
    expect(sebagian.tahun_dibangun).toBe(EMPTY_PLACEHOLDER);
  });
});

// =============================================================================
// Template default — memastikan surat bisa dicetak tanpa placeholder menggantung
// =============================================================================

describe("DEFAULT_AGREEMENT_TEMPLATE", () => {
  const vars = buildAgreementVars(baseVars);
  const opening = renderText(DEFAULT_AGREEMENT_TEMPLATE.opening, vars);
  const closing = renderText(DEFAULT_AGREEMENT_TEMPLATE.closing, vars);
  const body = renderPassages(DEFAULT_AGREEMENT_TEMPLATE.body, vars);

  it("harus merender pembuka tanpa placeholder tak dikenal", () => {
    expect(opening.unknownKeys).toEqual([]);
  });

  it("harus merender penutup tanpa placeholder tak dikenal", () => {
    expect(closing.unknownKeys).toEqual([]);
  });

  it("harus merender seluruh pasal tanpa placeholder tak dikenal", () => {
    expect(body.unknownKeys).toEqual([]);
  });

  it("harus tidak menyisakan kurung kurawal pada hasil render", () => {
    const semua = [
      opening.text,
      closing.text,
      ...body.passages.flatMap((p) => [p.title, ...p.paragraphs]),
    ].join("\n");
    expect(semua).not.toMatch(/\{\{|\}\}/);
  });

  it("harus memuat identitas kedua pihak, properti, harga, dan komisi", () => {
    const semua = [
      opening.text,
      ...body.passages.flatMap((p) => [p.title, ...p.paragraphs]),
    ].join("\n");
    expect(semua).toContain("Budi Santoso");
    expect(semua).toContain("Rizky Ramadhan");
    expect(semua).toContain("317407-0001");
    expect(semua).toContain("Jl. Kemang Selatan No. 10");
    expect(semua).toContain("Rp5.000.000.000");
    expect(semua).toContain("2,5%");
  });

  it("harus punya minimal 10 pasal berurutan", () => {
    expect(DEFAULT_AGREEMENT_TEMPLATE.body.length).toBeGreaterThanOrEqual(10);
    DEFAULT_AGREEMENT_TEMPLATE.body.forEach((passage, index) => {
      expect(passage.title).toContain(`PASAL ${index + 1}`);
    });
  });

  it("harus memuat klausul tanda tangan elektronik di pasal terakhir", () => {
    const terakhir = DEFAULT_AGREEMENT_TEMPLATE.body.at(-1)!;
    expect(terakhir.paragraphs.join(" ")).toContain("Tanda tangan elektronik");
  });
});
