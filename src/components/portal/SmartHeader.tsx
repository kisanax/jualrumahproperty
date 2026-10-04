"use client";

import { useState, useEffect, type ReactNode } from "react";
import styles from "./SmartHeader.module.css";

interface SmartHeaderProps {
  logoSlot: ReactNode;
  navSlot: ReactNode;
  searchSlot: ReactNode;
  compactSearchSlot: ReactNode;
  mobileNavSlot: ReactNode;
}

export default function SmartHeader({
  logoSlot,
  navSlot,
  searchSlot,
  compactSearchSlot,
  mobileNavSlot,
}: SmartHeaderProps) {
  const [atScrollTop, setAtScrollTop] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let isScrolled = false;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;

          // Hysteresis prevents oscillation flicker:
          // Scroll DOWN: collapse only after passing 70px
          // Scroll UP: expand only when returned near the very top (<= 15px)
          if (!isScrolled && scrollY > 70) {
            isScrolled = true;
            setAtScrollTop(false);
          } else if (isScrolled && scrollY <= 15) {
            isScrolled = false;
            setAtScrollTop(true);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    if (window.scrollY > 70) {
      window.requestAnimationFrame(() => {
        isScrolled = true;
        setAtScrollTop(false);
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleSearchState = (event: Event) => {
      setSearchOpen((event as CustomEvent<{ open: boolean }>).detail.open);
    };

    window.addEventListener("portal-search-state", handleSearchState);
    return () => window.removeEventListener("portal-search-state", handleSearchState);
  }, []);

  return (
    <header
      className={styles.header}
      data-at-scroll-top={atScrollTop ? "true" : "false"}
      data-search-open={searchOpen ? "true" : "false"}
    >
      <div className={styles.mobileTopBar}>
        <div className={styles.mobileBrand}>{logoSlot}</div>
        <div className={styles.mobileNav}>{mobileNavSlot}</div>
      </div>

      {/* ─── ROW 1: Top Bar (Logo | Center Pill | Profile/Nav) ─── */}
      <div className={styles.topBar}>
        <div className={styles.logoCol}>{logoSlot}</div>

        <div className={styles.searchPill}>
          {compactSearchSlot}
        </div>

        <div className={styles.navCol}>{navSlot}</div>
      </div>

      {/* ─── ROW 2: Expanded Search Bar (Collapses smoothly on scroll) ─── */}
      <div className={styles.searchRow}>
        <div className={styles.searchExpanded}>
          {searchSlot}
        </div>
      </div>
    </header>
  );
}
