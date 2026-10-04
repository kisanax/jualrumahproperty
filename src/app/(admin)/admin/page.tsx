import { prisma } from "@/lib/prisma";
import {
  Building2,
  ListChecks,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Plus,
  Clock,
  Gavel,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { effectiveStatus } from "@/lib/auctions";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import {
  combineListingFilters,
  isOperationalStaff,
  listingAccessFilter,
  propertyAccessFilter,
  type OperationalActor,
} from "@/lib/services/property-listing-access";
import { notFound } from "next/navigation";

// =============================================================================
// Data fetching
// =============================================================================

async function getDashboardData(actor: OperationalActor) {
  const listingScope = listingAccessFilter(actor);
  const leadScope = { listing: listingScope };
  const auctionScope = isOperationalStaff(actor)
    ? {}
    : { property: { is: propertyAccessFilter(actor) } };

  const [
    totalProperties,
    totalActiveListings,
    totalDraftListings,
    totalLeads,
    newLeads,
    recentListings,
    recentLeads,
    auctionRows,
  ] = await Promise.all([
    prisma.property.count({ where: propertyAccessFilter(actor) }),
    prisma.listing.count({ where: combineListingFilters(actor, { status: "ACTIVE" }) }),
    prisma.listing.count({ where: combineListingFilters(actor, { status: "DRAFT" }) }),
    prisma.lead.count({ where: leadScope }),
    prisma.lead.count({ where: { AND: [leadScope, { currentStage: "NEW" }] } }),
    prisma.listing.findMany({
      where: listingScope,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          include: { area: true, kawasan: true },
        },
      },
    }),
    prisma.lead.findMany({
      where: leadScope,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        listing: {
          include: {
            property: { include: { area: true, kawasan: true } },
          },
        },
      },
    }),
    prisma.auctionRecord.findMany({
      where: auctionScope,
      select: {
        id: true,
        title: true,
        status: true,
        activeFrom: true,
        activeUntil: true,
      },
    }),
  ]);

  const activeAuctions = auctionRows.filter(
    (r) =>
      effectiveStatus({
        status: r.status,
        activeFrom: r.activeFrom?.toISOString().slice(0, 10),
        activeUntil: r.activeUntil?.toISOString().slice(0, 10),
      }) === "ACTIVE"
  ).length;

  const expiredAuctions = auctionRows.filter(
    (r) =>
      effectiveStatus({
        status: r.status,
        activeFrom: r.activeFrom?.toISOString().slice(0, 10),
        activeUntil: r.activeUntil?.toISOString().slice(0, 10),
      }) === "EXPIRED"
  ).length;

  return {
    totalProperties,
    totalActiveListings,
    totalDraftListings,
    totalLeads,
    newLeads,
    recentListings,
    recentLeads,
    totalAuctions: auctionRows.length,
    activeAuctions,
    expiredAuctions,
  };
}

// =============================================================================
// Helper: Format Rupiah
// =============================================================================

function formatRupiah(amount: number | bigint | { toNumber?: () => number }): string {
  let num: number;
  if (typeof amount === "bigint") {
    num = Number(amount);
  } else if (typeof amount === "object" && amount !== null && "toNumber" in amount) {
    num = (amount as { toNumber: () => number }).toNumber();
  } else {
    num = amount as number;
  }

  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} M`;
  }
  if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(0)} Jt`;
  }
  return `Rp ${num.toLocaleString("id-ID")}`;
}

// =============================================================================
// Helper: Status badge class
// =============================================================================

function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "admin-badge-draft",
    PENDING_VERIFICATION: "admin-badge-pending",
    READY_TO_PUBLISH: "admin-badge-ready",
    ACTIVE: "admin-badge-active",
    IN_NEGOTIATION: "admin-badge-negotiation",
    SOLD: "admin-badge-sold",
    SUSPENDED: "admin-badge-suspended",
    WITHDRAWN: "admin-badge-withdrawn",
    EXPIRED: "admin-badge-expired",
    ARCHIVED: "admin-badge-archived",
  };
  return map[status] || "admin-badge-draft";
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_VERIFICATION: "Verifikasi",
    READY_TO_PUBLISH: "Siap Publish",
    ACTIVE: "Aktif",
    IN_NEGOTIATION: "Negosiasi",
    SOLD: "Terjual",
    SUSPENDED: "Ditunda",
    WITHDRAWN: "Ditarik",
    EXPIRED: "Kedaluwarsa",
    ARCHIVED: "Arsip",
  };
  return map[status] || status;
}

// =============================================================================
// Helper: Lead status
// =============================================================================

function getLeadStageLabel(stage: string): string {
  const map: Record<string, string> = {
    NEW: "Baru",
    QUALIFIED: "Kualifikasi",
    VIEWING: "Survei",
    NEGOTIATING: "Negosiasi",
    WON: "Menang",
    LOST: "Hilang",
  };
  return map[stage] || stage;
}

// =============================================================================
// Property type label
// =============================================================================

function getPropertyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    HOUSE: "Rumah",
    APARTMENT: "Apartemen",
    LAND: "Tanah",
    SHOPHOUSE: "Ruko",
  };
  return map[type] || type;
}

// =============================================================================
// Dashboard Page
// =============================================================================

export default async function AdminDashboard() {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const data = await getDashboardData(operational.actor);
  const staff = isOperationalStaff(operational.actor);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
          Ringkasan aktivitas jualrumahproperty.com
        </p>
      </div>

      {/* Expired Auction Alert */}
      {staff && data.expiredAuctions > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--color-admin-text)",
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
            <div>
              <strong style={{ color: "#ef4444" }}>{data.expiredAuctions} catatan sitaan & lelang kedaluwarsa</strong>
              <span style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", marginLeft: 6 }}>
                Masa aktif telah terlewati berdasarkan waktu Jakarta. Perlu peninjauan & input hasil lelang manual.
              </span>
            </div>
          </div>
          <Link
            href="/admin/auctions"
            className="admin-btn admin-btn-sm"
            style={{ backgroundColor: "#ef4444", color: "#fff", flexShrink: 0 }}
          >
            Tinjau Lelang <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#60a5fa" }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{data.totalProperties}</div>
            <div className="admin-stat-label">Total Properti</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#34d399" }}
          >
            <ListChecks size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{data.totalActiveListings}</div>
            <div className="admin-stat-label">Listing Aktif</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}
          >
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{data.newLeads}</div>
            <div className="admin-stat-label">Leads Baru</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.12)", color: "#a78bfa" }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{data.totalDraftListings}</div>
            <div className="admin-stat-label">Draft Listing</div>
          </div>
        </div>

        {staff && <Link href="/admin/auctions" className="admin-stat-card" style={{ textDecoration: "none", color: "inherit" }}>
          <div
            className="admin-stat-icon"
            style={{ backgroundColor: "rgba(236, 72, 153, 0.12)", color: "#f472b6" }}
          >
            <Gavel size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{data.totalAuctions}</div>
            <div className="admin-stat-label">
              Sitaan & Lelang ({data.activeAuctions} Aktif)
            </div>
          </div>
        </Link>}

      </div>

      {/* Two Column: Recent Listings + Recent Leads */}
      <div className="admin-grid-2" style={{ gap: 20 }}>
        {/* Recent Listings */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">Listing Terbaru</div>
              <div className="admin-card-subtitle">5 listing terakhir dibuat</div>
            </div>
            <Link href="/admin/listings" className="admin-btn admin-btn-ghost admin-btn-sm">
              Lihat semua <ArrowRight size={14} />
            </Link>
          </div>

          {data.recentListings.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-title">Belum ada listing</div>
              <div className="admin-empty-text">Buat properti dan listing pertama</div>
              <Link
                href="/admin/properties/new"
                className="admin-btn admin-btn-primary admin-btn-sm"
                style={{ marginTop: 16 }}
              >
                <Plus size={16} /> Tambah Properti
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {data.recentListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/admin/listings/${listing.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                    color: "inherit",
                    transition: "background-color 0.1s",
                  }}
                  className="admin-nav-item"
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="admin-dashboard-listing-title"
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--color-admin-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {listing.title || `${getPropertyTypeLabel(listing.property.type)} di ${listing.property.area.name}`}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-admin-text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {listing.property.code} • {listing.property.area.name}
                      {!listing.priceOnRequest &&
                        ` • ${formatRupiah(listing.askingPrice)}`}
                    </div>
                  </div>
                  <span className={`admin-badge ${getStatusBadgeClass(listing.status)}`}>
                    {getStatusLabel(listing.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">Leads Terbaru</div>
              <div className="admin-card-subtitle">Inquiry yang perlu follow-up</div>
            </div>
            <Link href="/admin/leads" className="admin-btn admin-btn-ghost admin-btn-sm">
              Lihat semua <ArrowRight size={14} />
            </Link>
          </div>

          {data.recentLeads.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-title">Belum ada leads</div>
              <div className="admin-empty-text">
                Leads akan masuk saat listing dipublikasikan
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {data.recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads?id=${lead.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                  className="admin-nav-item"
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--color-admin-text)",
                      }}
                    >
                      {lead.customer.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-admin-text-muted)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lead.message || lead.customer.phone}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={12} style={{ color: "var(--color-admin-text-muted)" }} />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-admin-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getLeadStageLabel(lead.currentStage)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card" style={{ marginTop: 20 }}>
        <div className="admin-card-title" style={{ marginBottom: 16 }}>
          Aksi Cepat
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link href="/admin/properties/new" className="admin-btn admin-btn-primary">
            <Plus size={18} /> Tambah Properti
          </Link>
          <Link href="/admin/listings" className="admin-btn admin-btn-secondary">
            <ListChecks size={18} /> Kelola Listing
          </Link>
          <Link href="/admin/leads" className="admin-btn admin-btn-secondary">
            <MessageSquare size={18} /> Cek Leads
          </Link>
          {staff && <Link href="/admin/auctions/new" className="admin-btn admin-btn-secondary">
            <Gavel size={18} /> Catat Sitaan & Lelang
          </Link>}
        </div>
      </div>
    </div>
  );
}
