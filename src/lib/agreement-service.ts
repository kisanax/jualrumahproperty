import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { incrementSequenceValue } from "./sequence-number";
import {
  AGREEMENT_SEQUENCE_NAME,
  formatAgreementNumber,
  durationMonths,
} from "./agreement-number";
import {
  buildAgreementVars,
  renderPassages,
  renderText,
  type AgreementPassage,
  type AgreementTemplateBody,
  EMPTY_PLACEHOLDER,
} from "./agreement-template";
import {
  computeEvidenceHash,
  computeFinalHash,
  generateAccessToken,
  hashSnapshot,
  sha256Buffer,
} from "./agreement-hash";

// =============================================================================
// SERVICE — SURAT PERJANJIAN PEMASARAN
//
// Titik kritis modul ini adalah `issueAgreement`: di sanalah isi surat
// DI-FREEZE. Setelah fungsi itu selesai, teks surat tidak akan pernah berubah
// lagi — semua perubahan berikutnya hanya menyentuh metadata (tanda tangan,
// status, arsip). Ini yang membuat surat yang sudah ditandatangani tetap bisa
// diverifikasi bertahun-tahun kemudian.
//
// Semua fungsi menerima `client` opsional agar bisa dipakai di dalam
// transaksi yang sudah berjalan (pola yang sama dengan sequence-number.ts).
// =============================================================================

type Db = PrismaClient;

/** Masa berlaku token tanda tangan untuk owner. */
const TOKEN_TTL_DAYS = 14;

export class AgreementError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "INVALID_STATE"
      | "ALREADY_SIGNED"
      | "TOKEN_INVALID"
      | "TOKEN_EXPIRED"
      | "MISSING_OWNER"
      | "DUPLICATE_ACTIVE"
  ) {
    super(message);
    this.name = "AgreementError";
  }
}

// =============================================================================
// SNAPSHOT
// =============================================================================

/**
 * Isi surat yang sudah final dan di-freeze.
 *
 * Teks surat disimpan SUDAH TER-RENDER (bukan template + variabel), sehingga
 * verifikasi tidak perlu menjalankan renderer lagi. Konsekuensinya: mengubah
 * template di kemudian hari TIDAK mengubah isi surat lama — persis yang
 * dibutuhkan dokumen legal.
 */
export type AgreementSnapshot = {
  v: 1;
  meta: {
    agreementNumber: string;
    issuedAt: string;
    templateName: string | null;
    templateVersion: number;
  };
  letter: {
    headerTitle: string;
    opening: string;
    body: AgreementPassage[];
    closing: string;
  };
  /** Nilai placeholder yang dipakai — membuat surat bisa direproduksi persis. */
  vars: Record<string, string>;
  parties: {
    owner: { name: string; phone: string | null; email: string | null; address: string | null };
    broker: { name: string; company: string | null; phone: string | null; email: string | null };
  };
  commercial: {
    listingNumber: string | null;
    askingPrice: string | null;
    minimumPrice: string | null;
    exclusive: boolean;
    commissionPercent: string | null;
    commissionAmount: string | null;
    commissionNotes: string | null;
  };
  period: {
    startDate: string;
    endDate: string;
    durationMonths: number;
    signedPlace: string | null;
  };
};

export function parseSnapshot(value: Prisma.JsonValue | null): AgreementSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { v?: unknown; letter?: unknown };
  if (candidate.v !== 1 || !candidate.letter) return null;
  return value as unknown as AgreementSnapshot;
}

// =============================================================================
// QUERY DASAR
// =============================================================================

export const agreementInclude = {
  listing: {
    include: {
      property: {
        include: {
          area: { include: { parent: { include: { parent: true } } } },
          village: true,
          propertyOwners: { include: { owner: true } },
        },
      },
    },
  },
  owner: true,
  broker: { include: { brokerProfile: true } },
  signatures: { orderBy: { signerRole: "asc" } },
  template: true,
} satisfies Prisma.MarketingAgreementInclude;

export type AgreementWithRelations = Prisma.MarketingAgreementGetPayload<{
  include: typeof agreementInclude;
}>;

/**
 * Status yang dianggap "masih hidup" — satu listing hanya boleh punya satu
 * perjanjian aktif pada satu waktu.
 */
const LIVE_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_SIGNED"] as const;

export async function findLiveAgreementForListing(listingId: string, db: Db = defaultPrisma) {
  return db.marketingAgreement.findFirst({
    where: { listingId, status: { in: [...LIVE_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
}

// =============================================================================
// TERBITKAN SURAT
// =============================================================================

export type IssueAgreementInput = {
  listingId: string;
  /** null = pakai owner utama (PropertyOwner.isPrimary) dari properti listing. */
  ownerId?: string | null;
  brokerUserId: string;
  startDate: Date;
  endDate: Date;
  exclusive: boolean;
  commissionPercent: number | null;
  commissionAmount: number | null;
  commissionNotes: string | null;
  signedPlace: string | null;
  templateId?: string | null;
};

/**
 * Terbitkan surat perjanjian: generate nomor, render template, freeze snapshot,
 * hitung contentHash, lalu buat dua slot tanda tangan (broker & owner).
 *
 * Dijalankan dalam satu transaksi, sehingga nomor surat tidak akan terpakai
 * bila pembuatan surat gagal.
 */
export async function issueAgreement(
  input: IssueAgreementInput,
  db: Db = defaultPrisma
): Promise<{ agreement: AgreementWithRelations; ownerSigningToken: string }> {
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: input.listingId },
      include: {
        property: {
          include: {
            area: { include: { parent: { include: { parent: true } } } },
            village: true,
            propertyOwners: { include: { owner: true } },
          },
        },
      },
    });

    if (!listing) throw new AgreementError("Listing tidak ditemukan", "NOT_FOUND");

    const existing = await tx.marketingAgreement.findFirst({
      where: { listingId: input.listingId, status: { in: [...LIVE_STATUSES] } },
    });
    if (existing) {
      throw new AgreementError(
        `Listing ini masih punya perjanjian aktif (${existing.agreementNumber}). ` +
          `Batalkan dulu sebelum menerbitkan yang baru.`,
        "DUPLICATE_ACTIVE"
      );
    }

    // Resolusi owner: eksplisit, atau owner utama properti.
    const ownerLink = input.ownerId
      ? listing.property.propertyOwners.find((po) => po.ownerId === input.ownerId)
      : listing.property.propertyOwners.find((po) => po.isPrimary) ??
        listing.property.propertyOwners[0];

    if (!ownerLink) {
      throw new AgreementError(
        "Properti ini belum punya data pemilik. Tambahkan owner terlebih dahulu " +
          "sebelum menerbitkan surat perjanjian.",
        "MISSING_OWNER"
      );
    }

    const [broker, template] = await Promise.all([
      tx.user.findUnique({
        where: { id: input.brokerUserId },
        include: { brokerProfile: true },
      }),
      input.templateId
        ? tx.agreementTemplate.findUnique({ where: { id: input.templateId } })
        : tx.agreementTemplate.findFirst({
            where: { isActive: true },
            orderBy: { version: "desc" },
          }),
    ]);

    if (!broker) throw new AgreementError("Broker tidak ditemukan", "NOT_FOUND");
    if (!template) {
      throw new AgreementError(
        "Belum ada template perjanjian aktif. Jalankan seed atau buat template dulu.",
        "INVALID_STATE"
      );
    }

    const issuedAt = new Date();
    const seq = await incrementSequenceValue(
      tx as Prisma.TransactionClient,
      AGREEMENT_SEQUENCE_NAME
    );
    const agreementNumber = formatAgreementNumber(seq, issuedAt);

    const area = listing.property.area;
    const vars = buildAgreementVars({
      agreementNumber,
      issuedAt,
      startDate: input.startDate,
      endDate: input.endDate,
      signedPlace: input.signedPlace,
      exclusive: input.exclusive,
      commissionPercent: input.commissionPercent,
      commissionAmount: input.commissionAmount,
      commissionNotes: input.commissionNotes,

      brokerName: broker.name ?? broker.email ?? "Broker",
      brokerCompany: broker.brokerProfile?.company ?? null,
      brokerType: broker.brokerProfile?.brokerType ?? null,
      brokerPhone: broker.brokerProfile?.phone ?? null,
      brokerEmail: broker.email,
      brokerCity: broker.brokerProfile?.city ?? null,
      brokerLicense: broker.brokerProfile?.licenseNumber ?? null,

      ownerName: ownerLink.owner.name,
      ownerPhone: ownerLink.owner.phone,
      ownerEmail: ownerLink.owner.email,
      ownerAddress: ownerLink.owner.address,
      ownerIdNumber: ownerLink.owner.idNumber,

      listingNumber: listing.listingNumber,
      askingPrice: listing.askingPrice === null ? null : Number(listing.askingPrice),
      minimumPrice: listing.minimumPrice === null ? null : Number(listing.minimumPrice),

      propertyCode: listing.property.code,
      propertyNumber: listing.property.propertyNumber,
      propertyType: listing.property.type,
      propertyAddress: listing.property.address,
      village: listing.property.village?.name ?? null,
      district: area?.name ?? null,
      city: area?.parent?.name ?? null,
      province: area?.parent?.parent?.name ?? null,
      landArea: listing.property.landArea,
      buildingArea: listing.property.buildingArea,
      bedrooms: listing.property.bedrooms,
      bathrooms: listing.property.bathrooms,
      yearBuilt: listing.property.yearBuilt,
      certificateType: listing.property.certificateType,
      certificateNo: listing.property.certificateNo,
    });

    const templateBody = template.body as unknown as AgreementTemplateBody;
    const renderedOpening = renderText(template.opening, vars);
    const renderedClosing = renderText(template.closing, vars);
    const renderedBody = renderPassages(templateBody ?? [], vars);

    const snapshot: AgreementSnapshot = {
      v: 1,
      meta: {
        agreementNumber,
        issuedAt: issuedAt.toISOString(),
        templateName: template.name,
        templateVersion: template.version,
      },
      letter: {
        headerTitle: renderText(template.headerTitle, vars).text,
        opening: renderedOpening.text,
        body: renderedBody.passages,
        closing: renderedClosing.text,
      },
      vars,
      parties: {
        owner: {
          name: ownerLink.owner.name,
          phone: ownerLink.owner.phone,
          email: ownerLink.owner.email,
          address: ownerLink.owner.address,
        },
        broker: {
          name: broker.name ?? EMPTY_PLACEHOLDER,
          company: broker.brokerProfile?.company ?? null,
          phone: broker.brokerProfile?.phone ?? null,
          email: broker.email,
        },
      },
      commercial: {
        listingNumber: listing.listingNumber,
        askingPrice: vars.harga_tawar,
        minimumPrice: vars.harga_minimum,
        exclusive: input.exclusive,
        commissionPercent: vars.komisi_persen,
        commissionAmount: vars.komisi_nominal,
        commissionNotes: input.commissionNotes,
      },
      period: {
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
        durationMonths: durationMonths(input.startDate, input.endDate),
        signedPlace: input.signedPlace,
      },
    };

    const contentHash = hashSnapshot(snapshot);

    const agreement = await tx.marketingAgreement.create({
      data: {
        agreementNumber,
        listingId: input.listingId,
        ownerId: ownerLink.ownerId,
        brokerUserId: input.brokerUserId,
        templateId: template.id,
        templateVersion: template.version,
        status: "ISSUED",
        exclusive: input.exclusive,
        commissionPercent:
          input.commissionPercent === null
            ? null
            : new Prisma.Decimal(input.commissionPercent),
        commissionAmount:
          input.commissionAmount === null
            ? null
            : new Prisma.Decimal(input.commissionAmount),
        commissionNotes: input.commissionNotes,
        startDate: input.startDate,
        endDate: input.endDate,
        signedPlace: input.signedPlace,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        contentHash,
        issuedAt,
      },
      include: agreementInclude,
    });

    // Dua slot tanda tangan. Token hanya dibuat untuk owner (kanal publik) —
    // broker menandatangani di dalam workspace yang sudah terautentikasi.
    const { token, tokenHash } = generateAccessToken();
    const tokenExpiresAt = new Date(issuedAt.getTime() + TOKEN_TTL_DAYS * 86_400_000);

    await tx.agreementSignature.createMany({
      data: [
        {
          agreementId: agreement.id,
          signerRole: "BROKER",
          signerName: broker.name ?? broker.email ?? "Broker",
          signerPhone: broker.brokerProfile?.phone ?? null,
          signerEmail: broker.email,
        },
        {
          agreementId: agreement.id,
          signerRole: "OWNER",
          signerName: ownerLink.owner.name,
          signerPhone: ownerLink.owner.phone,
          signerEmail: ownerLink.owner.email,
          accessTokenHash: tokenHash,
          tokenExpiresAt,
        },
      ],
    });

    // Baca ulang agar `signatures` sudah terisi di objek yang dikembalikan.
    const issued = await tx.marketingAgreement.findUniqueOrThrow({
      where: { id: agreement.id },
      include: agreementInclude,
    });

    // Token dikembalikan terpisah (bukan disisipkan ke objek agreement) supaya
    // pemanggil sadar bahwa nilai ini RAHASIA dan tidak boleh ikut ter-serialize
    // ke respons halaman mana pun.
    return { agreement: issued, ownerSigningToken: token };
  });
}

// =============================================================================
// TANDA TANGAN
// =============================================================================

export type SignAgreementInput = {
  signerRole: "BROKER" | "OWNER";
  method: "DRAWN" | "TYPED" | "CERTIFIED";
  /** PNG tanda tangan (untuk DRAWN). Null untuk TYPED. */
  signatureImage: Buffer | null;
  signatureImagePath: string | null;
  signerName: string;
  signerIp: string | null;
  signerUa: string | null;
  /** Waktu persetujuan dicentang penanda tangan. */
  consentAt: Date;
};

/**
 * Catat tanda tangan satu pihak beserta bundel buktinya.
 *
 * Bukti yang dikumpulkan (consent, waktu, IP, device, hash gambar) inilah yang
 * memberi bobot hukum pada tanda tangan elektronik tidak tersertifikasi —
 * gambar tanda tangannya sendiri tidak bernilai apa-apa.
 */
export async function signAgreement(
  agreementId: string,
  input: SignAgreementInput,
  db: Db = defaultPrisma
): Promise<{ agreement: AgreementWithRelations; finalized: boolean }> {
  return db.$transaction(async (tx) => {
    const agreement = await tx.marketingAgreement.findUnique({
      where: { id: agreementId },
      include: agreementInclude,
    });

    if (!agreement) throw new AgreementError("Perjanjian tidak ditemukan", "NOT_FOUND");
    if (agreement.status === "CANCELLED" || agreement.status === "EXPIRED") {
      throw new AgreementError(
        `Perjanjian sudah ${agreement.status.toLowerCase()} dan tidak bisa ditandatangani.`,
        "INVALID_STATE"
      );
    }
    if (!agreement.contentHash) {
      throw new AgreementError(
        "Perjanjian belum diterbitkan — isi surat belum difreeze.",
        "INVALID_STATE"
      );
    }

    const slot = agreement.signatures.find((s) => s.signerRole === input.signerRole);
    if (!slot) {
      throw new AgreementError(
        `Slot tanda tangan untuk ${input.signerRole} tidak ditemukan.`,
        "NOT_FOUND"
      );
    }
    if (slot.status === "SIGNED") {
      throw new AgreementError(
        "Pihak ini sudah menandatangani perjanjian.",
        "ALREADY_SIGNED"
      );
    }

    const signedAt = new Date();
    const signatureImageHash = input.signatureImage
      ? sha256Buffer(input.signatureImage)
      : null;

    // Bukti diikat ke contentHash → tanda tangan hanya sah untuk versi surat ini.
    const evidenceHash = computeEvidenceHash({
      contentHash: agreement.contentHash,
      signerRole: input.signerRole,
      signerName: input.signerName,
      signatureImageHash,
      method: input.method,
      consentAt: input.consentAt.toISOString(),
      signedAt: signedAt.toISOString(),
      signerIp: input.signerIp,
      signerUa: input.signerUa,
    });

    await tx.agreementSignature.update({
      where: { id: slot.id },
      data: {
        status: "SIGNED",
        method: input.method,
        signerName: input.signerName,
        signatureImagePath: input.signatureImagePath,
        signatureImageHash,
        consentAt: input.consentAt,
        signedAt,
        signerIp: input.signerIp,
        signerUa: input.signerUa,
        evidenceHash,
        // Token kanal publik mati setelah dipakai — sekali pakai.
        tokenUsedAt: input.signerRole === "OWNER" ? signedAt : slot.tokenUsedAt,
      },
    });

    const others = await tx.agreementSignature.findMany({
      where: { agreementId },
    });

    const allSigned = others.every((s) => s.status === "SIGNED");
    const anySigned = others.some((s) => s.status === "SIGNED");

    let finalHash: string | null = null;
    let archivedDocumentId: string | null = agreement.archivedDocumentId;

    if (allSigned) {
      finalHash = computeFinalHash({
        agreementNumber: agreement.agreementNumber,
        contentHash: agreement.contentHash,
        signatures: others.map((s) => ({
          signerRole: s.signerRole,
          evidenceHash: s.evidenceHash ?? "",
        })),
      });

      // Arsipkan ke tabel documents agar surat ikut terlihat di berkas properti.
      if (!archivedDocumentId) {
        const doc = await tx.document.create({
          data: {
            propertyId: agreement.listing.propertyId,
            type: "CONSIGNMENT_AGREEMENT",
            status: "AVAILABLE",
            referenceNo: agreement.agreementNumber,
            notes:
              `Surat perjanjian pemasaran dengan ${agreement.owner.name}. ` +
              `Berlaku ${agreement.startDate.toISOString().slice(0, 10)} s/d ` +
              `${agreement.endDate.toISOString().slice(0, 10)}.`,
          },
        });
        archivedDocumentId = doc.id;
      }
    }

    const updated = await tx.marketingAgreement.update({
      where: { id: agreementId },
      data: {
        status: allSigned ? "SIGNED" : anySigned ? "PARTIALLY_SIGNED" : "ISSUED",
        finalHash,
        signedAt: allSigned ? signedAt : null,
        archivedDocumentId,
      },
      include: agreementInclude,
    });

    return { agreement: updated, finalized: allSigned };
  });
}

// =============================================================================
// PEMBATALAN
// =============================================================================

export async function cancelAgreement(
  agreementId: string,
  reason: string,
  db: Db = defaultPrisma
): Promise<AgreementWithRelations> {
  const agreement = await db.marketingAgreement.findUnique({
    where: { id: agreementId },
  });
  if (!agreement) throw new AgreementError("Perjanjian tidak ditemukan", "NOT_FOUND");
  if (agreement.status === "SIGNED") {
    throw new AgreementError(
      "Perjanjian yang sudah ditandatangani lengkap tidak bisa dibatalkan. " +
        "Buat perjanjian baru atau addendum.",
      "INVALID_STATE"
    );
  }

  return db.marketingAgreement.update({
    where: { id: agreementId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    },
    include: agreementInclude,
  });
}
