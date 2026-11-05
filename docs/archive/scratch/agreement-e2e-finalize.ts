import { prisma } from "../src/lib/prisma";
import { signAgreement } from "../src/lib/agreement-service";
import { verifyIntegrity } from "../src/lib/agreement-hash";

/** PNG 1x1 piksel valid, sebagai gambar tanda tangan dummy. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function main() {
  const agreement = await prisma.marketingAgreement.findFirst({
    where: { status: "ISSUED" },
    include: { signatures: true },
    orderBy: { createdAt: "desc" },
  });
  if (!agreement) throw new Error("tidak ada perjanjian berstatus ISSUED untuk ditandatangani");

  const result = await signAgreement(agreement.id, {
    signerRole: "BROKER",
    method: "DRAWN",
    signatureImage: TINY_PNG,
    signatureImagePath: "agreements/test/ttd-broker.png",
    signerName: "Super Admin",
    signerIp: "127.0.0.1",
    signerUa: "e2e-test",
    consentAt: new Date(),
  });

  // Verifikasi integritas surat — argumen sesuai signature verifyIntegrity.
  const integrity = verifyIntegrity({
    agreementNumber: result.agreement.agreementNumber,
    snapshot: result.agreement.snapshot,
    storedContentHash: result.agreement.contentHash,
    signatures: result.agreement.signatures.map((s) => ({
      signerRole: s.signerRole,
      evidenceHash: s.evidenceHash,
    })),
    storedFinalHash: result.agreement.finalHash,
  });

  const archived = result.agreement.archivedDocumentId
    ? await prisma.document.findUnique({ where: { id: result.agreement.archivedDocumentId } })
    : null;

  console.log(
    JSON.stringify({
      finalized: result.finalized,
      status: result.agreement.status,
      finalHash: result.agreement.finalHash?.slice(0, 16) + "…",
      integrity,
      archivedDocument: archived
        ? { type: archived.type, referenceNo: archived.referenceNo, status: archived.status }
        : null,
    })
  );
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("E2E FINALIZE ERROR:", String(e).slice(0, 500));
  process.exit(1);
});
