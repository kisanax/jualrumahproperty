import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw<{ table_name: string; mb: number }[]>`
    SELECT table_name,
           ROUND((data_length + index_length) / 1024 / 1024, 2) AS mb
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('areas', 'kawasan', 'properties')
    ORDER BY mb DESC`;
  for (const r of rows) {
    console.log(`${r.table_name}: ${r.mb} MB`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
