import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PropertyDetailActions from "./PropertyDetailActions";
import PropertyPhotoGallery from "./PropertyPhotoGallery";
import PropertyPublicPreviewModal from "./PropertyPublicPreviewModal";
import { DetailHeader } from "@/components/admin-ui/DetailHeader";

export const dynamic = "force-dynamic";
import {
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Building2,
  Calendar,
  Zap,
  Droplets,
  Compass,
  FileText,
  Plus,
  Users,
  Gavel,
} from "lucide-react";
import { categories, auctionStatuses, effectiveStatus } from "@/lib/auctions";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import {
  combinePropertyFilters,
  listingAccessFilter,
} from "@/lib/services/property-listing-access";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Card as UiCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/admin-ui/Button";


// =============================================================================
// Helpers
// =============================================================================

function getPropertyTypeLabel(type: string) {
  const m: Record<string, string> = { HOUSE: "Rumah", APARTMENT: "Apartemen", LAND: "Tanah", SHOPHOUSE: "Ruko" };
  return m[type] || type;
}
function getStatusBadgeClass(s: string) {
  const m: Record<string, string> = {
    DRAFT: "admin-badge-draft", PENDING_VERIFICATION: "admin-badge-pending",
    READY_TO_PUBLISH: "admin-badge-ready", ACTIVE: "admin-badge-active",
    IN_NEGOTIATION: "admin-badge-negotiation", SOLD: "admin-badge-sold",
    SUSPENDED: "admin-badge-suspended", WITHDRAWN: "admin-badge-withdrawn",
    EXPIRED: "admin-badge-expired", ARCHIVED: "admin-badge-archived",
  };
  return m[s] || "admin-badge-draft";
}
function getStatusLabel(s: string) {
  const m: Record<string, string> = {
    DRAFT: "Draft", PENDING_VERIFICATION: "Verifikasi", READY_TO_PUBLISH: "Siap Publish",
    ACTIVE: "Aktif", IN_NEGOTIATION: "Negosiasi", SOLD: "Terjual",
    SUSPENDED: "Ditunda", WITHDRAWN: "Ditarik", EXPIRED: "Kedaluwarsa", ARCHIVED: "Arsip",
  };
  return m[s] || s;
}
function formatRupiah(amount: number | bigint | { toNumber?: () => number }): string {
  let num: number;
  if (typeof amount === "bigint") num = Number(amount);
  else if (typeof amount === "object" && amount !== null && "toNumber" in amount) num = (amount as { toNumber: () => number }).toNumber();
  else num = amount as number;
  return `Rp ${num.toLocaleString("id-ID")}`;
}
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

// =============================================================================
// Page
// =============================================================================

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: {
      ...combinePropertyFilters(operational.actor, { OR: [{ id }, { code: id }] }),
    },
    include: {
      area: { include: { parent: true } },
      village: true,
      listings: {
        where: listingAccessFilter(operational.actor),
        orderBy: { createdAt: "desc" },
        include: {
          statusHistory: { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } },
          leads: { orderBy: { createdAt: "desc" }, take: 3 },
        },
      },
      propertyOwners: { include: { owner: true } },
      propertyMedia: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { type: "asc" } },
      amenities: { include: { amenity: true } },
      auctionRecords: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!property) notFound();

  const latestListing = property.listings[0];

  const publicPreviewData = {
    property: {
      id: property.id,
      code: property.code,
      type: property.type,
      address: property.address,
      landArea: property.landArea ? Number(property.landArea) : null,
      buildingArea: property.buildingArea ? Number(property.buildingArea) : null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      floors: property.floors,
      garages: property.garages,
      carports: property.carports,
      certificateType: property.certificateType,
      electricity: property.electricity,
      waterSource: property.waterSource,
      facing: property.facing,
    },
    areaName: property.area?.name,
    listing: latestListing
      ? {
          title: latestListing.title,
          description: latestListing.description,
          askingPrice: latestListing.askingPrice ? Number(latestListing.askingPrice) : null,
          videoUrl: latestListing.videoUrl,
          videoPlatform: latestListing.videoPlatform,
          status: latestListing.status,
        }
      : null,
    media: property.propertyMedia.map((m) => ({
      id: m.id,
      filePath: m.filePath,
      isPrimary: m.isPrimary,
      altText: m.altText,
    })),
    amenities: property.amenities.map((a) => ({
      amenity: {
        name: a.amenity.name,
        icon: a.amenity.icon,
      },
    })),
  };

  return (
    <div className="animate-fade-in">
      <DetailHeader
        crumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Properti", href: "/admin/properties" },
          { label: property.code },
        ]}
        title={property.code}
        badge={
          latestListing ? (
            <span className={`admin-badge ${getStatusBadgeClass(latestListing.status)}`}>
              {getStatusLabel(latestListing.status)}
            </span>
          ) : undefined
        }
        description={`${getPropertyTypeLabel(property.type)} • ${property.village ? `${property.village.name}, ` : ""}${property.area.parent ? `${property.area.name}, ${property.area.parent.name}` : property.area.name}`}
        meta={
          <>
            <span>Dibuat {formatDate(property.createdAt)}</span>
            <span>Diubah {formatDate(property.updatedAt)}</span>
          </>
        }
        actions={
          <>
            <PropertyPublicPreviewModal
              property={publicPreviewData.property}
              areaName={publicPreviewData.areaName}
              listing={publicPreviewData.listing}
              media={publicPreviewData.media}
              amenities={publicPreviewData.amenities}
              buttonClassName="admin-detail-preview-btn admin-btn admin-btn-secondary"
            />
            <PropertyDetailActions propertyId={property.id} propertyCode={property.code} />
          </>
        }
      />

      <div className="admin-detail-layout">
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Photos & Lightbox Preview Gallery */}
          <PropertyPhotoGallery
            propertyId={property.id}
            media={property.propertyMedia}
            videoUrl={latestListing?.videoUrl}
            videoPlatform={latestListing?.videoPlatform}
          />

          {/* Specs */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ marginBottom: 16 }}>Spesifikasi</UiCard>
            <div className="admin-specs-grid">
              {property.landArea && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Ruler size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.landArea}/{property.buildingArea || "-"} m²</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Luas T/B</div>
                  </div>
                </div>
              )}
              {property.bedrooms && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BedDouble size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.bedrooms}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Kamar Tidur</div>
                  </div>
                </div>
              )}
              {property.bathrooms && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bath size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.bathrooms}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Kamar Mandi</div>
                  </div>
                </div>
              )}
              {property.floors && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.floors}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Lantai</div>
                  </div>
                </div>
              )}
              {property.yearBuilt && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.yearBuilt}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Tahun Bangun</div>
                  </div>
                </div>
              )}
              {property.facing && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Compass size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.facing}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Hadap</div>
                  </div>
                </div>
              )}
              {property.electricity && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.electricity}W</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Listrik</div>
                  </div>
                </div>
              )}
              {property.waterSource && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Droplets size={18} style={{ color: "var(--color-admin-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{property.waterSource}</div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>Air</div>
                  </div>
                </div>
              )}
            </div>

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-admin-border)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text-secondary)", marginBottom: 8 }}>Fasilitas</div>
                <div className="admin-pill-group">
                  {property.amenities.map((pa) => (
                    <span key={pa.amenity.id} className="admin-pill admin-pill-sm active" style={{ cursor: "default" }}>
                      {pa.amenity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </UiCard>

          {/* Alamat & Lokasi */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ marginBottom: 12 }}>
              <MapPin size={16} style={{ display: "inline", marginRight: 6 }} />Lokasi (Internal)
            </UiCard>
            <div style={{ fontSize: 15, color: "var(--color-admin-text)" }}>{property.address}</div>
            {property.certificateType && (
              <div style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", marginTop: 8 }}>
                Sertifikat: {property.certificateType}{property.certificateNo ? ` — ${property.certificateNo}` : ""}
              </div>
            )}
          </UiCard>
        </div>

        {/* Right Column — Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Latest Listing */}
          {latestListing ? (
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ marginBottom: 12 }}>Listing Terkini</UiCard>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-admin-accent)" }}>
                {latestListing.priceOnRequest ? "Harga on request" : formatRupiah(latestListing.askingPrice)}
              </div>
              {latestListing.minimumPrice && (
                <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
                  Min: {formatRupiah(latestListing.minimumPrice)}
                </div>
              )}
              {latestListing.title && (
                <div style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 12 }}>{latestListing.title}</div>
              )}

              {/* Status history */}
              {latestListing.statusHistory.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--color-admin-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-admin-text-muted)", marginBottom: 8 }}>RIWAYAT STATUS</div>
                  {latestListing.statusHistory.map((sh) => (
                    <div key={sh.id} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12 }}>
                      <div style={{ color: "var(--color-admin-text-muted)", whiteSpace: "nowrap" }}>
                        {formatDate(sh.createdAt)}
                      </div>
                      <div style={{ color: "var(--color-admin-text-secondary)" }}>
                        {sh.fromStatus ? `${getStatusLabel(sh.fromStatus)} → ` : ""}{getStatusLabel(sh.toStatus)}
                        {sh.user && <span style={{ color: "var(--color-admin-text-muted)" }}> oleh {sh.user.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </UiCard>
          ) : (
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ marginBottom: 12 }}>Listing</UiCard>
              <div className="admin-empty" style={{ padding: "16px 0" }}>
                <div className="admin-empty-text">Belum ada listing</div>
              </div>
              <ButtonLink variant="primary" href={`/admin/listings/new?propertyId=${property.id}`} className="w-full h-10 px-4" style={{ marginTop: 8 }}>
                <Plus size={16} /> Buat Listing
              </ButtonLink>
            </UiCard>
          )}

          {/* Owners */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"><Users size={16} style={{ display: "inline", marginRight: 6 }} />Owner</UiCard>
            </UiCard>
            {property.propertyOwners.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)", fontStyle: "italic" }}>Belum diisi</div>
            ) : (
              property.propertyOwners.map((po) => (
                <div key={po.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--color-admin-border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{po.owner.name}</div>
                    {po.owner.phone && <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>{po.owner.phone}</div>}
                  </div>
                  {po.isPrimary && <UiBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-transparent bg-muted text-muted-foreground" style={{ fontSize: 10 }}>Utama</UiBadge>}
                </div>
              ))
            )}
          </UiCard>

          {/* Internal Notes */}
          {property.internalNotes && (
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ marginBottom: 8 }}>
                <FileText size={16} style={{ display: "inline", marginRight: 6 }} />Catatan Internal
              </UiCard>
              <div style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", whiteSpace: "pre-wrap" }}>
                {property.internalNotes}
              </div>
            </UiCard>
          )}

          {/* Listing History */}
          {property.listings.length > 1 && (
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ marginBottom: 12 }}>Riwayat Listing ({property.listings.length})</UiCard>
              {property.listings.map((listing) => (
                <div key={listing.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-admin-border)", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <UiBadge className={` ${getStatusBadgeClass(listing.status)} border-transparent bg-muted text-muted-foreground`} style={{ fontSize: 10 }}>
                      {getStatusLabel(listing.status)}
                    </UiBadge>
                    <span style={{ color: "var(--color-admin-text-muted)" }}>
                      {formatDate(listing.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </UiCard>
          )}

          {/* Sitaan & Lelang */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
                <Gavel size={16} style={{ display: "inline", marginRight: 6 }} />
                Sitaan & Lelang ({property.auctionRecords.length})
              </UiCard>
              <ButtonLink variant="quiet"
                href={`/admin/auctions/new?propertyId=${property.id}`}
                className="h-10 px-4"
                style={{ fontSize: 12, padding: "4px 8px" }}
              >
                <Plus size={14} /> Catat Baru
              </ButtonLink>
            </UiCard>
            {property.auctionRecords.length === 0 ? (
              <div className="admin-empty" style={{ padding: "12px 0" }}>
                <div className="admin-empty-text" style={{ fontSize: 13 }}>Belum ada catatan sitaan / lelang</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {property.auctionRecords.map((ar) => {
                  const effStatus = effectiveStatus({
                    status: ar.status,
                    activeFrom: ar.activeFrom?.toISOString().slice(0, 10),
                    activeUntil: ar.activeUntil?.toISOString().slice(0, 10),
                  });
                  return (
                    <Link
                      key={ar.id}
                      href={`/admin/auctions/${ar.id}`}
                      style={{
                        display: "block",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-admin-border)",
                        background: "var(--color-admin-surface)",
                        textDecoration: "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <UiBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-transparent bg-muted text-muted-foreground" style={{ fontSize: 10 }}>
                          {categories[ar.category as keyof typeof categories] || ar.category}
                        </UiBadge>
                        <UiBadge className="border-transparent bg-muted text-muted-foreground" style={{ fontSize: 10 }}>
                          {effStatus === "SCHEDULED" ? "Terjadwal" : auctionStatuses[effStatus as keyof typeof auctionStatuses] || effStatus}
                        </UiBadge>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)", marginBottom: 2 }}>
                        {ar.title}
                      </div>
                      {ar.limitPrice && (
                        <div style={{ fontSize: 12, color: "var(--color-admin-accent)", fontWeight: 500 }}>
                          Limit: Rp {Number(ar.limitPrice).toLocaleString("id-ID")}
                        </div>
                      )}
                      {ar.organizer && (
                        <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                          {ar.organizer}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </UiCard>
        </div>
      </div>
    </div>
  );
}
