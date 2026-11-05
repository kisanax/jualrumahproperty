import { prisma } from "../src/lib/prisma";
import { verifyIntegrity } from "../src/lib/agreement-hash";

async function main() {
  const agreement = await prisma.marketingAgreement.findFirst({
    include: { signatures: true },
    orderBy: { createdAt: "desc" },
  });
  if (!agreement) throw new Error("belum ada perjanjian");

  // Verifikasi integritas surat final — argumen sesuai signature verifyIntegrity.
  const integrity = verifyIntegrity({
    agreementNumber: agreement.agreementNumber,
    snapshot: agreement.snapshot,
    storedContentHash: agreement.contentHash,
    signatures: agreement.signatures.map((s) => ({
      signerRole: s.signerRole,
      evidenceHash: s.evidenceHash,
    })),
    storedFinalHash: agreement.finalHash,
  });

  console.log(
    JSON.stringify({
      agreementNumber: agreement.agreementNumber,
      status: agreement.status,
      integrity,
    })
  );
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("VERIFY ERROR:", String(e).slice(0, 400));
  process.exit(1);
});
