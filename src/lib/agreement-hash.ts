import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// =============================================================================
// INTEGRITAS SURAT PERJANJIAN PEMASARAN
//
// Tanda tangan elektronik tidak tersertifikasi (PP 71/2019 Pasal 60 ayat (2))
// tetap sah sebagai alat bukti, TAPI hanya kalau perubahan isi surat bisa
// dideteksi. Modul ini yang menyediakan jaminan itu:
//
//   contentHash  — sidik jari isi surat, dihitung saat surat DITERBITKAN.
//                  Isi surat di-freeze, jadi hash ini harus stabil selamanya.
//   evidenceHash — sidik jari bundel bukti satu pihak (consent, waktu, device,
//                  gambar tanda tangan).
//   finalHash    — sidik jari surat final = contentHash + semua tanda tangan.
//
// Semua hash memakai SHA-256 dan representasi heksadesimal 64 karakter agar
// bisa disimpan di kolom @db.VarChar(64).
// =============================================================================

/**
 * Serialisasi kanonik: urutkan key objek secara rekursif, lalu JSON.stringify.
 *
 * JSON.stringify biasa bergantung urutan key saat objek dibuat, sehingga hash
 * bisa berubah walau isinya identik. Untuk hash yang stabil dan bisa
 * diverifikasi ulang bertahun-tahun kemudian, urutan key harus dipaksa.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value === null || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    sorted[key] = sortDeep(source[key]);
  }
  return sorted;
}

/** SHA-256 dari sebuah string, sebagai hex 64 karakter. */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** SHA-256 dari sebuah buffer biner (misal gambar tanda tangan PNG). */
export function sha256Buffer(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Hash isi surat yang sudah di-freeze (snapshot). */
export function hashSnapshot(snapshot: unknown): string {
  return sha256(canonicalize(snapshot));
}

/**
 * Longgarkan karakter hash agar mudah dibaca/dibaca ulang manusia di surat
 * cetak: "A1B2C3D4..." → "A1B2-C3D4-...". Hanya untuk TAMPILAN — nilai yang
 * disimpan dan diverifikasi tetap hex penuh tanpa tanda hubung.
 */
export function formatHashFingerprint(hash: string, groups = 4): string {
  const clean = hash.replace(/[^0-9a-f]/gi, "").toUpperCase();
  const chunks = clean.slice(0, groups * 4).match(/.{1,4}/g) ?? [];
  return chunks.join("-");
}

// =============================================================================
// TOKEN AKSES KANAL PUBLIK
//
// Owner properti tidak punya akun (model Owner tidak terhubung ke User), jadi
// ia menandatangani lewat link bertoken. Token HANYA disimpan sebagai hash —
// sehingga bocornya isi database tidak langsung memberi akses tanda tangan.
// =============================================================================

/** Buat token akses baru. Kembalikan token mentah (untuk link) + hash (untuk DB). */
export function generateAccessToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAccessToken(token) };
}

/** Hash token akses untuk disimpan/dicocokkan. */
export function hashAccessToken(token: string): string {
  return sha256(`jrp-agreement-token:${token}`);
}

/** Bandingkan token dengan hash tersimpan memakai perbandingan waktu-konstan. */
export function matchesAccessToken(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashAccessToken(token), "utf8");
  const stored = Buffer.from(storedHash, "utf8");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

// =============================================================================
// BUNDEL BUKTI TANDA TANGAN
// =============================================================================

export type SignatureEvidenceInput = {
  /** Hash isi surat — mengikat tanda tangan ke versi surat yang tepat. */
  contentHash: string;
  signerRole: string;
  signerName: string;
  /** Hash gambar tanda tangan (sha256Buffer dari PNG) — null bila metode TYPED. */
  signatureImageHash: string | null;
  method: string;
  /** Waktu persetujuan dicentang. */
  consentAt: string;
  /** Waktu tanda tangan dikirim. */
  signedAt: string;
  signerIp: string | null;
  signerUa: string | null;
};

/**
 * Hash bundel bukti satu pihak.
 *
 * Menyertakan contentHash berarti bukti ini terikat ke isi surat tertentu —
 * kalau isi surat berbeda, bundel buktinya tidak akan pernah cocok.
 */
export function computeEvidenceHash(input: SignatureEvidenceInput): string {
  return sha256(
    canonicalize({
      v: 1,
      contentHash: input.contentHash,
      signerRole: input.signerRole,
      signerName: input.signerName,
      signatureImageHash: input.signatureImageHash,
      method: input.method,
      consentAt: input.consentAt,
      signedAt: input.signedAt,
      signerIp: input.signerIp,
      signerUa: input.signerUa,
    })
  );
}

export type FinalHashInput = {
  agreementNumber: string;
  contentHash: string;
  /** Harus diurutkan stabil (mis. oleh signerRole) agar hasilnya deterministik. */
  signatures: { signerRole: string; evidenceHash: string }[];
};

/** Hash surat final setelah SEMUA pihak menandatangani. */
export function computeFinalHash(input: FinalHashInput): string {
  const signatures = [...input.signatures].sort((a, b) =>
    a.signerRole.localeCompare(b.signerRole)
  );
  return sha256(
    canonicalize({
      v: 1,
      agreementNumber: input.agreementNumber,
      contentHash: input.contentHash,
      signatures,
    })
  );
}

/**
 * Verifikasi integritas surat: hitung ulang dan bandingkan.
 * Dipakai halaman verifikasi publik dan saat surat hendak dicetak.
 */
export function verifyIntegrity({
  agreementNumber,
  snapshot,
  storedContentHash,
  signatures,
  storedFinalHash,
}: {
  agreementNumber: string;
  snapshot: unknown;
  storedContentHash: string | null;
  signatures: { signerRole: string; evidenceHash: string | null }[];
  storedFinalHash: string | null;
}): { contentIntact: boolean; finalIntact: boolean | null } {
  const intact =
    !!storedContentHash && hashSnapshot(snapshot) === storedContentHash;

  // finalHash hanya ada setelah semua pihak menandatangani.
  // null = surat belum final (bukan berarti rusak).
  if (!storedFinalHash) return { contentIntact: intact, finalIntact: null };

  const complete = signatures.every((s) => !!s.evidenceHash);
  if (!complete) return { contentIntact: intact, finalIntact: false };

  const recomputed = computeFinalHash({
    agreementNumber,
    contentHash: storedContentHash as string,
    signatures: signatures.map((s) => ({
      signerRole: s.signerRole,
      evidenceHash: s.evidenceHash as string,
    })),
  });

  return { contentIntact: intact, finalIntact: recomputed === storedFinalHash };
}
