import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    select: {
      updatedAt: true,
      property: { select: { id: true, updatedAt: true } },
    },
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/jual`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/agents`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  const propertyPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${siteConfig.url}/properti/${listing.property.id}`,
    lastModified:
      listing.updatedAt > listing.property.updatedAt
        ? listing.updatedAt
        : listing.property.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...propertyPages];
}
