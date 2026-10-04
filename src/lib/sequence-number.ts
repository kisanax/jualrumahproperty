import { PrismaClient, Prisma } from "@prisma/client";

// =============================================================================
// PENOMORAN PUBLIK — Property Number & Listing Number
//
// Setiap properti/listing mendapat nomor publik unik yang TERPISAH dari
// primary key database. Nomor ini menggunakan counter independen yang
// di-increment secara atomic + Luhn check digit untuk deteksi salah ketik.
//
// Format tampilan: "{nomor_urut}-{check_digit}"
// Contoh: 100001-7, 500001-4
// =============================================================================

const SEQUENCE_NAMES = {
  PROPERTY: "property",
  LISTING: "listing",
} as const;

// =============================================================================
// LUHN CHECK DIGIT
// =============================================================================

/**
 * Hitung 1 digit check digit menggunakan algoritma Luhn.
 *
 * Langkah:
 * 1. Mulai dari digit PALING KANAN, gandakan (×2) setiap digit di posisi
 *    genap (posisi ke-2, ke-4, ke-6, dst dari kanan).
 * 2. Jika hasil ×2 > 9, kurangi 9.
 * 3. Jumlahkan semua digit.
 * 4. Check digit = (10 - (total % 10)) % 10
 *
 * @param numberString - String angka (nomor urut), contoh: "100001"
 * @returns Check digit (0–9)
 */
export function calculateLuhnCheckDigit(numberString: string): number {
  let sum = 0;
  let shouldDouble = true; // mulai dari digit paling kanan

  for (let i = numberString.length - 1; i >= 0; i--) {
    let digit = parseInt(numberString[i], 10);

    if (shouldDouble) {
      digit = digit * 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Format nomor urut menjadi nomor publik: "{nomor_urut}-{check_digit}"
 *
 * @param sequenceValue - Nomor urut (contoh: 100001)
 * @returns Nomor publik lengkap (contoh: "100001-7")
 */
export function formatPublicNumber(sequenceValue: number): string {
  const numberString = sequenceValue.toString();
  const checkDigit = calculateLuhnCheckDigit(numberString);
  return `${numberString}-${checkDigit}`;
}

/**
 * Validasi nomor publik: cek apakah check digit di akhir cocok dengan
 * hasil perhitungan Luhn dari nomor urutnya.
 *
 * Dipakai untuk validasi input manual — misal admin/broker ketik nomor
 * di kolom pencarian, sistem bisa langsung tahu kalau ada salah ketik
 * sebelum query ke database.
 *
 * @param fullNumber - Nomor lengkap format "XXXXXX-Y" (contoh: "100001-7")
 * @returns true jika valid, false jika format salah atau check digit tidak cocok
 */
export function validateCheckDigit(fullNumber: string): boolean {
  // Harus format "angka-angka" dengan tepat 1 digit di belakang dash
  const match = fullNumber.match(/^(\d+)-(\d)$/);
  if (!match) return false;

  const numberPart = match[1];
  const providedCheckDigit = parseInt(match[2], 10);

  const expectedCheckDigit = calculateLuhnCheckDigit(numberPart);

  return providedCheckDigit === expectedCheckDigit;
}

// =============================================================================
// ATOMIC SEQUENCE INCREMENT (Database)
// =============================================================================

/**
 * Increment counter secara atomic dan kembalikan nilai baru.
 *
 * Mekanisme: UPDATE ... SET current_value = current_value + 1 dalam
 * transaksi MySQL. UPDATE secara default mengakuisisi exclusive row lock,
 * sehingga aman untuk concurrent access.
 *
 * @param prisma - PrismaClient instance
 * @param sequenceName - Nama counter ("property" atau "listing")
 * @returns Nilai sequence yang baru (setelah increment)
 * @throws Error jika counter tidak ditemukan
 */
/**
 * Increment counter secara atomic dan kembalikan nilai baru.
 *
 * Menerima `Prisma.TransactionClient` sehingga bisa dipakai DI DALAM transaksi
 * yang sudah berjalan (misal pada bulk import) tanpa nested transaction.
 *
 * Mekanisme: UPDATE ... SET current_value = current_value + 1. MySQL UPDATE
 * mengakuisisi exclusive row lock sehingga aman untuk concurrent access.
 *
 * @param tx - Transaction client (atau PrismaClient instance)
 * @param sequenceName - Nama counter ("property" atau "listing")
 * @returns Nilai sequence yang baru (setelah increment)
 * @throws Error jika counter tidak ditemukan
 */
export async function incrementSequenceValue(
  tx: Prisma.TransactionClient,
  sequenceName: string
): Promise<number> {
  // Atomic increment — UPDATE mengakuisisi exclusive lock pada row
  const affected = await tx.$executeRaw`
    UPDATE sequence_counters
    SET current_value = current_value + 1
    WHERE name = ${sequenceName}
  `;

  if (affected === 0) {
    throw new Error(
      `Sequence counter "${sequenceName}" tidak ditemukan di tabel sequence_counters. ` +
        `Pastikan sudah di-seed.`
    );
  }

  // Baca nilai yang sudah di-increment
  const result = await tx.$queryRaw<{ current_value: bigint }[]>`
    SELECT current_value FROM sequence_counters
    WHERE name = ${sequenceName}
  `;

  if (!result.length) {
    throw new Error(
      `Gagal membaca sequence counter "${sequenceName}" setelah increment.`
    );
  }

  return Number(result[0].current_value);
}

/**
 * Wrapper untuk increment counter di luar transaksi yang sudah ada.
 *
 * @param prisma - PrismaClient instance
 * @param sequenceName - Nama counter ("property" atau "listing")
 * @returns Nilai sequence yang baru (setelah increment)
 */
export async function getNextSequenceValue(
  prisma: PrismaClient,
  sequenceName: string
): Promise<number> {
  return prisma.$transaction((tx) => incrementSequenceValue(tx, sequenceName));
}

/**
 * Generate nomor properti publik berikutnya.
 *
 * Counter "property" dimulai dari 100000, sehingga nomor pertama = 100001.
 *
 * @param prisma - PrismaClient instance
 * @returns Nomor properti lengkap siap pakai (contoh: "100001-7")
 */
export async function getNextPropertyNumber(
  prisma: PrismaClient
): Promise<string> {
  const seq = await getNextSequenceValue(prisma, SEQUENCE_NAMES.PROPERTY);
  return formatPublicNumber(seq);
}

/**
 * Generate nomor listing publik berikutnya.
 *
 * Counter "listing" dimulai dari 500000, sehingga nomor pertama = 500001.
 *
 * @param prisma - PrismaClient instance
 * @returns Nomor listing publik lengkap dengan check digit (contoh: "500001-3")
 */
export async function getNextListingNumber(
  prisma: PrismaClient
): Promise<string> {
  const seq = await getNextSequenceValue(prisma, SEQUENCE_NAMES.LISTING);
  return formatPublicNumber(seq);
}
