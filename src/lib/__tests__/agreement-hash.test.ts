import { describe, it, expect } from "vitest";
import {
  canonicalize,
  sha256,
  sha256Buffer,
  hashSnapshot,
  formatHashFingerprint,
  generateAccessToken,
  hashAccessToken,
  matchesAccessToken,
  computeEvidenceHash,
  computeFinalHash,
  verifyIntegrity,
} from "../agreement-hash";

// =============================================================================
// Unit Tests — Integritas Surat Perjanjian Pemasaran
//
// Fokus: membuktikan bahwa isi surat yang sudah ditandatangani TIDAK BISA
// berubah tanpa terdeteksi. Ini syarat UU ITE Pasal 11 agar tanda tangan
// elektronik tidak tersertifikasi punya bobot bukti.
// =============================================================================

describe("canonicalize", () => {
  it("harus menghasilkan string yang sama walau urutan key berbeda", () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("harus mengurutkan key bersarang secara rekursif", () => {
    const a = { outer: { z: 1, a: { y: 2, b: 3 } } };
    const b = { outer: { a: { b: 3, y: 2 }, z: 1 } };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("harus mempertahankan urutan elemen array (urutan array bermakna)", () => {
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it("harus menangani null dan nilai primitif", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize("teks")).toBe('"teks"');
    expect(canonicalize(0)).toBe("0");
  });
});

describe("sha256", () => {
  it("harus menghasilkan 64 karakter heksadesimal", () => {
    const hash = sha256("jualrumahproperty");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("harus deterministik", () => {
    expect(sha256("sama")).toBe(sha256("sama"));
  });

  it("harus berbeda untuk input yang berbeda", () => {
    expect(sha256("surat-a")).not.toBe(sha256("surat-b"));
  });
});

describe("hashSnapshot", () => {
  const snapshot = {
    nomor_surat: "001/JRP-AGR/X/2026",
    owner: { nama: "Budi Santoso" },
    komisi_persen: 2.5,
  };

  it("harus sama untuk isi yang sama dengan urutan key berbeda", () => {
    const reordered = {
      komisi_persen: 2.5,
      owner: { nama: "Budi Santoso" },
      nomor_surat: "001/JRP-AGR/X/2026",
    };
    expect(hashSnapshot(snapshot)).toBe(hashSnapshot(reordered));
  });

  it("harus berubah bila satu nilai berubah", () => {
    const changed = { ...snapshot, komisi_persen: 3 };
    expect(hashSnapshot(changed)).not.toBe(hashSnapshot(snapshot));
  });

  it("harus berubah bila nilai bersarang berubah", () => {
    const changed = { ...snapshot, owner: { nama: "Budi Santoso Jr" } };
    expect(hashSnapshot(changed)).not.toBe(hashSnapshot(snapshot));
  });
});

describe("formatHashFingerprint", () => {
  it("harus mengelompokkan hash jadi blok 4 karakter huruf besar", () => {
    const hash = "abcdef0123456789".padEnd(64, "0");
    expect(formatHashFingerprint(hash)).toBe("ABCD-EF01-2345-6789");
  });

  it("harus mengabaikan karakter non-hex", () => {
    expect(formatHashFingerprint("abcd-ef01-2345-6789")).toBe("ABCD-EF01-2345-6789");
  });
});

describe("token akses kanal publik", () => {
  it("harus menghasilkan token dan hash yang berbeda satu sama lain", () => {
    const { token, tokenHash } = generateAccessToken();
    expect(token).not.toBe(tokenHash);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("harus menghasilkan token unik untuk setiap pemanggilan", () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => generateAccessToken().token)
    );
    expect(tokens.size).toBe(50);
  });

  it("harus mencocokkan token dengan hash-nya", () => {
    const { token, tokenHash } = generateAccessToken();
    expect(matchesAccessToken(token, tokenHash)).toBe(true);
  });

  it("harus menolak token yang salah", () => {
    const { tokenHash } = generateAccessToken();
    const { token: other } = generateAccessToken();
    expect(matchesAccessToken(other, tokenHash)).toBe(false);
  });

  it("harus menolak token kosong / hash kosong tanpa melempar error", () => {
    const { tokenHash } = generateAccessToken();
    expect(matchesAccessToken("", tokenHash)).toBe(false);
    expect(matchesAccessToken("apa-saja", "")).toBe(false);
  });

  it("hash token harus deterministik untuk token yang sama", () => {
    const { token } = generateAccessToken();
    expect(hashAccessToken(token)).toBe(hashAccessToken(token));
  });
});

describe("computeEvidenceHash", () => {
  const base = {
    contentHash: sha256("isi-surat"),
    signerRole: "OWNER",
    signerName: "Budi Santoso",
    signatureImageHash: sha256Buffer(Buffer.from("png-palsu")),
    method: "DRAWN",
    consentAt: "2026-10-07T10:00:00.000Z",
    signedAt: "2026-10-07T10:01:00.000Z",
    signerIp: "103.10.10.10",
    signerUa: "Mozilla/5.0",
  };

  it("harus deterministik", () => {
    expect(computeEvidenceHash(base)).toBe(computeEvidenceHash(base));
  });

  it("harus berubah bila bukti consent berubah", () => {
    const changed = { ...base, consentAt: "2026-10-07T09:00:00.000Z" };
    expect(computeEvidenceHash(changed)).not.toBe(computeEvidenceHash(base));
  });

  it("harus berubah bila tanda tangan dari perangkat lain (UA berbeda)", () => {
    const changed = { ...base, signerUa: "Mobile Safari" };
    expect(computeEvidenceHash(changed)).not.toBe(computeEvidenceHash(base));
  });

  it("harus berubah bila gambar tanda tangan berbeda", () => {
    const changed = {
      ...base,
      signatureImageHash: sha256Buffer(Buffer.from("png-lain")),
    };
    expect(computeEvidenceHash(changed)).not.toBe(computeEvidenceHash(base));
  });

  it("harus berubah bila contentHash surat berbeda (ttd terikat ke versi surat)", () => {
    const changed = { ...base, contentHash: sha256("isi-surat-lain") };
    expect(computeEvidenceHash(changed)).not.toBe(computeEvidenceHash(base));
  });

  it("harus menerima signatureImageHash null untuk metode TYPED", () => {
    const typed = { ...base, method: "TYPED", signatureImageHash: null };
    expect(computeEvidenceHash(typed)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("computeFinalHash", () => {
  const contentHash = sha256("snapshot-surat");
  const sigBroker = { signerRole: "BROKER", evidenceHash: sha256("bukti-broker") };
  const sigOwner = { signerRole: "OWNER", evidenceHash: sha256("bukti-owner") };

  it("harus tidak bergantung urutan tanda tangan", () => {
    const forward = computeFinalHash({
      agreementNumber: "001/JRP-AGR/X/2026",
      contentHash,
      signatures: [sigBroker, sigOwner],
    });
    const reversed = computeFinalHash({
      agreementNumber: "001/JRP-AGR/X/2026",
      contentHash,
      signatures: [sigOwner, sigBroker],
    });
    expect(forward).toBe(reversed);
  });

  it("harus berubah bila salah satu bukti tanda tangan berubah", () => {
    const tampered = computeFinalHash({
      agreementNumber: "001/JRP-AGR/X/2026",
      contentHash,
      signatures: [sigBroker, { ...sigOwner, evidenceHash: sha256("bukti-palsu") }],
    });
    const original = computeFinalHash({
      agreementNumber: "001/JRP-AGR/X/2026",
      contentHash,
      signatures: [sigBroker, sigOwner],
    });
    expect(tampered).not.toBe(original);
  });

  it("harus berubah bila nomor surat berubah", () => {
    const other = computeFinalHash({
      agreementNumber: "002/JRP-AGR/X/2026",
      contentHash,
      signatures: [sigBroker, sigOwner],
    });
    const original = computeFinalHash({
      agreementNumber: "001/JRP-AGR/X/2026",
      contentHash,
      signatures: [sigBroker, sigOwner],
    });
    expect(other).not.toBe(original);
  });
});

describe("verifyIntegrity", () => {
  const snapshot = {
    nomor_surat: "001/JRP-AGR/X/2026",
    pasal: [{ title: "PASAL 1", paragraphs: ["Objek perjanjian..."] }],
  };
  const contentHash = hashSnapshot(snapshot);
  const sigBroker = {
    signerRole: "BROKER",
    evidenceHash: sha256("bukti-broker"),
  };
  const sigOwner = {
    signerRole: "OWNER",
    evidenceHash: sha256("bukti-owner"),
  };
  const finalHash = computeFinalHash({
    agreementNumber: "001/JRP-AGR/X/2026",
    contentHash,
    signatures: [sigBroker, sigOwner],
  });

  it("harus melaporkan utuh untuk surat final yang lengkap", () => {
    const result = verifyIntegrity({
      agreementNumber: "001/JRP-AGR/X/2026",
      snapshot,
      storedContentHash: contentHash,
      signatures: [sigBroker, sigOwner],
      storedFinalHash: finalHash,
    });
    expect(result).toEqual({ contentIntact: true, finalIntact: true });
  });

  it("harus mendeteksi isi surat yang diubah", () => {
    const result = verifyIntegrity({
      agreementNumber: "001/JRP-AGR/X/2026",
      snapshot: { ...snapshot, nomor_surat: "001/JRP-AGR/X/2026 (diubah)" },
      storedContentHash: contentHash,
      signatures: [sigBroker, sigOwner],
      storedFinalHash: finalHash,
    });
    expect(result.contentIntact).toBe(false);
  });

  it("harus mendeteksi isi pasal yang diubah tanpa mengubah struktur", () => {
    const result = verifyIntegrity({
      agreementNumber: "001/JRP-AGR/X/2026",
      snapshot: {
        ...snapshot,
        pasal: [{ title: "PASAL 1", paragraphs: ["DIUBAH SETELAH TTD"] }],
      },
      storedContentHash: contentHash,
      signatures: [sigBroker, sigOwner],
      storedFinalHash: finalHash,
    });
    expect(result.contentIntact).toBe(false);
  });

  it("harus mendeteksi bukti tanda tangan yang diganti", () => {
    const result = verifyIntegrity({
      agreementNumber: "001/JRP-AGR/X/2026",
      snapshot,
      storedContentHash: contentHash,
      signatures: [sigBroker, { ...sigOwner, evidenceHash: sha256("palsu") }],
      storedFinalHash: finalHash,
    });
    expect(result.contentIntact).toBe(true);
    expect(result.finalIntact).toBe(false);
  });

  it("harus mengembalikan finalIntact null bila surat belum lengkap", () => {
    const result = verifyIntegrity({
      agreementNumber: "001/JRP-AGR/X/2026",
      snapshot,
      storedContentHash: contentHash,
      signatures: [sigBroker, { signerRole: "OWNER", evidenceHash: null }],
      storedFinalHash: null,
    });
    expect(result.contentIntact).toBe(true);
    expect(result.finalIntact).toBeNull();
  });

  it("harus menandai finalIntact false bila finalHash ada tapi tanda tangan belum lengkap", () => {
    const result = verifyIntegrity({
      agreementNumber: "001/JRP-AGR/X/2026",
      snapshot,
      storedContentHash: contentHash,
      signatures: [sigBroker, { signerRole: "OWNER", evidenceHash: null }],
      storedFinalHash: finalHash,
    });
    expect(result.finalIntact).toBe(false);
  });

  it("harus melaporkan contentIntact false bila contentHash belum ada", () => {
    const result = verifyIntegrity({
      agreementNumber: "001/JRP-AGR/X/2026",
      snapshot,
      storedContentHash: null,
      signatures: [],
      storedFinalHash: null,
    });
    expect(result.contentIntact).toBe(false);
  });
});
