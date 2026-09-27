import Link from "next/link";
import Image from "next/image";
import PortalHeader from "@/components/portal/PortalHeader";
import MobilePropertyFilter from "@/components/portal/MobilePropertyFilter";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import { prisma } from "@/lib/prisma";
import { getMediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

function formatRupiah(value: unknown): string {
  if (!value) return "–";
  const num = typeof value === "bigint" ? Number(value) : Number(value);
  if (num >= 1_000_000_000) {
    const m = num / 1_000_000_000;
    return `Rp${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} Miliar`;
  }
  if (num >= 1_000_000) {
    const j = num / 1_000_000;
    return `Rp${j % 1 === 0 ? j.toFixed(0) : j.toFixed(1)} Juta`;
  }
  return `Rp${num.toLocaleString("id-ID")}`;
}

const typeLabel: Record<string, string> = {
  HOUSE: "Rumah",
  APARTMENT: "Apartemen",
  LAND: "Tanah",
  SHOPHOUSE: "Ruko",
};

const previewListings = process.env.PORTAL_PREVIEW_LISTINGS === "true";
const visibleListingStatuses = previewListings
  ? (["ACTIVE", "DRAFT", "READY_TO_PUBLISH"] as const)
  : (["ACTIVE"] as const);

export default async function Home() {
  const properties = await prisma.property.findMany({
    where: {
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
    orderBy: { createdAt: "desc" },
    take: 70,
  });

  return (
    <main>
      <PortalHeader />

      {properties.length > 0 && (
        <MobilePropertyFilter propertyTypes={properties.map((property) => property.type)}>
            {properties.map((property) => {
              const listing = property.listings[0];
              const photo = property.propertyMedia[0];
              const photoUrl = photo ? getMediaUrl(photo.filePath) : null;

              return (
                <Link key={property.id} href={`/properti/${property.id}`} className="property-card-link">
                <article className="property-card">
                  <div className="property-card-image">
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={listing?.title || `Properti di ${property.kawasan?.name || property.area.name}`}
                        width={800}
                        height={500}
                        unoptimized
                        loading="lazy"
                      />
                    ) : (
                      <div className="property-card-placeholder">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H3v-9Z"/><path d="M9 20v-6h6v6"/></svg>
                      </div>
                    )}
                    <span className="property-card-badge">{typeLabel[property.type] || property.type}</span>
                    {listing?.status === "ACTIVE" && <span className="property-card-live">Aktif</span>}
                  </div>

                  <div className="property-card-body">
                    <div className="property-card-location">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>
                      {property.kawasan?.name || property.village?.name || property.area.name}, {property.area.name}
                    </div>

                    <h3 className="property-card-title">
                      {listing?.title || `${typeLabel[property.type]} di ${property.kawasan?.name || property.area.name}`}
                    </h3>

                    <div className="property-card-specs">
                      {property.landArea && (
                        <span title="Luas Tanah">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
                          LT {property.landArea} m²
                        </span>
                      )}
                      {property.buildingArea && (
                        <span title="Luas Bangunan">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H3v-9Z"/></svg>
                          LB {property.buildingArea} m²
                        </span>
                      )}
                      {property.bedrooms && (
                        <span title="Kamar Tidur">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7v10M21 7v10M3 17h18M3 13h18M5 13V7h14v6"/></svg>
                          {property.bedrooms} KT
                        </span>
                      )}
                      {property.bathrooms && (
                        <span title="Kamar Mandi">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1ZM6 12V5a2 2 0 0 1 2-2h3v3H8v6"/></svg>
                          {property.bathrooms} KM
                        </span>
                      )}
                    </div>

                    <div className="property-card-footer">
                      <div className="property-card-price">
                        {listing ? formatRupiah(listing.askingPrice) : "Hubungi Kami"}
                      </div>
                      <span className="property-card-cert">{property.certificateType}</span>
                    </div>
                  </div>
                </article>
                </Link>
              );
            })}
        </MobilePropertyFilter>
      )}

      <a className="floating-cta" href="https://wa.me/6281234567890?text=Halo%20Jual%20Rumah%20Property%2C%20saya%20ingin%20konsultasi." target="_blank" rel="noreferrer" aria-label="Konsultasi melalui WhatsApp">
        <span className="pulse" />
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-5a8.4 8.4 0 1 1 16.1-3.8Z"/><path d="M8.1 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .3 0 .5.5l.7 1.7c.1.2 0 .4-.1.6l-.6.7c-.2.2-.1.4 0 .6.5 1 1.3 1.8 2.2 2.3.3.2.5.2.7 0l.8-1c.2-.2.4-.2.6-.1l1.8.8c.3.2.5.2.5.4 0 .2-.1 1.2-.8 1.8-.6.6-1.5.8-2.5.5-1.1-.3-2.6-.9-4.3-2.4-1.4-1.3-2.4-2.9-2.7-4-.3-1.1 0-1.9.4-2.5Z"/></svg>
        <span className="cta-copy"><small>BUTUH BANTUAN?</small><strong>Chat dengan kami</strong></span>
        <span className="cta-arrow">↗</span>
      </a>

      <MobileBottomNav />
    </main>
  );
}
