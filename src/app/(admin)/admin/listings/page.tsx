import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Plus,
  ListChecks,
  Type,
  Clock,
  Download,
  SlidersHorizontal,
  Columns,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import { combineListingFilters } from "@/lib/services/property-listing-access";
import { notFound } from "next/navigation";
import React from "react";
import { Table as UiTable, TableHeader as UiTableHeader, TableRow as UiTableRow, TableHead as UiTableHead, TableBody as UiTableBody, TableCell as UiTableCell } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Card as UiCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/admin-ui/Button";


// =============================================================================
// Status helpers
// =============================================================================

function getStatusBadgeClass(s: string) {
  const m: Record<string, string> = {
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
  return m[s] || "admin-badge-draft";
}

function getStatusLabel(s: string) {
  const m: Record<string, string> = {
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
  return m[s] || s;
}

// =============================================================================
// Sorting tokens & helpers
// =============================================================================

const COLUMN_DEFAULT_ORDER_DIR: Record<string, Prisma.SortOrder> = {
  listingNumber: "asc",
  askingPrice: "desc",
  createdAt: "desc",
  updatedAt: "desc",
  status: "asc",
};

const ALLOWED_SORT_COLUMNS: string[] = [
  "title",
  "code",
  "area",
  "askingPrice",
  "minimumPrice",
  "publishedAt",
  "createdAt",
  "updatedAt",
  "status",
  "_count_leads",
  "views7d",
];

function clampPage(page: number, pageCount: number): number {
  if (page < 1) return 1;
  if (page > pageCount) return pageCount || 1;
  return page;
}

function formatRupiah(
  amount: number | bigint | { toNumber?: () => number },
): string {
  let num: number;
  if (typeof amount === "bigint") num = Number(amount);
  else if (typeof amount === "object" && amount !== null && "toNumber" in amount)
    num = (amount as { toNumber: () => number }).toNumber();
  else num = amount as number;
  if (num >= 1e9) return `Rp ${(num / 1e9).toFixed(1).replace(/\.0$/, "")} M`;
  if (num >= 1e6) return `Rp ${(num / 1e6).toFixed(0)} Jt`;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export const dynamic = "force-dynamic";

// =============================================================================
// Helper URL builder (module scope — tidak Bergantung pada render)
// =============================================================================
function buildListingUrl(opts: {
  status?: string;
  page?: string;
  range?: string;
  sort?: string;
  dir?: string;
  search?: string;
}): string {
  const p = new URLSearchParams();
  if (opts.status) p.set("status", opts.status);
  if (opts.page) p.set("page", opts.page);
  if (opts.range) p.set("range", opts.range);
  if (opts.sort) p.set("sort", opts.sort);
  if (opts.dir) p.set("dir", opts.dir);
  if (opts.search) p.set("search", opts.search);
  const qs = p.toString();
  return qs ? `/admin/listings?${qs}` : "/admin/listings";
}

// =============================================================================
// Tombol sortir header tabel (module scope — ikon panah sesuai arah)
// =============================================================================
function ListingSortButton({
  column,
  currentSort,
  currentDir,
  active,
  label,
  params,
}: {
  column: string;
  currentSort: string;
  currentDir: Prisma.SortOrder;
  active: boolean;
  label: string;
  params: { status?: string; page?: string; range?: string; search?: string };
}) {
  const href = buildListingUrl({
    status: params.status,
    page: params.page,
    range: params.range,
    sort: column,
    dir:
      active && currentSort === column
        ? currentDir === "asc"
          ? "desc"
          : "asc"
        : undefined,
    search: params.search,
  });

  return (
    <Link href={href} className={`admin-table-th ${active ? "active" : ""}`}>
      <span className="admin-table-th-label">{label}</span>
      {active && (
        <span
          className={`admin-table-sort-arrow ${currentDir === "asc" ? "asc" : "desc"}`}
        >
          {currentDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        </span>
      )}
    </Link>
  );
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    sort?: string;
    dir?: "asc" | "desc";
    range?: string;
  }>;
}) {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const params = await searchParams;
  const page = clampPage(parseInt(params.page || "1"), 1);
  const perPage = 25;

  // -------------------------------------------------------------------------
  // Filter HTTP (Content Library: tab Published/Scheduled/Drafts + search)
  // -------------------------------------------------------------------------
  const filters: Prisma.ListingWhereInput = {};
  if (params.status) {
    filters.status = params.status as Prisma.EnumListingStatusFilter["equals"];
  }
  if (params.search) {
    filters.OR = [
      { title: { contains: params.search } },
      { property: { code: { contains: params.search } } },
    ];
  }
  const where = combineListingFilters(operational.actor, filters);

  const allowedStatuses = [
    "",
    "DRAFT",
    "READY_TO_PUBLISH",
    "ACTIVE",
    "PENDING_VERIFICATION",
    "IN_NEGOTIATION",
    "SOLD",
    "SUSPENDED",
    "WITHDRAWN",
    "EXPIRED",
    "ARCHIVED",
  ] as const;

  // -------------------------------------------------------------------------
  // Sirkulasi sortir (ambil dari query params, default createdAt desc)
  // -------------------------------------------------------------------------
  const sortColumn = ALLOWED_SORT_COLUMNS.includes(params.sort || "")
    ? params.sort!
    : "createdAt";
  const sortDir: Prisma.SortOrder =
    params.dir === "asc" || params.dir === "desc"
      ? params.dir
      : COLUMN_DEFAULT_ORDER_DIR[sortColumn] || "asc";

  // -------------------------------------------------------------------------
  // Query utama (sort server-side, include area + _count leads)
  // -------------------------------------------------------------------------
  const baseOrder: Prisma.ListingOrderByWithRelationInput[] = [
    { [sortColumn]: sortDir },
    ...(sortColumn !== "createdAt"
      ? [{ createdAt: sortColumn === "createdAt" ? sortDir : "desc" as const }]
      : []),
  ];

  const baseInclude = {
    property: { include: { area: true } },
    _count: { select: { leads: true } },
  } as const;

  const [listingsResult, totalResult] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: baseInclude,
      orderBy: baseOrder,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.listing.count({ where }),
  ]);
  const listings = listingsResult;
  const total = totalResult;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const pageValid = clampPage(page, pageCount);

  // -------------------------------------------------------------------------
  // Rentang tanggal (Content Library)
  // -------------------------------------------------------------------------
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangePresets: { label: string; from: Date; to: Date }[] = [
    { label: "7 hari terakhir", from: new Date(today.getTime() - 7 * 86400000), to: today },
    { label: "30 hari terakhir", from: new Date(today.getTime() - 30 * 86400000), to: today },
    { label: "90 hari terakhir", from: new Date(today.getTime() - 90 * 86400000), to: today },
    { label: "Ini tahun", from: new Date(today.getFullYear(), 0, 1), to: today },
  ];
  const activeRangeIndex = params.range
    ? Math.max(
        0,
        Math.min(rangePresets.length - 1, parseInt(params.range) || 0),
      )
    : 0;
  const activeRange = rangePresets[activeRangeIndex];
  const rangeLabel = activeRange.label;

  // -------------------------------------------------------------------------
  // Helper URL builder — pindah ke module scope (hindari recreate per-render)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Numeric sort comparator (client-side fallback untuk _count_leads)
  // -------------------------------------------------------------------------
  const NumericSortKey = (
    record: unknown,
    column: string,
  ): number => {
    if (column === "_count_leads") {
      const r =
        record && typeof record === "object"
          ? (record as { _count?: { leads?: number } })._count
          : undefined;
      return (r?.leads ?? 0) as number;
    }
    if (column === "askingPrice") {
      const r =
        record && typeof record === "object"
          ? (record as { askingPrice?: unknown }).askingPrice
          : undefined;
      if (r == null) return 0;
      if (typeof r === "bigint") return Number(r);
      if (typeof r === "object" && r !== null && "valueOf" in r)
        return Number((r as { valueOf: () => unknown }).valueOf());
      return Number(r);
    }
    return 0;
  };

  // -------------------------------------------------------------------------
  // Status helpers (closure)
  // -------------------------------------------------------------------------
  const activeStatus = (status: string) =>
    status ? params.status === status : !params.status;

  const statusLabel = (status: string) =>
    status === "" ? "Semua" : getStatusLabel(status);

  // -------------------------------------------------------------------------
  // Helper harga & leads (komponen sort tombol ada di module scope)
  // -------------------------------------------------------------------------
  const listingPrice = (record: unknown): number | null => {
    if (!record || typeof record !== "object") return null;
    const r = record as { priceOnRequest?: boolean; askingPrice?: unknown };
    if (r.priceOnRequest) return null;
    const raw = r.askingPrice;
    if (raw == null) return null;
    if (typeof raw === "bigint") return Number(raw);
    if (typeof raw === "object" && raw !== null && "valueOf" in raw)
      return Number((raw as { valueOf: () => unknown }).valueOf());
    return Number(raw);
  };

  const getLeads = (record: unknown): number => {
    if (!record || typeof record !== "object") return 0;
    const r = record as { _count?: { leads?: number } };
    return (r._count?.leads ?? 0) as number;
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="animate-fade-in">
      {/* ---------- Header ----------*/}
      <div className="admin-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Listing</h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-admin-text-secondary)",
              marginTop: 4,
            }}
          >
            {total.toLocaleString("id-ID")} listing
          </p>
        </div>
        <ButtonLink variant="primary" href="/admin/properties/new" className="h-10 px-4">
          <Plus size={18} /> Buat Listing Baru
        </ButtonLink>
      </div>

      {/* ---------- Tab filter atas (Content Library) ----------*/}
      <div className="admin-content-tabs">
        {allowedStatuses.map((status) => (
          <Link
            key={status}
            href={buildListingUrl({
              status: status || undefined,
              page: "1",
              range: params.range,
              sort: params.sort,
              dir: params.dir,
            })}
            className={`admin-content-tab ${activeStatus(status) ? "active" : ""}`}
          >
            <span className="admin-content-tab-count">
              {status === ""
                ? total
                : listings.filter((item) => item.status === status).length}
            </span>
            {statusLabel(status)}
          </Link>
        ))}
      </div>

      {/* ---------- Toolbar: search + filter + kolom + tanggal + export ----------*/}
      <div className="admin-content-toolbar">
        <div className="admin-content-toolbar-left">
          <div className="admin-content-search">
            <Search className="admin-content-search-icon" size={16} />
            <input
              className="admin-content-search-input"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Cari kode, judul, area…"
              aria-label="Cari listing"
            />
          </div>
          <ButtonLink variant="quiet"
            href={buildListingUrl({
              status: params.status,
              page: "1",
              range: params.range,
              sort: params.sort,
              dir: params.dir,
              search: params.search,
            })}
            className="h-10 px-4"
          >
            <SlidersHorizontal size={16} />
          </ButtonLink>
          <ButtonLink variant="quiet"
            href={buildListingUrl({
              status: params.status,
              page: "1",
              range: params.range,
              sort: params.sort,
              dir: params.dir,
              search: params.search,
            })}
            className="h-10 px-4"
          >
            <Columns size={16} /> Kolom
          </ButtonLink>
        </div>
        <div className="admin-content-toolbar-right">
          <span className="admin-content-toolbar-meta">
            <Clock size={14} />
            <span className="admin-content-toolbar-label">{rangeLabel}</span>
          </span>
          <ButtonLink variant="quiet"
            href={buildListingUrl({
              status: params.status,
              page: "1",
              range: params.range,
              sort: params.sort,
              dir: params.dir,
              search: params.search,
            })}
            className="h-10 px-4"
          >
            <Download size={16} />
            Export
          </ButtonLink>
        </div>
      </div>

      {/* ---------- Tabel sortable ----------*/}
      <div className="admin-table-wrapper admin-listing-table">
        <UiTable className="w-full text-sm">
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead className="admin-table-col-code">
                <ListingSortButton
                  column="code"
                  params={params}
                  currentSort={sortColumn}
                  currentDir={sortDir}
                  active={sortColumn === "code"}
                  label="Kode"
                />
              </UiTableHead>
              <UiTableHead className="admin-table-col-title">
                <ListingSortButton
                  column="title"
                  params={params}
                  currentSort={sortColumn}
                  currentDir={sortDir}
                  active={sortColumn === "title"}
                  label="Judul"
                />
              </UiTableHead>
              <UiTableHead className="admin-table-col-area">
                <ListingSortButton
                  column="area"
                  params={params}
                  currentSort={sortColumn}
                  currentDir={sortDir}
                  active={sortColumn === "area"}
                  label="Area"
                />
              </UiTableHead>
              <UiTableHead className="admin-table-col-price">
                <ListingSortButton
                  column="askingPrice"
                  params={params}
                  currentSort={sortColumn}
                  currentDir={sortDir}
                  active={sortColumn === "askingPrice"}
                  label="Harga"
                />
              </UiTableHead>
              <UiTableHead className="admin-table-col-status">
                <ListingSortButton
                  column="status"
                  params={params}
                  currentSort={sortColumn}
                  currentDir={sortDir}
                  active={sortColumn === "status"}
                  label="Status"
                />
              </UiTableHead>
              <UiTableHead className="admin-table-col-leads">
                <ListingSortButton
                  column="_count_leads"
                  params={params}
                  currentSort={sortColumn}
                  currentDir={sortDir}
                  active={sortColumn === "_count_leads"}
                  label="Leads"
                />
              </UiTableHead>
              <UiTableHead className="admin-table-col-published">
                <ListingSortButton
                  column="publishedAt"
                  params={params}
                  currentSort={sortColumn}
                  currentDir={sortDir}
                  active={sortColumn === "publishedAt"}
                  label="Dibuat"
                />
              </UiTableHead>
              <UiTableHead className="admin-table-col-actions">Aksi</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            {listings.length === 0 ? (
              <UiTableRow>
                <UiTableCell colSpan={8}>
                  <div className="admin-content-empty">
                    <ListChecks
                      size={32}
                      className="admin-content-empty-icon"
                    />
                    <div className="admin-content-empty-title">
                      Belum ada listing dalam filter ini
                    </div>
                  </div>
                </UiTableCell>
              </UiTableRow>
            ) : (
              [...listings]
                .sort((a, b) => {
                  const ka = NumericSortKey(a, sortColumn);
                  const kb = NumericSortKey(b, sortColumn);
                  if (ka < kb) return sortDir === "asc" ? -1 : 1;
                  if (ka > kb) return sortDir === "asc" ? 1 : -1;
                  return 0;
                })
                .map((listing) => {
                  const leads = getLeads(listing);
                  const isActive = listing.status === "ACTIVE";
                  const asking = listingPrice(listing);

                  return (
                    <UiTableRow key={listing.id} className="admin-content-row">
                      <UiTableCell className="admin-content-cell clickable">
                        <Link
                          href={`/admin/properties/${listing.property.id}`}
                          className="admin-content-link"
                        >
                          <span className="admin-content-code">
                            {listing.property.code}
                          </span>
                        </Link>
                      </UiTableCell>
                      <UiTableCell className="admin-content-cell">
                        <div className="admin-content-title">
                          <Link
                            href={`/admin/listings/${listing.id}`}
                            className="admin-content-link"
                          >
                            <span className="admin-content-title-text">
                              {listing.title || "Tanpa judul"}
                            </span>
                            <ChevronRight
                              size={14}
                              className="admin-content-chevron"
                            />
                          </Link>
                        </div>
                      </UiTableCell>
                      <UiTableCell className="admin-content-cell">
                        <span className="admin-content-area">
                          {listing.property.area.name}
                        </span>
                      </UiTableCell>
                      <UiTableCell className="admin-content-cell">
                        {asking === null ? (
                          <span className="admin-content-price-muted">On request</span>
                        ) : asking === 0 ? (
                          <span className="admin-content-price-muted">Rp0</span>
                        ) : (
                          <span className="admin-content-price">
                            {formatRupiah(asking)}
                          </span>
                        )}
                      </UiTableCell>
                      <UiTableCell className="admin-content-cell">
                        <UiBadge
                          className={` ${getStatusBadgeClass(listing.status)} border-transparent bg-muted text-muted-foreground`}
                        >
                          {getStatusLabel(listing.status)}
                        </UiBadge>
                      </UiTableCell>
                      <UiTableCell className="admin-content-cell admin-content-number">
                        {leads}
                      </UiTableCell>
                      <UiTableCell className="admin-content-cell">
                        <div className="admin-content-date">
                          {formatDate(
                            (listing.publishedAt ?? listing.createdAt) as Date,
                          )}
                          {isActive ? (
                            <span
                              className="admin-content-live"
                              title="Aktif saat ini"
                            >
                              <span className="admin-content-live-dot" />
                              Aktif
                            </span>
                          ) : null}
                        </div>
                      </UiTableCell>
                      <UiTableCell className="admin-content-cell">
                        <ButtonLink variant="secondary"
                          href={`/admin/listings/${listing.id}`}
                          className="h-10 px-4"
                        >
                          Kelola
                        </ButtonLink>
                      </UiTableCell>
                    </UiTableRow>
                  );
                })
            )}
          </UiTableBody>
        </UiTable>
      </div>

      {/* ---------- Pagination ----------*/}
      <div className="admin-content-pagination">
        {pageValid > 1 && (
          <ButtonLink variant="quiet"
            href={buildListingUrl({
              status: params.status,
              page: String(pageValid - 1),
              range: params.range,
              sort: params.sort,
              dir: params.dir,
              search: params.search,
            })}
            className="h-10 px-4"
          >
            <Type size={14} /> Halaman sebelumnya
          </ButtonLink>
        )}
        <span className="admin-content-pagination-meta">
          Halaman {pageValid} dari {pageCount}
        </span>
        {pageValid < pageCount && (
          <ButtonLink variant="quiet"
            href={buildListingUrl({
              status: params.status,
              page: String(pageValid + 1),
              range: params.range,
              sort: params.sort,
              dir: params.dir,
              search: params.search,
            })}
            className="h-10 px-4"
          >
            <Type size={14} /> Halaman selanjutnya
          </ButtonLink>
        )}
      </div>

      {/* Mobile cards: informasi dan aksi utama langsung terlihat tanpa scroll horizontal */}
      <div className="admin-listing-mobile">
        {listings.length === 0 ? (
          <UiCard className="admin-empty gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <ListChecks size={32} className="admin-empty-icon" />
            <div className="admin-empty-title">Belum ada listing</div>
          </UiCard>
        ) : (
          listings.map((listing) => (
            <article
              className="admin-listing-mobile-card"
              key={listing.id}
            >
              <div className="admin-listing-mobile-topline">
                <Link
                  href={`/admin/properties/${listing.property.id}`}
                  className="admin-listing-mobile-code"
                >
                  {listing.property.code}
                </Link>
                <UiBadge
                  className={` ${getStatusBadgeClass(listing.status)} border-transparent bg-muted text-muted-foreground`}
                >
                  {getStatusLabel(listing.status)}
                </UiBadge>
              </div>
              <Link
                href={`/admin/listings/${listing.id}`}
                className="admin-listing-mobile-title"
              >
                {listing.title || "Listing tanpa judul"}
              </Link>
              <div className="admin-listing-mobile-meta">
                <span>{listing.property.area.name}</span>
                <span>{formatDate(listing.createdAt)}</span>
              </div>
              <div className="admin-listing-mobile-footer">
                <strong>
                  {listing.priceOnRequest
                    ? "Harga on request"
                    : formatRupiah(listing.askingPrice)}
                </strong>
                <ButtonLink variant="secondary"
                  href={`/admin/listings/${listing.id}`}
                  className="h-10 px-4"
                >
                  Kelola <span aria-hidden="true">→</span>
                </ButtonLink>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
