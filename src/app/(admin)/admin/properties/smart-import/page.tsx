import { prisma } from "@/lib/prisma";
import SmartImportClient from "./SmartImportClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Smart Import WhatsApp — Jual Rumah Property Admin",
};

export default async function SmartImportPage() {
  const [amenities, kawasanList] = await Promise.all([
    prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, category: true },
    }),
    prisma.kawasan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, areaId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SmartImportClient
      amenities={amenities}
      kawasanList={kawasanList}
    />
  );
}
