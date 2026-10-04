"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "jrp-favorites";

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persist(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage penuh / private mode — abaikan */
  }
  window.dispatchEvent(new CustomEvent("jrp-favorites-changed"));
}

/**
 * Tombol favorit di kartu properti — icon hati, tersimpan di localStorage.
 */
export default function FavoriteButton({ propertyId }: { propertyId: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(readFavorites().includes(propertyId));
    sync();
    window.addEventListener("jrp-favorites-changed", sync);
    return () => window.removeEventListener("jrp-favorites-changed", sync);
  }, [propertyId]);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const ids = readFavorites();
    const next = ids.includes(propertyId)
      ? ids.filter((id) => id !== propertyId)
      : [...ids, propertyId];
    persist(next);
    setActive(next.includes(propertyId));
  }

  return (
    <button
      type="button"
      className={`property-card-fav${active ? " active" : ""}`}
      onClick={toggle}
      aria-label={active ? "Hapus dari favorit" : "Simpan ke favorit"}
      aria-pressed={active}
      title={active ? "Hapus dari favorit" : "Simpan ke favorit"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
    </button>
  );
}
