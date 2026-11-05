import { prisma } from "../src/lib/prisma";

async function main() {
  const templates = await prisma.agreementTemplate.count();
  const agreements = await prisma.marketingAgreement.count();
  const superAdmins = await prisma.user.count({
    where: { platformRole: "SUPER_ADMIN", isActive: true, deletedAt: null },
  });
  const listings = await prisma.listing.count();
  console.log(JSON.stringify({ templates, agreements, superAdmins, listings }));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("DB ERROR:", String(e).slice(0, 400));
  process.exit(1);
});
