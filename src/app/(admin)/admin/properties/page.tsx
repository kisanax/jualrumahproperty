import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Search, FileSpreadsheet, Sparkles } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import {
  combinePropertyFilters,
  listingAccessFilter,
  type OperationalActor,
} from "@/lib/services/property-listing-access";
import { notFound } from "next/navigation";
import { Input as UiInput } from "@/components/ui/input";
import { Button as UiButton } from "@/components/ui/button";
import { ButtonLink } from "@/components/admin-ui/Button";


// =============================================================================
// Data Fetching
// =============================================================================

async function getProperties(
  searchParams: Promise<{ page?: string; search?: string; type?: string; area?: string }>,
  actor: OperationalActor
) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 20;
  const search = params.search || "";
  const type = params.type || "";
  const areaSlug = params.area || "";

  const filters: Prisma.PropertyWhereInput = {};

  if (search) {
    filters.OR = [
      { code: { contains: search } },
      { address: { contains: search } },
    ];
  }

  if (type) {
    filters.type = type as Prisma.EnumPropertyTypeFilter["equals"];
  }

  if (areaSlug) {
    filters.area = { slug: areaSlug };
  }

  const where = combinePropertyFilters(actor, filters);

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        area: true,
        kawasan: true,
        listings: {
          where: listingAccessFilter(actor),
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            askingPrice: true,
            priceOnRequest: true,
          },
        },
        propertyOwners: {
          include: { owner: { select: { name: true } } },
          take: 1,
        },
        _count: {
          select: {
            propertyMedia: true,
            listings: { where: listingAccessFilter(actor) },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.property.count({ where }),
  ]);

  return { properties, total, page, perPage };
}

// =============================================================================
// Helpers
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
// Page
// =============================================================================

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; type?: string; area?: string }>;
}) {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const params = await searchParams;
  const search = params.search || "";
  const type = params.type || "";
  const areaSlug = params.area || "";
  const { properties, total, page, perPage } = await getProperties(
    searchParams,
    operational.actor
  );
  const totalPages = Math.ceil(total / perPage);
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (type) sp.set("type", type);
    if (areaSlug) sp.set("area", areaSlug);
    sp.set("page", String(p));
    return `/admin/properties?${sp.toString()}`;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Properti</h1>
          <p>{total} properti terdaftar</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ButtonLink variant="secondary"
            href="/admin/properties/smart-import"
            className="h-10 px-4"
          >
            <Sparkles size={16} /> Smart Paste WA
          </ButtonLink>
          <ButtonLink variant="secondary" href="/admin/properties/import" className="h-10 px-4">
            <FileSpreadsheet size={16} /> Import CSV
          </ButtonLink>
          <ButtonLink variant="primary" href="/admin/properties/new" className="h-10 px-4">
            <Plus size={18} /> Tambah Properti
          </ButtonLink>
        </div>
      </div>

      {/* Filters — GET form, filter tetap server-side */}
      <form className="admin-dt-toolbar" style={{ marginBottom: 16 }}>
        <div className="admin-dt-search">
          <Search size={16} />
          <UiInput
            name="search"
            type="text"
            className="min-h-10 px-3 text-base md:text-sm"
            placeholder="Cari kode, alamat..."
            defaultValue={search}
          />
        </div>
        <select
          name="type"
          className="admin-input admin-filter-select"
          defaultValue={type}
          style={{ minWidth: 150 }}
          aria-label="Filter tipe properti"
        >
          <option value="">Semua Tipe</option>
          <option value="HOUSE">Rumah</option>
          <option value="APARTMENT">Apartemen</option>
          <option value="LAND">Tanah</option>
          <option value="SHOPHOUSE">Ruko</option>
        </select>
        <UiButton variant="outline" type="submit" className="admin-filter-btn h-10 px-4">
          <Search size={16} /> Filter
        </UiButton>
      </form>

      {/* Tabel Properti (server-rendered, gaya .admin-dt-*) */}
      <div className="admin-dt-shell">
        <div className="admin-dt-scroll">
          <table className="admin-dt-table">
            <thead>
              <tr>
                <th>Kode Properti</th>
                <th>Lokasi</th>
                <th>Spek</th>
                <th>Owner</th>
                <th>Status Listing</th>
                <th style={{ textAlign: "right" }}>Harga</th>
                <th style={{ textAlign: "right" }}>Foto</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-dt-empty">
                      <div className="admin-dt-empty-title">
                        {search || type ? "Properti tidak ditemukan" : "Belum ada properti"}
                      </div>
                      <div className="admin-dt-empty-text">
                        {search || type
                          ? "Coba sesuaikan kata kunci atau filter tipe."
                          : "Tambahkan properti pertama untuk mulai membuat listing."}
                      </div>
                      {!search && !type && (
                        <div style={{ marginTop: 14 }}>
                          <ButtonLink variant="primary" href="/admin/properties/new" className="h-10 px-4">
                            <Plus size={16} /> Tambah Properti
                          </ButtonLink>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                properties.map((property) => {
                  const latestListing = property.listings[0];
                  const primaryOwner = property.propertyOwners[0];

                  const spek = [
                    property.landArea
                      ? `${property.landArea}/${property.buildingArea || "-"} m²`
                      : null,
                    property.bedrooms ? `${property.bedrooms} KT` : null,
                    property.bathrooms ? `${property.bathrooms} KM` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <tr key={property.id}>
                      <td>
                        <Link
                          href={`/admin/properties/${property.id}`}
                          className="admin-dt-link"
                          style={{ fontWeight: 600 }}
                        >
                          {property.code}
                        </Link>
                        <div className="admin-dt-muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {getPropertyTypeLabel(property.type)}
                        </div>
                      </td>
                      <td>
                        <div>
                          {property.kawasan
                            ? `${property.kawasan.name} • Kec. ${property.area.name}`
                            : `Kec. ${property.area.name}`}
                        </div>
                        {property.address && (
                          <div
                            className="admin-dt-muted"
                            style={{
                              fontSize: 12,
                              marginTop: 2,
                              maxWidth: 240,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={property.address}
                          >
                            {property.address}
                          </div>
                        )}
                      </td>
                      <td>
                        {spek || <span className="admin-dt-muted">—</span>}
                      </td>
                      <td>
                        {primaryOwner ? (
                          primaryOwner.owner.name
                        ) : (
                          <span className="admin-dt-muted">Belum diisi</span>
                        )}
                      </td>
                      <td>
                        {latestListing ? (
                          <span className={`admin-badge ${getStatusBadgeClass(latestListing.status)}`}>
                            {getStatusLabel(latestListing.status)}
                          </span>
                        ) : (
                          <span className="admin-dt-muted">Belum ada listing</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {latestListing && !latestListing.priceOnRequest ? (
                          <span style={{ fontWeight: 700, color: "var(--workspace-primary)" }}>
                            {formatRupiah(latestListing.askingPrice)}
                          </span>
                        ) : latestListing?.priceOnRequest ? (
                          <span className="admin-dt-muted" style={{ fontStyle: "italic" }}>
                            On request
                          </span>
                        ) : (
                          <span className="admin-dt-muted">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }} className="admin-dt-muted">
                        {property._count.propertyMedia}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination — server-side */}
        <div className="admin-dt-foot">
          <span>
            {total === 0
              ? "Menampilkan 0 dari 0"
              : `Menampilkan ${start}\u2013${end} dari ${total}`}
          </span>
          <div className="admin-dt-foot-right">
            {totalPages > 1 && (
              <>
                {page > 1 && (
                  <ButtonLink variant="quiet" href={pageHref(page - 1)} className="h-10 px-4">
                    &larr; Sebelumnya
                  </ButtonLink>
                )}
                <span className="admin-dt-muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                  Halaman {page} dari {totalPages}
                </span>
                {page < totalPages && (
                  <ButtonLink variant="quiet" href={pageHref(page + 1)} className="h-10 px-4">
                    Selanjutnya &rarr;
                  </ButtonLink>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
