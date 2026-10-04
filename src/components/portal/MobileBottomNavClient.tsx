"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./MobileBottomNav.module.css";

export default function MobileBottomNavClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [isHidden, setIsHidden] = useState(false);
  const accountHref = isLoggedIn ? "/akun" : `/login?returnTo=${encodeURIComponent(pathname)}`;
  const isExplore = pathname === "/" || pathname === "/jual" || pathname.startsWith("/properti/");

  useEffect(() => {
    let lastY = window.scrollY;
    let lastDirection = 0;
    let directionDistance = 0;

    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastY;
      lastY = currentY;

      if (currentY < 56) {
        directionDistance = 0;
        setIsHidden(false);
        return;
      }

      const direction = Math.sign(delta);
      if (!direction) return;
      if (direction !== lastDirection) {
        lastDirection = direction;
        directionDistance = 0;
      }
      directionDistance += Math.abs(delta);

      if (directionDistance >= 12) {
        setIsHidden(direction > 0);
        directionDistance = 0;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
    {pathname !== "/" && <div className={styles.spacer} aria-hidden="true" />}
    <nav
      className={`${styles.nav} ${isHidden ? styles.hidden : ""}`}
      aria-label="Navigasi utama mobile"
      aria-hidden={isHidden}
      inert={isHidden}
    >
      <Link href="/" className={isExplore ? styles.active : undefined} aria-current={isExplore ? "page" : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
        <span>Jelajah</span>
      </Link>
      <Link href={isLoggedIn ? "/favorit" : "/login?returnTo=%2Ffavorit"} className={pathname === "/favorit" ? styles.active : undefined} aria-current={pathname === "/favorit" ? "page" : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
        <span>Favorit</span>
      </Link>
      <Link href={accountHref} className={pathname === "/akun" || pathname === "/login" ? styles.active : undefined} aria-current={pathname === "/akun" || pathname === "/login" ? "page" : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6.5 18a7 7 0 0 1 11 0"/></svg>
        <span>{isLoggedIn ? "Akun" : "Masuk"}</span>
      </Link>
    </nav>
    </>
  );
}
