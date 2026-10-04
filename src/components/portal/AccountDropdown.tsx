"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useId } from "react";
import { signOut } from "next-auth/react";
import styles from "./AccountDropdown.module.css";

interface AccountDropdownProps {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  platformRole?: string | null;
  isLoggedIn?: boolean;
}

export default function AccountDropdown({
  userName,
  userEmail,
  platformRole,
  isLoggedIn = false,
}: AccountDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const roleLabel =
    platformRole === "SUPER_ADMIN"
      ? "Super Admin"
      : platformRole === "SUPPORT"
      ? "Support"
      : platformRole === "BROKER"
      ? "Agen Terverifikasi"
      : platformRole === "MEMBER"
      ? "Member"
      : "Pengguna";
  const isMember = platformRole === "MEMBER";

  return (
    <div ref={ref} className={styles.accContainer}>
      {/* ─── Pure Round Burger Button [ ☰ ] (Identical to Airbnb) ─── */}
      <button
        ref={triggerRef}
        type="button"
        className={styles.burgerBtn}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={isLoggedIn ? "Menu Akun Pengguna" : "Buka Menu Navigasi"}
      >
        <div className={styles.burgerLines} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </button>

      {/* ─── Airbnb-Style Floating Dropdown Card ─── */}
      {open && (
        <nav className={styles.menuCard} id={menuId} aria-label="Menu akun dan navigasi">
          {isLoggedIn ? (
            /* Logged-In Menu: Clean Text Info, No Ellipses */
            <>
              <div className={styles.userHeader}>
                <div className={styles.userName}>{userName || "Admin"}</div>
                {userEmail && <div className={styles.userEmail}>{userEmail}</div>}
                <span className={styles.userRoleBadge}>{roleLabel}</span>
              </div>

              <div className={styles.menuDivider} />

              <Link href="/jual" className={styles.menuItem} onClick={() => setOpen(false)}>
                Jelajahi Properti
              </Link>

              <Link
                href={isMember ? "/akun" : "/admin"}
                className={`${styles.menuItem} ${styles.menuItemBold}`}
                onClick={() => setOpen(false)}
              >
                {isMember ? "Akun Saya" : "Dashboard Operasional"}
              </Link>

              {isMember ? (
                <Link href="/daftar-broker" className={styles.menuItem} onClick={() => setOpen(false)}>
                  Menjadi Broker
                </Link>
              ) : (
                <>
                  <Link href="/admin/properties" className={styles.menuItem} onClick={() => setOpen(false)}>
                    Kelola Properti
                  </Link>
                  <Link href="/admin/settings" className={styles.menuItem} onClick={() => setOpen(false)}>
                    Pengaturan Akun
                  </Link>
                </>
              )}

              <a
                href="https://wa.me/6281234567890?text=Halo%20Jual%20Rumah%20Property%2C%20saya%20butuh%20bantuan."
                target="_blank"
                rel="noreferrer"
                className={styles.menuItem}
                onClick={() => setOpen(false)}
              >
                <svg
                  className={styles.menuIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2.2-2.5 3v1" />
                  <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
                </svg>
                Pusat Bantuan
              </a>

              <div className={styles.menuDivider} />

              <button
                type="button"
                className={`${styles.menuItem} ${styles.logoutBtn}`}
                onClick={() => signOut({ callbackUrl: "/" })}
                role="menuitem"
              >
                Keluar
              </button>
            </>
          ) : (
            /* Guest (Not Logged In) Menu — Matches Airbnb Exactly */
            <>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Jual%20Rumah%20Property%2C%20saya%20butuh%20bantuan."
                target="_blank"
                rel="noreferrer"
                className={styles.menuItem}
                onClick={() => setOpen(false)}
              >
                <svg
                  className={styles.menuIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2.2-2.5 3v1" />
                  <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
                </svg>
                Pusat Bantuan
              </a>

              <div className={styles.menuDivider} />

              <Link
                href="/daftar-broker"
                className={styles.promoItem}
                onClick={() => setOpen(false)}
              >
                <div className={styles.promoContent}>
                  <span className={styles.promoTitle}>Jadi Agen Properti</span>
                  <span className={styles.promoSubtitle}>
                    Mulai listing & raih komisi di kawasan elit Jakarta Selatan.
                  </span>
                </div>
              </Link>

              <a
                href="https://wa.me/6281234567890?text=Halo%20Jual%20Rumah%20Property%2C%20saya%20ingin%20konsultasi%20titip%20jual."
                target="_blank"
                rel="noreferrer"
                className={styles.menuItem}
                onClick={() => setOpen(false)}
              >
                Titip Jual Properti
              </a>

              <div className={styles.menuDivider} />

              <Link href="/jual" className={styles.menuItem} onClick={() => setOpen(false)}>
                Jelajahi Properti
              </Link>

              <Link
                href="/login"
                className={`${styles.menuItem} ${styles.menuItemBold}`}
                onClick={() => setOpen(false)}
              >
                Masuk atau Daftar
              </Link>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
