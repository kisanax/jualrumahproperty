import { prisma } from "../src/lib/prisma";
import { issueAgreement } from "../src/lib/agreement-service";

async function main() {
  const [listing, superAdmin] = await Promise.all([
    prisma.listing.findFirst({
      include: { property: { include: { propertyOwners: true } } },
    }),
    prisma.user.findFirst({ where: { platformRole: "SUPER_ADMIN", isActive: true } }),
  ]);
  if (!listing || !superAdmin) throw new Error("listing/super admin tidak ada");

  const { agreement, ownerSigningToken } = await issueAgreement({
    listingId: listing.id,
    brokerUserId: superAdmin.id,
    startDate: new Date(),
    endDate: new Date(Date.now() + 180 * 86_400_000),
    exclusive: true,
    commissionPercent: 2.5,
    commissionAmount: null,
    commissionNotes: "Uji end-to-end",
    signedPlace: "Jakarta Selatan",
    templateId: null,
  });

  const ownerSlot = agreement.signatures.find((s) => s.signerRole === "OWNER");
  console.log(
    JSON.stringify({
      agreementNumber: agreement.agreementNumber,
      status: agreement.status,
      contentHash: agreement.contentHash?.slice(0, 16) + "…",
      ownerName: ownerSlot?.signerName,
      token: ownerSigningToken,
    })
  );
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("E2E ISSUE ERROR:", String(e).slice(0, 500));
  process.exit(1);
});
