import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../../public/logo.png";
import type { Metadata } from "next";
import { PropertyGallery } from "./PropertyGallery";
import { PropertyShare } from "./PropertyShare";
import { PropertyAccordion } from "./PropertyAccordion";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import { siteConfig } from "@/lib/site-config";
import { getMediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabel: Record<string, string> = {
  HOUSE: "Rumah",
  APARTMENT: "Apartemen",
  LAND: "Tanah",
  SHOPHOUSE: "Ruko",
  COMMERCIAL: "Komersial",
  OFFICE: "Kantor",
  VILLA: "Villa",
};

const previewListings = process.env.PORTAL_PREVIEW_LISTINGS === "true";
const visibleListingStatuses = previewListings
  ? (["ACTIVE", "DRAFT", "READY_TO_PUBLISH"] as const)
  : (["ACTIVE"] as const);

function formatRupiahShort(value: unknown): string {
  if (!value) return "Hubungi Kami";
  const num = Number(value);
  if (isNaN(num) || num <= 0) return "Hubungi Kami";
  if (num >= 1_000_000_000) {
    const m = num / 1_000_000_000;
    const formatted = m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(".", ",");
    return `Rp ${formatted} Miliar`;
  }
  if (num >= 1_000_000) {
    const j = num / 1_000_000;
    const formatted = j % 1 === 0 ? j.toFixed(0) : j.toFixed(1).replace(".", ",");
    return `Rp ${formatted} Juta`;
  }
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function formatRupiahFull(value: unknown): string {
  if (!value) return "";
  const num = Number(value);
  if (isNaN(num) || num <= 0) return "";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function cleanListingTitle(rawTitle?: string | null, fallback?: string): string {
  if (!rawTitle) return fallback || "Properti Pilihan di Jakarta Selatan";
  if (rawTitle.includes("—") || rawTitle.includes(" - ")) {
    const parts = rawTitle.split(/\s*—\s*|\s*-\s*/);
    const p1 = parts[0].trim();
    const p2 = parts[1]?.trim() || "";
    if (p2.toLowerCase().includes("townhouse")) {
      return `${p1} (Townhouse)`;
    }
    if (p2.toLowerCase().includes("1 lantai")) {
      return `${p1} (1 Lantai)`;
    }
    return p1;
  }
  return rawTitle;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const property = await prisma.property.findFirst({
    where: {
      id,
      listings: { some: { status: { in: [...visibleListingStatuses] } } },
    },
    include: {
      area: true,
      village: true,
      kawasan: true,
      listings: {
        where: { status: { in: [...visibleListingStatuses] } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      propertyMedia: {
        where: { type: "PHOTO", isPublic: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  });
  if (!property) return { title: "Properti Tidak Ditemukan", robots: { index: false } };

  const listing = property.listings[0];
  const locationDisplay = `${
    property.kawasan?.name ? `${property.kawasan.name}, ` : ""
  }${property.village?.name ? `${property.village.name}, ` : ""}${property.area.name}`;
  const title = cleanListingTitle(
    listing?.title,
    `${typeLabel[property.type] || property.type} di ${locationDisplay}`
  );

  const description =
    listing?.description?.slice(0, 160) ||
    `Temukan ${typeLabel[property.type]?.toLowerCase()} pilihan di ${locationDisplay}. Lihat harga, foto, dan spesifikasi lengkap.`;
  const canonical = `/properti/${property.id}`;
  const image = property.propertyMedia[0]
    ? getMediaUrl(property.propertyMedia[0].filePath)
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: previewListings ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      url: canonical,
      siteName: siteConfig.name,
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: {
      id,
      listings: { some: { status: { in: [...visibleListingStatuses] } } },
    },
    include: {
      area: true,
      village: true,
      kawasan: true,
      listings: {
        where: { status: { in: [...visibleListingStatuses] } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      propertyMedia: {
        where: { type: "PHOTO", isPublic: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!property) notFound();

  const listing = property.listings[0];
  const photos = property.propertyMedia;

  const locationDisplay = `${
    property.kawasan?.name ? `${property.kawasan.name}, ` : ""
  }${property.village?.name ? `${property.village.name}, ` : ""}${property.area.name}, Jakarta Selatan`;

  const title = cleanListingTitle(
    listing?.title,
    `${typeLabel[property.type] || property.type} di ${locationDisplay}`
  );

  const totalParking = (property.garages ?? 0) + (property.carports ?? 0);

  // WhatsApp Pre-filled Messages
  const waShowingText = encodeURIComponent(
    `Halo Jual Rumah Property, saya ingin menjadwalkan kunjungan / survei untuk properti:\n\n` +
      `*${title}*\n` +
      `ID Listing: ${property.code}\n` +
      `Lokasi: ${locationDisplay}\n\n` +
      `Apakah bisa dijadwalkan waktu survei ke lokasi? Terima kasih.`
  );

  const waInfoText = encodeURIComponent(
    `Halo Jual Rumah Property, mohon informasi lebih lengkap terkait unit:\n\n` +
      `*${title}*\n` +
      `ID Listing: ${property.code}\n` +
      `Lokasi: ${locationDisplay}\n\n` +
      `Mohon dikirimkan detail spesifikasi dan info ketersediaannya. Terima kasih.`
  );

  // Dynamic Accordion Data — strictly populated fields only
  const locationItems = [
    { label: "Kawasan", value: property.kawasan?.name },
    { label: "Kelurahan / Kecamatan", value: [property.village?.name, property.area.name].filter(Boolean).join(" / ") },
    { label: "Kota Administratif", value: "Jakarta Selatan" },
    { label: "Provinsi", value: "DKI Jakarta" },
    ...(listing?.showFullAddress && property.address
      ? [{ label: "Alamat Lengkap", value: property.address }]
      : []),
  ];

  const specificationItems = [
    { label: "Kode Listing", value: property.code },
    { label: "Tipe Properti", value: typeLabel[property.type] || property.type },
    {
      label: "Status Listing",
      value:
        listing?.status === "ACTIVE"
          ? "Aktif / Tersedia"
          : listing?.status === "READY_TO_PUBLISH"
          ? "Siap Dipasarkan"
          : listing?.status === "DRAFT"
          ? "Draft"
          : listing?.status,
    },
    { label: "Legalitas / Sertifikat", value: property.certificateType },
    {
      label: "Luas Tanah",
      value: property.landArea != null ? `${property.landArea} m²` : null,
    },
    {
      label: "Luas Bangunan",
      value: property.buildingArea != null ? `${property.buildingArea} m²` : null,
    },
    { label: "Kamar Tidur", value: property.bedrooms },
    { label: "Kamar Mandi", value: property.bathrooms },
    {
      label: "Jumlah Lantai",
      value: property.floors && property.floors > 1 ? property.floors : null,
    },
    {
      label: "Garasi",
      value: (property.garages ?? 0) > 0 ? `${property.garages} Mobil` : null,
    },
    {
      label: "Carport",
      value: (property.carports ?? 0) > 0 ? `${property.carports} Mobil` : null,
    },
    {
      label: "Daya Listrik",
      value: property.electricity != null ? `${property.electricity.toLocaleString("id-ID")} Watt` : null,
    },
    { label: "Sumber Air", value: property.waterSource },
    { label: "Arah Hadap", value: property.facing },
    { label: "Tahun Dibangun", value: property.yearBuilt },
  ];

  return (
    <div className="raveis-page-root">
      {/* ── SITE HEADER ── */}
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Jakarta Selatan Properti — Beranda">
          <Image src={logo} alt="Jakarta Selatan Properti" priority />
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/#jual">Properti Dijual</Link>
          <Link href="/agents">Our Agents</Link>
          <Link href="/#tentang">Tentang Kami</Link>
          <a
            className="nav-contact"
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noreferrer"
          >
            Hubungi Kami
          </a>
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Buka menu navigasi">
            <span />
            <span />
            <span />
          </summary>
          <nav aria-label="Navigasi mobile">
            <Link href="/#jual">Properti Dijual</Link>
            <Link href="/agents">Our Agents</Link>
            <Link href="/#tentang">Tentang Kami</Link>
            <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">
              Hubungi Kami
            </a>
          </nav>
        </details>
        <a
          className="mobile-call"
          href="tel:+6281234567890"
          aria-label="Telepon Jakarta Selatan Properti"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.1 3.8 9 3.3c.5-.1 1 .2 1.2.7l1 2.6c.2.5 0 1-.4 1.3L9.4 9c.9 2 2.6 3.7 4.6 4.6l1.1-1.4c.3-.4.9-.6 1.3-.4l2.6 1c.5.2.8.7.7 1.2l-.5 1.9c-.2 1-1.1 1.7-2.1 1.7A12.7 12.7 0 0 1 4.4 4.9c0-1 .7-1.9 1.7-2.1Z" />
          </svg>
        </a>
      </header>

      {/* ── BREADCRUMB ── */}
      <nav className="raveis-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span className="sep">/</span>
        <Link href="/#jual">Properti Dijual</Link>
        <span className="sep">/</span>
        <span className="current">{property.area.name}</span>
      </nav>

      {/* ── GALLERY (William Raveis style: 1 Hero + 2x2 Grid) ── */}
      <PropertyGallery photos={photos} title={title} />

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="raveis-layout">
        {/* LEFT COLUMN: Main Info & Specifications */}
        <section className="raveis-content-left">
          {/* Title in Elegant Serif */}
          <h1 className="raveis-heading-title">{title}</h1>

          {/* Status Badges */}
          <div className="raveis-badge-strip">
            <span className="raveis-pill pill-status">
              {listing?.status === "ACTIVE"
                ? "ACTIVE"
                : listing?.status === "READY_TO_PUBLISH"
                ? "SIAP PUBLISH"
                : "DRAFT"}
            </span>
            <span className="raveis-pill">
              {typeLabel[property.type] || property.type}
            </span>
            {property.kawasan?.name && (
              <span className="raveis-pill">{property.kawasan.name}</span>
            )}
            {property.certificateType && (
              <span className="raveis-pill">{property.certificateType}</span>
            )}
          </div>

          {/* 4-COLUMN SPECS GRID (Icon + Label on top, Value below) */}
          {/* ONLY populated fields are displayed */}
          <div className="raveis-spec-grid">
            {/* Property Type */}
            <div className="raveis-spec-cell">
              <div className="raveis-spec-top">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3 11 9-7 9 7v9H3v-9Z" />
                </svg>
                <span>Tipe Properti</span>
              </div>
              <div className="raveis-spec-bottom">
                {typeLabel[property.type] || property.type}
              </div>
            </div>

            {/* Bedrooms */}
            {property.bedrooms != null && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 7v10M21 7v10M3 17h18M3 13h18M5 13V7h14v6" />
                  </svg>
                  <span>Kamar Tidur</span>
                </div>
                <div className="raveis-spec-bottom">{property.bedrooms}</div>
              </div>
            )}

            {/* Bathrooms */}
            {property.bathrooms != null && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1ZM6 12V5a2 2 0 0 1 2-2h3v3H8v6" />
                  </svg>
                  <span>Kamar Mandi</span>
                </div>
                <div className="raveis-spec-bottom">{property.bathrooms}</div>
              </div>
            )}

            {/* Luas Bangunan */}
            {property.buildingArea != null && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m3 11 9-7 9 7v9H3v-9Z" />
                    <path d="M9 20v-6h6v6" />
                  </svg>
                  <span>Luas Bangunan</span>
                </div>
                <div className="raveis-spec-bottom">
                  {property.buildingArea.toLocaleString("id-ID")} m²
                </div>
              </div>
            )}

            {/* Luas Tanah */}
            {property.landArea != null && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 3v18" />
                  </svg>
                  <span>Luas Tanah</span>
                </div>
                <div className="raveis-spec-bottom">
                  {property.landArea.toLocaleString("id-ID")} m²
                </div>
              </div>
            )}

            {/* Sertifikat */}
            {property.certificateType && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                  <span>Sertifikat</span>
                </div>
                <div className="raveis-spec-bottom">{property.certificateType}</div>
              </div>
            )}

            {/* Parking */}
            {totalParking > 0 && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M9 16V8h4a2 2 0 1 1 0 4H9" />
                  </svg>
                  <span>Parkir</span>
                </div>
                <div className="raveis-spec-bottom">{totalParking} Mobil</div>
              </div>
            )}

            {/* Floors */}
            {property.floors != null && property.floors > 1 && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 21h18M3 17h18M3 13h18M3 9h18" />
                  </svg>
                  <span>Lantai</span>
                </div>
                <div className="raveis-spec-bottom">{property.floors} Lantai</div>
              </div>
            )}

            {/* Electricity */}
            {property.electricity != null && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
                  </svg>
                  <span>Daya Listrik</span>
                </div>
                <div className="raveis-spec-bottom">
                  {property.electricity.toLocaleString("id-ID")} Watt
                </div>
              </div>
            )}

            {/* Water Source */}
            {property.waterSource && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2s-6 7.5-6 12a6 6 0 0 0 12 0c0-4.5-6-12-6-12Z" />
                  </svg>
                  <span>Sumber Air</span>
                </div>
                <div className="raveis-spec-bottom">{property.waterSource}</div>
              </div>
            )}

            {/* Facing */}
            {property.facing && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m16.2 7.8-4.2 4.2M12 2v4M12 18v4M2 12h4M18 12h4" />
                  </svg>
                  <span>Arah Hadap</span>
                </div>
                <div className="raveis-spec-bottom">{property.facing}</div>
              </div>
            )}

            {/* Year Built */}
            {property.yearBuilt != null && (
              <div className="raveis-spec-cell">
                <div className="raveis-spec-top">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span>Tahun Dibangun</span>
                </div>
                <div className="raveis-spec-bottom">{property.yearBuilt}</div>
              </div>
            )}
          </div>

          {/* Description Section */}
          {listing?.description && (
            <div className="raveis-copy-section">
              <p>{listing.description}</p>
            </div>
          )}

          {/* Property Information Accordion (Collapsible, Hairline Layout, NO MAP) */}
          <PropertyAccordion
            locationItems={locationItems}
            specificationItems={specificationItems}
          />
        </section>

        {/* RIGHT COLUMN: Sidebar (Price, Share, CTAs — NO MAP) */}
        <aside className="raveis-content-right">
          <div className="raveis-card-sidebar">
            {/* Share property inline icons */}
            <PropertyShare title={title} code={property.code} />

            {/* Price Display */}
            <div className="raveis-pricing-group">
              <div className="raveis-price-main">
                {listing && !listing.priceOnRequest
                  ? formatRupiahShort(listing.askingPrice)
                  : "Hubungi Kami"}
              </div>
              {listing && !listing.priceOnRequest && (
                <div className="raveis-price-sub">
                  {formatRupiahFull(listing.askingPrice)}
                </div>
              )}
            </div>

            {/* Location & Listing ID */}
            <div className="raveis-address-group">
              <div className="raveis-location-line">{locationDisplay}</div>
              <div className="raveis-id-line">
                Listing ID {property.code}
              </div>
            </div>

            {/* Action Buttons (William Raveis style) */}
            <div className="raveis-cta-group">
              {/* Primary Filled: Request A Showing */}
              <a
                className="raveis-action-btn btn-showing"
                href={`https://wa.me/6281234567890?text=${waShowingText}`}
                target="_blank"
                rel="noreferrer"
              >
                Request A Showing
              </a>

              {/* Secondary Outlined: Request Info */}
              <a
                className="raveis-action-btn btn-info"
                href={`https://wa.me/6281234567890?text=${waInfoText}`}
                target="_blank"
                rel="noreferrer"
              >
                Request Info
              </a>
            </div>

            {/* Advisor Assistance */}
            <div className="raveis-agent-strip">
              <div className="raveis-agent-desc">
                <span>Butuh Bantuan Langsung?</span>
                <strong>+62 812-3456-7890</strong>
              </div>
              <a
                href="tel:+6281234567890"
                className="raveis-agent-call-btn"
                aria-label="Telepon Advisor"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.1 3.8 9 3.3c.5-.1 1 .2 1.2.7l1 2.6c.2.5 0 1-.4 1.3L9.4 9c.9 2 2.6 3.7 4.6 4.6l1.1-1.4c.3-.4.9-.6 1.3-.4l2.6 1c.5.2.8.7.7 1.2l-.5 1.9c-.2 1-1.1 1.7-2.1 1.7A12.7 12.7 0 0 1 4.4 4.9c0-1 .7-1.9 1.7-2.1Z" />
                </svg>
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* ── FLOATING WHATSAPP CTA ── */}
      <a
        className="floating-cta"
        href={`https://wa.me/6281234567890?text=${waShowingText}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat WhatsApp untuk survei properti"
      >
        <span className="pulse" />
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-5a8.4 8.4 0 1 1 16.1-3.8Z" />
          <path d="M8.1 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .3 0 .5.5l.7 1.7c.1.2 0 .4-.1.6l-.6.7c-.2.2-.1.4 0 .6.5 1 1.3 1.8 2.2 2.3.3.2.5.2.7 0l.8-1c.2-.2.4-.2.6-.1l1.8.8c.3.2.5.2.5.4 0 .2-.1 1.2-.8 1.8-.6.6-1.5.8-2.5.5-1.1-.3-2.6-.9-4.3-2.4-1.4-1.3-2.4-2.9-2.7-4-.3-1.1 0-1.9.4-2.5Z" />
        </svg>
        <span className="cta-copy">
          <small>JADWALKAN SURVEI</small>
          <strong>Chat WhatsApp</strong>
        </span>
        <span className="cta-arrow">↗</span>
      </a>
      <MobileBottomNav />
    </div>
  );
}
