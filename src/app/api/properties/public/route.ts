import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMediaUrl } from "@/lib/media-url";

/**
 * GET /api/properties/public?ids=a,b,c — data ringkas kartu properti
 * untuk halaman favorit (IDs dari localStorage klien). Publik, read-only.
 */
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);

  if (ids.length === 0) {
    return NextResponse.json({ properties: [] });
  }

  const visibleListingStatuses = process.env.PORTAL_PREVIEW_LISTINGS === "true"
    ? (['ACTIVE', 'DRAFT', 'READY_TO_PUBLISH'] as const)
    : (['ACTIVE'] as const);

  const properties = await prisma.property.findMany({
    where: {
      id: { in: ids },
      listings: { some: { status: { in: [...visibleListingStatuses] } } },
    },
    include: {
      area: true,
      village: true,
      kawasan: true,
      listings: {
        where: { status: { in: [...visibleListingStatuses] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      propertyMedia: {
        where: { type: "PHOTO", isPublic: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  });

  // Pertahankan urutan favorit user.
  type Card = (typeof properties)[number];
  const byId = new Map<string, Card>(properties.map((p) => [p.id, p]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((p): p is Card => Boolean(p));

  return NextResponse.json({
    properties: ordered.map((p) => {
      const listing = p.listings[0];
      const media = p.propertyMedia[0];
      return {
        id: p.id,
        type: p.type,
        areaName: p.area.name,
        location: p.kawasan?.name || p.village?.name || p.area.name,
        title: listing?.title || null,
        price: listing ? String(listing.askingPrice) : null,
        certificateType: p.certificateType,
        photoUrl: media ? getMediaUrl(media.filePath) : null,
      };
    }),
  });
}
