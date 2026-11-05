import { prisma } from "../src/lib/prisma";
import { verifyIntegrity } from "../src/lib/agreement-hash";

async function main() {
  const agreement = await prisma.marketingAgreement.findFirst({
    include: { signatures: true },
    orderBy: { createdAt: "desc" },
  });
  if (!agreement) throw new Error("belum ada perjanjian");

  // Simulasi dokumen diubah setelah ditandatangani (TIDAK ditulis ke DB).
  const tampered = JSON.parse(JSON.stringify(agreement.snapshot));
  tampered.letter.headerTitle = "SURAT YANG SUDAH DIUBAH";

  const result = verifyIntegrity({
    agreementNumber: agreement.agreementNumber,
    snapshot: tampered,
    storedContentHash: agreement.contentHash,
    signatures: agreement.signatures.map((s) => ({
      signerRole: s.signerRole,
      evidenceHash: s.evidenceHash,
    })),
    storedFinalHash: agreement.finalHash,
  });

  console.log(JSON.stringify({ tamperDetected: !result.contentIntact, integrity: result }));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("TAMPER TEST ERROR:", String(e).slice(0, 400));
  process.exit(1);
});
