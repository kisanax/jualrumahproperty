import { prisma } from "../src/lib/prisma";
import { verifyPassword } from "../src/lib/password";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "admin@jakselproperti.com" },
    select: { email: true, username: true, platformRole: true, password: true, isActive: true, deletedAt: true },
  });
  if (!user) {
    console.log("USER TIDAK ADA");
  } else {
    const ok = await verifyPassword("admin", user.password!);
    console.log(JSON.stringify({ ...user, password: user.password?.slice(0, 10) + "...", pwVerify: ok }, null, 2));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
