import type { PrismaClient } from "@prisma/client";
import { getNextSequenceValue } from "./sequence-number";

// =============================================================================
// NOMOR SURAT PERJANJIAN PEMASARAN
//
// Format: {urut:3}/JRP-AGR/{bulan_romawi}/{tahun}   → "001/JRP-AGR/X/2026"
//
// Nomor TIDAK pernah didaur ulang. Surat yang dibatalkan tetap menghabiskan
// nomornya sehingga celah pada urutan menjadi jejak audit, bukan bug. Ini
// disengaja: surat legal harus punya nomor unik seumur hidup.
//
// Counter memakai tabel `sequence_counters` yang sama dengan penomoran
// properti/listing, dengan nama "agreement".
// =============================================================================

export const AGREEMENT_SEQUENCE_NAME = "agreement";

const ROMAN_MONTHS = [
  "I", "II", "III", "IV", "V", "VI",
  "VII", "VIII", "IX", "X", "XI", "XII",
] as const;

/** Nama bulan Indonesia — dipakai untuk penanggalan surat. */
export const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

/** "2026-10-07" → "7 Oktober 2026" */
export function formatTanggalIndonesia(date: Date): string {
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

/** Tanggal + jam lokal untuk audit trail: "7 Oktober 2026, 14:05:33 WIB" */
export function formatWaktuIndonesia(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const jam = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${formatTanggalIndonesia(date)}, ${jam} WIB`;
}

/**
 * Susun nomor surat dari nilai urut.
 * @param sequenceValue nilai counter (1 → "001")
 * @param date tanggal penerbitan — menentukan bulan romawi & tahun
 */
export function formatAgreementNumber(sequenceValue: number, date: Date): string {
  const urut = sequenceValue.toString().padStart(3, "0");
  return `${urut}/JRP-AGR/${ROMAN_MONTHS[date.getMonth()]}/${date.getFullYear()}`;
}

/**
 * Ambil nomor surat berikutnya. Increment atomic via `sequence_counters`,
 * aman untuk pemakaian bersamaan.
 */
export async function getNextAgreementNumber(
  prisma: PrismaClient,
  date: Date = new Date()
): Promise<string> {
  const seq = await getNextSequenceValue(prisma, AGREEMENT_SEQUENCE_NAME);
  return formatAgreementNumber(seq, date);
}

/**
 * Durasi dalam bulan antara dua tanggal.
 *
 * Tanggal yang sama persis satu tahun kemudian dihitung 12 bulan (bukan 13),
 * sedangkan hari yang sudah lewat dari tanggal mulai membulatkan ke atas —
 * 7 Okt → 8 Nov dihitung 2 bulan.
 */
export function durationMonths(start: Date, end: Date): number {
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() > start.getDate()) months += 1;
  if (months < 1) months = 1;
  return months;
}
