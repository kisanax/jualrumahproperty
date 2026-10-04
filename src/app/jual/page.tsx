import type { Metadata } from "next";
import type { Prisma, PropertyType } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import PortalHeader from "@/components/portal/PortalHeader";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import PortalFooter from "@/components/portal/PortalFooter";
import { prisma } from "@/lib/prisma";
import { getMediaUrl } from "@/lib/storage";
import styles from "./sales.module.css";

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const types: Record<PropertyType, string> = {
  HOUSE: "Rumah",
  APARTMENT: "Apartemen",
  LAND: "Tanah",
  SHOPHOUSE: "Ruko",
};

const preview = process.env.PORTAL_PREVIEW_LISTINGS === "true";

export const metadata: Metadata = {
  title: "Rumah dan Properti Dijual",
  description:
    "Cari rumah dijual, apartemen, tanah, dan ruko di Indonesia. Jelajahi foto, harga, lokasi, dan spesifikasi properti pilihan Anda.",
  alternates: { canonical: "/jual" },
  ...(preview ? { robots: { index: false, follow: false } } : {}),
};

function price(value: Prisma.Decimal) {
  const number = Number(value);
  const divisor = number >= 1e9 ? 1e9 : number >= 1e6 ? 1e6 : 1;
  return `Rp ${(number / divisor).toLocaleString("id-ID", { maximumFractionDigits: 2 })}${divisor === 1e9 ? " Miliar" : divisor === 1e6 ? " Juta" : ""}`;
}

// ---------------------------------------------------------------------------
// Inline SVG Icons (no external icon library — consistent with homepage)
// ---------------------------------------------------------------------------

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
);

const BedIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7v10M21 7v10M3 17h18M3 13h18M5 13V7h14v6" /></svg>
);

const BathIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1ZM6 12V5a2 2 0 0 1 2-2h3v3H8v6" /></svg>
);

const RulerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H3v-9Z" /><path d="M9 20v-6h6v6" /></svg>
);

const ImageOffIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 2.5 21 21M6 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 1.4-.6M22 13.5V8a2 2 0 0 0-2-2h-5.5" /><path d="m14 14-3.5-3.5" /><circle cx="9" cy="9" r="1.5" /></svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
);

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const get = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";

  // Parse filters
  const query = get("q").slice(0, 120);
  const type = get("type") in types ? (get("type") as PropertyType) : undefined;
  // Area.id sekarang Int — query param string, koersi ke number.
  const areaIdRaw = Number(get("area")) || undefined;
  const areaId =
    areaIdRaw && Number.isInteger(areaIdRaw) ? areaIdRaw : undefined;
  const kawasanId = get("kawasan").slice(0, 64) || undefined;
  const cityIdRaw = Number(get("city")) || undefined;
  const cityId = cityIdRaw && Number.isInteger(cityIdRaw) ? cityIdRaw : undefined;
  const budget = get("budget");
  const beds = get("beds");
  const sort = ["newest", "price-asc", "price-desc"].includes(get("sort"))
    ? get("sort")
    : "newest";
  const requestedPage = Math.min(
    10000,
    Math.max(1, Math.floor(Number(get("page")) || 1))
  );

  // Fetch areas (kecamatan Jakarta Selatan) for dropdown filter.
  // Portal publik masih fokus Jaksel — kecamatan nasional tersedia
  // lewat pencarian teks; filter dropdown mengikuti listing yang ada.
  const areas = await prisma.area.findMany({
    where: { level: 3, isActive: true, parent: { officialCode: "31.74" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const areaName = areaId ? areas.find((a) => a.id === areaId)?.name || "" : "";

  // Build query
  const where: Prisma.ListingWhereInput = {
    status: preview
      ? { in: ["ACTIVE", "DRAFT", "READY_TO_PUBLISH"] }
      : "ACTIVE",
    property: {
      ...(type ? { type } : {}),
      ...(areaId ? { areaId } : {}),
      ...(kawasanId ? { kawasanId } : {}),
      ...(cityId ? { area: { parentId: cityId } } : {}),
      ...(beds && !isNaN(Number(beds))
        ? { bedrooms: { gte: Number(beds) } }
        : {}),
      ...(query
        ? {
            OR: [
              { code: { contains: query } },
              { area: { name: { contains: query } } },
              { kawasan: { name: { contains: query } } },
              { listings: { some: { title: { contains: query } } } },
            ],
          }
        : {}),
    },
    ...(["under5", "5to10", "10to25", "above25"].includes(budget)
      ? {
          priceOnRequest: false,
          askingPrice:
            budget === "under5"
              ? { lt: 5e9 }
              : budget === "5to10"
                ? { gte: 5e9, lt: 10e9 }
                : budget === "10to25"
                  ? { gte: 10e9, lte: 25e9 }
                  : { gt: 25e9 },
        }
      : {}),
  };

  const total = await prisma.listing.count({ where });
  const perPage = 24;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, pages);

  const listings = await prisma.listing.findMany({
    where,
    skip: (page - 1) * perPage,
    take: perPage,
    orderBy:
      sort === "newest"
        ? [{ createdAt: "desc" }, { id: "asc" }]
        : [
            { priceOnRequest: "asc" },
            { askingPrice: sort === "price-asc" ? "asc" : "desc" },
            { id: "asc" },
          ],
    include: {
      property: {
        include: {
          area: true,
          village: true,
          kawasan: true,
          propertyMedia: {
            where: { type: "PHOTO", isPublic: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
          },
        },
      },
    },
  });

  const pageUrl = (number: number) => {
    const next = new URLSearchParams({
      q: query,
      type: type || "",
      area: areaId ? String(areaId) : "",
      kawasan: kawasanId || "",
      city: cityId ? String(cityId) : "",
      budget,
      beds,
      sort,
      page: String(number),
    });
    return `/jual?${next}`;
  };

  return (
    <div className={styles.page}>
      <PortalHeader
        activeType={type || ""}
        initialArea={areaId ? String(areaId) : ""}
        initialKawasan={kawasanId || ""}
        initialCity={cityId ? String(cityId) : ""}
        initialQuery={query}
        initialAreaName={areaName}
        initialBudget={budget}
      />
      <main className={styles.content}>
        {/* ── FILTER BAR ── */}
        <form action="/jual" className={styles.filters}>
          {kawasanId && <input type="hidden" name="kawasan" value={kawasanId} />}
          {cityId && <input type="hidden" name="city" value={cityId} />}
          <label className={styles.search}>
            <SearchIcon />
            <span className={styles.srOnly}>
              Cari lokasi, nama properti, atau ID
            </span>
            <input
              name="q"
              defaultValue={query}
              placeholder="Cari lokasi, nama properti, atau ID"
            />
          </label>

          <label>
            <span className={styles.srOnly}>Kecamatan / Area</span>
            <select name="area" defaultValue={areaId || ""}>
              <option value="">Semua area</option>
              {areas.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.srOnly}>Jenis properti</span>
            <select name="type" defaultValue={type || ""}>
              <option value="">Semua jenis</option>
              {Object.entries(types).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.srOnly}>Harga</span>
            <select name="budget" defaultValue={budget}>
              <option value="">Semua harga</option>
              <option value="under5">Di bawah Rp5 Miliar</option>
              <option value="5to10">Rp5–10 Miliar</option>
              <option value="10to25">Rp10–25 Miliar</option>
              <option value="above25">Di atas Rp25 Miliar</option>
            </select>
          </label>

          <label>
            <span className={styles.srOnly}>Kamar tidur</span>
            <select name="beds" defaultValue={beds}>
              <option value="">KT</option>
              <option value="1">1+ KT</option>
              <option value="2">2+ KT</option>
              <option value="3">3+ KT</option>
              <option value="4">4+ KT</option>
              <option value="5">5+ KT</option>
            </select>
          </label>

          <label>
            <span className={styles.srOnly}>Urutkan</span>
            <select name="sort" defaultValue={sort}>
              <option value="newest">Terbaru</option>
              <option value="price-asc">Harga terendah</option>
              <option value="price-desc">Harga tertinggi</option>
            </select>
          </label>

          <button className={styles.submit} type="submit">
            Cari <SearchIcon />
          </button>
          <Link className={styles.reset} href="/jual">
            Reset
          </Link>
        </form>

        {/* Preview banner */}
        {preview && (
          <p className={styles.preview}>
            Pratinjau desain · termasuk listing yang belum dipublikasikan
          </p>
        )}

        {/* ── HEADING ── */}
        <header className={styles.heading}>
          <div>
            <small className={styles.eyebrow}>PROPERTI DIJUAL</small>
            <h1>Properti dijual</h1>
            <p>
              {total
                ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} dari ${total} properti`
                : "Belum ada properti yang sesuai"}
            </p>
          </div>
          <span>Temukan ruang untuk cerita baru Anda.</span>
        </header>

        {/* ── PROPERTY GRID ── */}
        <div className={styles.grid}>
          {listings.map(
            ({ id, title, askingPrice, priceOnRequest, property }) => {
              const location =
                property.kawasan?.name || property.village?.name || property.area.name;
              const photo = property.propertyMedia[0];
              const name =
                title || `${types[property.type]} di ${location}`;

              return (
                <Link
                  key={id}
                  href={`/properti/${property.id}`}
                  className={styles.card}
                >
                  <article>
                    <div className={styles.photo}>
                      {photo ? (
                        <Image
                          unoptimized
                          src={getMediaUrl(photo.filePath)}
                          alt={photo.altText || name}
                          loading="lazy"
                          width={640}
                          height={400}
                        />
                      ) : (
                        <div className={styles.noPhoto}>
                          <ImageOffIcon />
                          <span>Foto segera tersedia</span>
                        </div>
                      )}
                      <span className={styles.badge}>
                        {types[property.type] || property.type}
                      </span>
                    </div>

                    <div className={styles.info}>
                      <span className={styles.area}>
                        <PinIcon />
                        {location}
                      </span>

                      <p className={styles.price}>
                        {priceOnRequest
                          ? "Harga atas permintaan"
                          : price(askingPrice)}
                      </p>

                      <div className={styles.specs}>
                        {property.bedrooms != null && (
                          <span>
                            <BedIcon />
                            {property.bedrooms} KT
                          </span>
                        )}
                        {property.bathrooms != null && (
                          <span>
                            <BathIcon />
                            {property.bathrooms} KM
                          </span>
                        )}
                        {property.landArea != null && (
                          <span>
                            <RulerIcon />
                            LT {property.landArea} m²
                          </span>
                        )}
                        {property.buildingArea != null && (
                          <span>
                            <HomeIcon />
                            LB {property.buildingArea} m²
                          </span>
                        )}
                      </div>

                      <h2>{name}</h2>
                      <p className={styles.location}>
                        {types[property.type]} · {[property.village?.name, property.area.name].filter(Boolean).join(", ")}
                      </p>

                      {property.certificateType && (
                        <span className={styles.cert}>
                          {property.certificateType}
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              );
            }
          )}
        </div>

        {/* ── EMPTY STATE ── */}
        {!total && (
          <section className={styles.empty}>
            <h2>Properti pilihan Anda belum tersedia</h2>
            <p>Coba lokasi lain atau perluas rentang harga pencarian.</p>
            <Link href="/jual">Lihat semua properti</Link>
          </section>
        )}

        {/* ── PAGINATION ── */}
        {total > 0 && (
          <nav className={styles.pagination} aria-label="Halaman properti">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeftIcon />
              </Link>
            )}
            <span aria-current="page">{page}</span>
            <p>dari {pages}</p>
            {page < pages && (
              <Link
                href={pageUrl(page + 1)}
                aria-label="Halaman berikutnya"
              >
                <ChevronRightIcon />
              </Link>
            )}
          </nav>
        )}

        {/* ── FOOTER ── */}
        <PortalFooter />
        <MobileBottomNav />
      </main>
    </div>
  );
}
