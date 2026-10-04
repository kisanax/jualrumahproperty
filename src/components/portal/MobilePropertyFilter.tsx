"use client";

import Image from "next/image";
import { Children, type ReactNode, useEffect, useRef, useState } from "react";

type PropertyFilter = "" | "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE";
const categoryIconVersion = "20261004-1";

const categories: Array<{ value: PropertyFilter; label: string }> = [
  { value: "", label: "Semua" },
  { value: "HOUSE", label: "Rumah" },
  { value: "APARTMENT", label: "Apartemen" },
  { value: "LAND", label: "Tanah" },
  { value: "SHOPHOUSE", label: "Ruko" },
];

/* Ikon kategori animasi (animated WebP 96×96 saat aktif, still saat tidak).
   Regenerate: node scripts/generate-category-icons.mjs */
const ICON_FILE: Record<PropertyFilter, string> = {
  "": "semua",
  HOUSE: "rumah",
  APARTMENT: "apartemen",
  LAND: "tanah",
  SHOPHOUSE: "ruko",
};

function CategoryIcon({
  type,
  isActive,
  animationKey,
}: {
  type: PropertyFilter;
  isActive: boolean;
  animationKey: number;
}) {
  const version = `?v=${categoryIconVersion}`;
  const name = ICON_FILE[type];
  return (
    <Image
      key={animationKey}
      className="mobile-category-icon"
      src={
        (isActive
          ? `/brand/category-${name}.webp`
          : `/brand/category-${name}-still.webp`) + version
      }
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      unoptimized
    />
  );
}

interface MobilePropertyFilterProps {
  children: ReactNode;
  propertyTypes: string[];
}

const regionalDrawers = [
  {
    id: "jakarta",
    title: "Kawasan Jakarta",
    description: "Pilihan properti di Jakarta",
  },
  {
    id: "tangerang-selatan",
    title: "Kawasan Tangerang Selatan",
    description: "Pilihan properti di Tangerang Selatan",
  },
  {
    id: "depok",
    title: "Kawasan Depok",
    description: "Pilihan properti di Depok",
  },
] as const;

function RegionalPropertyDrawer({
  id,
  title,
  description,
}: (typeof regionalDrawers)[number]) {
  return (
    <section className="regional-listing-drawer" aria-labelledby={`${id}-title`}>
      <span className="listing-drawer-grip" aria-hidden="true" />
      <header className="regional-listing-drawer-header">
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="regional-listing-coming-soon">Segera hadir</span>
      </header>
      <div className="regional-placeholder-row" aria-label={`Placeholder ${title}`}>
        {[0, 1, 2].map((item) => (
          <article className="regional-placeholder-card" key={item}>
            <div className="regional-placeholder-photo" aria-hidden="true">
              <span />
            </div>
            <div className="regional-placeholder-copy">
              <span />
              <span />
              <span />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function MobilePropertyFilter({ children, propertyTypes }: MobilePropertyFilterProps) {
  const [active, setActive] = useState<PropertyFilter>("");
  const [expanded, setExpanded] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const cards = Children.toArray(children);
  const visibleCards = cards.filter((_, index) => !active || propertyTypes[index] === active);
  const displayedCards = expanded ? visibleCards : visibleCards.slice(0, 7);

  return (
    <>
      <nav className="mobile-property-categories" aria-label="Filter kategori properti">
        {categories.map((category) => (
          <button
            key={category.value || "all"}
            type="button"
            className={active === category.value ? "mobile-category-active" : undefined}
            aria-pressed={active === category.value}
            onClick={() => {
              setAnimationKey((current) => current + 1);
              setActive(category.value);
              setExpanded(false);
            }}
          >
            <CategoryIcon
              type={category.value}
              isActive={active === category.value}
              animationKey={animationKey}
            />
            <span>{category.label}</span>
          </button>
        ))}
      </nav>

      <section className="listing-section listing-drawer" id="jual" aria-label="Pilihan properti" aria-live="polite">
        <span className="listing-drawer-grip" aria-hidden="true" />
        <header className="listing-row-header">
          <div>
            <h2>Pilihan properti</h2>
            <p>{visibleCards.length} properti tersedia</p>
          </div>
          {visibleCards.length > 7 && (
            <button
              type="button"
              className="listing-see-all"
              aria-expanded={expanded}
              aria-controls="property-discovery-grid"
              onClick={() => setExpanded((current) => !current)}
            >
              <span>{expanded ? "Tampilkan sedikit" : "Lihat semua"}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={expanded ? "m18 15-6-6-6 6" : "m9 18 6-6-6-6"}/></svg>
            </button>
          )}
        </header>
        {visibleCards.length > 0 ? (
          <div
            id="property-discovery-grid"
            className={`listing-grid${expanded ? " listing-grid-expanded" : ""}`}
          >
            {displayedCards}
          </div>
        ) : (
          <p className="mobile-filter-empty">Belum ada properti dalam kategori ini.</p>
        )}
        {visibleCards.length > 7 && (
          <button
            type="button"
            className="listing-see-all listing-see-all-bottom"
            aria-expanded={expanded}
            aria-controls="property-discovery-grid"
            onClick={() => setExpanded((current) => !current)}
          >
            <span>{expanded ? "Tampilkan sedikit" : `Lihat semua ${visibleCards.length} properti`}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={expanded ? "m18 15-6-6-6 6" : "m9 18 6-6-6-6"}/></svg>
          </button>
        )}
      </section>

      {regionalDrawers.map((drawer) => (
        <RegionalPropertyDrawer key={drawer.id} {...drawer} />
      ))}
    </>
  );
}
