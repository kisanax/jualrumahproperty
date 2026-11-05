import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { DashboardStatCard } from "@/components/admin-ui/DashboardStatCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
// Helper: Listing status badge tone
// =============================================================================

function getStatusBadgeTone(status: string) {
  const tones = {
    DRAFT: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    PENDING_VERIFICATION: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    READY_TO_PUBLISH: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    IN_NEGOTIATION: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    SOLD: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    SUSPENDED: "bg-red-500/10 text-red-700 dark:text-red-300",
    WITHDRAWN: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    EXPIRED: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    ARCHIVED: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  } as const;
  return tones[status as keyof typeof tones] ?? tones.DRAFT;
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
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan aktivitas jualrumahproperty.com</p>
      </header>

      {/* Expired Auction Alert */}
      {staff && data.expiredAuctions > 0 && (
        <Card className="mb-5 border-destructive/25 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">{data.expiredAuctions} catatan sitaan & lelang kedaluwarsa</p>
                <p className="text-sm text-muted-foreground">Masa aktif telah terlewati berdasarkan waktu Jakarta. Perlu peninjauan & input hasil lelang manual.</p>
              </div>
            </div>
            <Button variant="destructive" render={<Link href="/admin/auctions" />}>
              Tinjau Lelang <ArrowRight aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <section aria-label="Ringkasan operasional" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardStatCard icon={Building2} label="Total Properti" value={data.totalProperties} tone="blue" />
        <DashboardStatCard icon={ListChecks} label="Listing Aktif" value={data.totalActiveListings} tone="green" />
        <DashboardStatCard icon={MessageSquare} label="Leads Baru" value={data.newLeads} tone="amber" />
        <DashboardStatCard icon={TrendingUp} label="Draft Listing" value={data.totalDraftListings} tone="violet" />
        {staff && (
          <Link href="/admin/auctions" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <DashboardStatCard icon={Gavel} label={`Sitaan & Lelang · ${data.activeAuctions} aktif`} value={data.totalAuctions} tone="rose" />
          </Link>
        )}
      </section>

      {/* Two Column: Recent Listings + Recent Leads */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Recent Listings */}
        <Card className="gap-0 rounded-xl border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="grid-cols-[1fr_auto] items-center border-b border-border/70 pb-4">
            <div className="space-y-1">
              <CardTitle>Listing Terbaru</CardTitle>
              <CardDescription>5 listing terakhir dibuat</CardDescription>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/admin/listings" />}>
                Lihat semua <ArrowRight aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-3">
            {data.recentListings.length === 0 ? (
              <div className="grid justify-items-center gap-2 py-10 text-center">
                <div className="font-medium">Belum ada listing</div>
                <div className="text-sm text-muted-foreground">Buat properti dan listing pertama</div>
                <Button className="mt-2" render={<Link href="/admin/properties/new" />}>
                  <Plus aria-hidden="true" /> Tambah Properti
                </Button>
              </div>
            ) : (
              <div className="grid gap-1">
              {data.recentListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/admin/listings/${listing.id}`}
                  className="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-medium group-hover:text-primary"
                    >
                      {listing.title || `${getPropertyTypeLabel(listing.property.type)} di ${listing.property.area.name}`}
                    </div>
                    <div
                      className="mt-1 truncate text-xs text-muted-foreground"
                    >
                      {listing.property.code} • {listing.property.area.name}
                      {!listing.priceOnRequest &&
                        ` • ${formatRupiah(listing.askingPrice)}`}
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 border-transparent px-2.5 py-1 font-semibold ${getStatusBadgeTone(listing.status)}`}>
                    {getStatusLabel(listing.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="gap-0 rounded-xl border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="grid-cols-[1fr_auto] items-center border-b border-border/70 pb-4">
            <div className="space-y-1">
              <CardTitle>Leads Terbaru</CardTitle>
              <CardDescription>Inquiry yang perlu follow-up</CardDescription>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/admin/leads" />}>
                Lihat semua <ArrowRight aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-3">
            {data.recentLeads.length === 0 ? (
              <div className="grid justify-items-center gap-2 py-10 text-center">
                <div className="font-medium">Belum ada leads</div>
                <div className="text-sm text-muted-foreground">Leads akan masuk saat listing dipublikasikan</div>
              </div>
            ) : (
              <div className="grid gap-1">
              {data.recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads?id=${lead.id}`}
                  className="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-sm font-medium group-hover:text-primary"
                    >
                      {lead.customer.name}
                    </div>
                    <div
                      className="mt-1 truncate text-xs text-muted-foreground"
                    >
                      {lead.message || lead.customer.phone}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12} aria-hidden="true" />
                    <span>
                      {getLeadStageLabel(lead.currentStage)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-5 gap-0 rounded-xl border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3"><CardTitle>Aksi Cepat</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          <Button render={<Link href="/admin/properties/new" />}>
            <Plus aria-hidden="true" /> Tambah Properti
          </Button>
          <Button variant="outline" render={<Link href="/admin/listings" />}>
            <ListChecks aria-hidden="true" /> Kelola Listing
          </Button>
          <Button variant="outline" render={<Link href="/admin/leads" />}>
            <MessageSquare aria-hidden="true" /> Cek Leads
          </Button>
          {staff && <Button variant="outline" render={<Link href="/admin/auctions/new" />}>
            <Gavel aria-hidden="true" /> Catat Sitaan & Lelang
          </Button>}
        </CardContent>
      </Card>
    </div>
  );
}
