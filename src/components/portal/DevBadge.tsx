"use client";

import { useEffect, useState } from "react";
import styles from "./DevBadge.module.css";

// Pill kecil "BETA" — floating di pojok kiri bawah.
// Tampil di semua halaman KECUALI env NEXT_PUBLIC_SITE_STATUS=production.
// Cara melepas: set env di hosting, tanpa ubah kode. Non-interaktif.
// Sembunyi otomatis saat bottom-sheet pencarian terbuka (event portal-search-state).
export default function DevBadge() {
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      setSheetOpen(Boolean(detail?.open));
    };
    window.addEventListener("portal-search-state", onState);
    return () => window.removeEventListener("portal-search-state", onState);
  }, []);

  if (process.env.NEXT_PUBLIC_SITE_STATUS === "production" || sheetOpen) return null;
  return (
    <div className={styles.pill} role="status" aria-label="Situs versi beta" title="Versi beta — data contoh">
      BETA
    </div>
  );
}
