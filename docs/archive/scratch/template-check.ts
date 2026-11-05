import { prisma } from "../src/lib/prisma";

async function main() {
  const ts = await prisma.agreementTemplate.findMany({ orderBy: { version: "asc" } });
  for (const t of ts) {
    const body = t.body as { paragraphs?: string[] }[];
    const p1 = body?.[0]?.paragraphs?.[0] ?? "";
    console.log(
      JSON.stringify({
        version: t.version,
        isActive: t.isActive,
        akhirPasal1: p1.slice(-70),
      })
    );
  }
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("CHECK ERROR:", String(e).slice(0, 300));
  process.exit(1);
});
