"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import FavoriteButton from "./FavoriteButton";

const STORAGE_KEY = "jrp-favorites";

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface FavProperty {
  id: string;
  type: string;
  areaName: string;
  location: string;
  title: string | null;
  price: string | null;
  certificateType: string;
  photoUrl: string | null;
}

function formatRupiah(value: string | null): string {
  if (!value) return "Hubungi Kami";
  const num = Number(value);
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

/**
 * Grid kartu favorit — sumber IDs dari localStorage, data via API publik.
 */
export default function FavoritesGrid() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [items, setItems] = useState<FavProperty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setIds(readFavorites());
    sync();
    window.addEventListener("jrp-favorites-changed", sync);
    return () => window.removeEventListener("jrp-favorites-changed", sync);
  }, []);

  useEffect(() => {
    if (!ids || ids.length === 0) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/properties/public?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : { properties: [] }))
      .then((data) => {
        if (!cancelled) setItems(data.properties ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (!ids) return null; // belum hydration

  if (ids.length === 0) {
    return (
      <div className="fav-empty">
        <div className="fav-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
        </div>
        <p className="fav-empty-title">Belum ada properti yang disimpan.</p>
        <p className="fav-empty-sub">Tap icon hati di kartu properti untuk menyimpannya di sini.</p>
        <Link href="/" className="fav-empty-cta">Jelajahi properti</Link>
      </div>
    );
  }

  return (
    <div className="fav-grid-wrap">
      {loading && <p className="fav-loading">Memuat favorit…</p>}
      <div className="listing-grid">
        {items.map((p) => (
          <Link key={p.id} href={`/properti/${p.id}`} className="property-card-link">
            <article className="property-card">
              <div className="property-card-image">
                {p.photoUrl ? (
                  <Image src={p.photoUrl} alt={p.title || `Properti di ${p.location}`} width={800} height={500} unoptimized loading="lazy" />
                ) : (
                  <div className="property-card-placeholder">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H3v-9Z"/><path d="M9 20v-6h6v6"/></svg>
                  </div>
                )}
                <span className="property-card-badge">{typeLabel[p.type] || p.type}</span>
                <FavoriteButton propertyId={p.id} />
              </div>
              <div className="property-card-body">
                <div className="property-card-location">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>
                  {p.location}, {p.areaName}
                </div>
                <h3 className="property-card-title">
                  {p.title || `${typeLabel[p.type] || p.type} di ${p.location}`}
                </h3>
                <div className="property-card-footer">
                  <div className="property-card-price">{formatRupiah(p.price)}</div>
                  <span className="property-card-cert">{p.certificateType}</span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
      {items.length > 0 && (
        <p className="fav-count">{items.length} properti tersimpan</p>
      )}
    </div>
  );
}
