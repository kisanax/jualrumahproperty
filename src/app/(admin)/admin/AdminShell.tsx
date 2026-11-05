"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  Gavel,
  Users,
  UserCheck,
  Handshake,
  MessageSquare,
  Sparkles,
  Menu,
  X,
  Home,
  UsersRound,
  Network,
  Bell,
  SlidersHorizontal,
  FileSignature,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, type Crumb } from "@/components/admin-ui/Breadcrumb";
import ThemeToggle from "./ThemeToggle";

// =============================================================================
// Navigation Config
// =============================================================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  section?: string;
  /** Kunci modul untuk filter via Konfigurasi Akses (lib/module-access.ts). */
  moduleKey?: string;
  /** true = selalu & hanya SUPER_ADMIN (tidak bisa dimatikan lewat konfigurasi). */
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, section: "Utama", moduleKey: "dashboard" },
  { label: "Broker", href: "/admin/brokers", icon: Network, section: "Organisasi", moduleKey: "brokers" },
  { label: "Tim & Akses", href: "/admin/users", icon: UsersRound, section: "Organisasi", moduleKey: "users", superAdminOnly: true },
  { label: "Properti", href: "/admin/properties", icon: Building2, section: "Utama", moduleKey: "properties" },
  { label: "Listing", href: "/admin/listings", icon: ListChecks, section: "Utama", moduleKey: "listings" },
  { label: "Sitaan & Lelang", href: "/admin/auctions", icon: Gavel, section: "Utama", moduleKey: "auctions" },
  { label: "Owner", href: "/admin/owners", icon: Users, section: "Pihak Terkait", moduleKey: "owners" },
  { label: "Perantara", href: "/admin/intermediaries", icon: Handshake, section: "Pihak Terkait", moduleKey: "intermediaries" },
  { label: "Leads (Kanban)", href: "/admin/leads", icon: MessageSquare, section: "CRM", moduleKey: "leads" },
  { label: "Customer", href: "/admin/customers", icon: UserCheck, section: "CRM", moduleKey: "customers" },
  { label: "Kawasan", href: "/admin/kawasan", icon: Sparkles, section: "Area & Lokasi", moduleKey: "kawasan" },
  { label: "Konfigurasi Akses", href: "/admin/settings/module-access", icon: SlidersHorizontal, section: "Pengaturan", superAdminOnly: true },
  { label: "Pengaturan Notifikasi", href: "/admin/settings/notifications", icon: Bell, section: "Pengaturan", moduleKey: "notifications" },
  { label: "Template Perjanjian", href: "/admin/agreements/templates", icon: FileSignature, section: "Pengaturan", superAdminOnly: true },
];

// Bottom nav shows 4 core items + 1 "Menu" trigger that opens the full sidebar drawer
const bottomNavItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, moduleKey: "dashboard" },
  { label: "Properti", href: "/admin/properties", icon: Building2, moduleKey: "properties" },
  { label: "Listing", href: "/admin/listings", icon: ListChecks, moduleKey: "listings" },
  { label: "Leads", href: "/admin/leads", icon: MessageSquare, moduleKey: "leads" },
  { label: "Menu", href: "#menu", icon: Menu, isTrigger: true },
];

// Label breadcrumb per segmen URL (di luar /admin).
const CRUMB_LABELS: Record<string, string> = {
  properties: "Properti",
  listings: "Listing",
  auctions: "Sitaan & Lelang",
  owners: "Owner",
  intermediaries: "Perantara",
  customers: "Customer",
  kawasan: "Kawasan",
  leads: "Leads",
  users: "Tim & Akses",
  brokers: "Broker",
  settings: "Pengaturan",
  notifications: "Notifikasi",
  "module-access": "Konfigurasi Akses",
  agreements: "Perjanjian",
  templates: "Template",
  new: "Tambah Baru",
  import: "Import CSV",
  "smart-import": "Smart Paste WA",
};

// Segmen UUID = halaman detail resource → crumb dirender oleh DetailHeader halaman tsb.
const UUID_SEGMENT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


// =============================================================================
// AdminShell Component
// =============================================================================

export default function AdminShell({
  children,
  platformRole,
  userName,
  userEmail,
  accessibleModules = [],
}: {
  children: React.ReactNode;
  platformRole?: string;
  userName?: string | null;
  userEmail?: string | null;
  /** Daftar moduleKey yang aktif untuk role ini (dari Konfigurasi Akses). */
  accessibleModules?: string[];
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const navFilterRef = useRef<HTMLInputElement>(null);

  const displayName = userName?.trim() || userEmail?.split("@")[0] || "Pengguna";
  const userInitial = displayName.charAt(0).toUpperCase();

  // ---- Breadcrumb otomatis dari pathname (ala Cloudflare) ----
  // Halaman detail (ada segmen UUID) tidak memakai crumb otomatis —
  // DetailHeader halaman tersebut merender crumb sendiri dengan kode resource.
  const crumbs = useMemo<Crumb[]>(() => {
    const segs = pathname.split("/").filter(Boolean);
    if (segs[0] !== "admin") return [];
    const tail = segs.slice(1);
    if (tail.length === 0) return []; // dashboard: tanpa breadcrumb
    if (tail.some((seg) => UUID_SEGMENT_RE.test(seg))) return []; // detail page
    const labels: Record<string, string> = CRUMB_LABELS;
    let path = "/admin";
    const out: Crumb[] = [{ label: "Admin", href: "/admin" }];
    tail.forEach((seg, i) => {
      path += `/${seg}`;
      const isLast = i === tail.length - 1;
      out.push({ label: labels[seg] || seg, href: isLast ? undefined : path });
    });
    return out;
  }, [pathname]);

  // ---- Persist state lipat section nav ----
  // Memuat preferensi UI tersimpan sekali saat mount (client-only);
  // lazy initializer menimbulkan hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin-nav-collapsed");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi sekali dengan localStorage saat mount
      if (raw) setCollapsedSections(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore corrupted storage
    }
  }, []);

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem("admin-nav-collapsed", JSON.stringify(next));
      } catch {
        // ignore storage failure
      }
      return next;
    });
  }, []);

  // Tombol "/" memfokuskan filter sidebar (ala Cloudflare docs)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        navFilterRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // Filter menu sesuai konfigurasi akses modul.
  // Item ber-flag superAdminOnly (Tim & Akses, Konfigurasi Akses) selalu & hanya SUPER_ADMIN.
  const visibleNavItems = navItems.filter((item) => {
    if (item.superAdminOnly) return platformRole === "SUPER_ADMIN";
    if (item.moduleKey) return accessibleModules.includes(item.moduleKey);
    return true;
  });
  const visibleBottomNavItems = bottomNavItems.filter(
    (item) => !item.moduleKey || accessibleModules.includes(item.moduleKey)
  );

  // Group nav items by section
  const sections = visibleNavItems.reduce(
    (acc, item) => {
      const section = item.section || "Lainnya";
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>
  );

  // Filter menu (kotak "Filter menu" ala Cloudflare docs) — saat aktif,
  // semua section diperlakukan terbuka dan section kosong disembunyikan.
  const navFilter = navQuery.trim().toLowerCase();
  const isFiltering = navFilter.length > 0;
  const sectionEntries = Object.entries(sections);
  const displaySections = isFiltering
    ? sectionEntries
        .map(
          ([section, items]) =>
            [
              section,
              items.filter(
                (item) =>
                  item.label.toLowerCase().includes(navFilter) ||
                  item.href.toLowerCase().includes(navFilter)
              ),
            ] as const
        )
        .filter(([, items]) => items.length > 0)
    : sectionEntries;

  return (
    <>
      {/* ---- Sidebar Overlay (Mobile/Tablet) ---- */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* ---- Sidebar ---- */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-logo">
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: 12,
              background: "var(--color-admin-accent)",
              color: "var(--color-admin-accent-text)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 2px 8px rgba(197, 32, 4, 0.35)",
            }}
          >
            <Home size={20} />
          </div>
          <div>
            <h1>jualrumahproperty</h1>
            <span>Broker Workspace</span>
          </div>
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="admin-menu-toggle ml-auto"
            onClick={closeSidebar}
            aria-label="Tutup menu"
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-filter">
            <input
              ref={navFilterRef}
              type="text"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Filter menu…"
              aria-label="Filter menu navigasi"
            />
            <kbd aria-hidden="true">/</kbd>
          </div>
          {displaySections.map(([section, items]) => {
            const collapsed = !isFiltering && Boolean(collapsedSections[section]);
            return (
              <div key={section} className="admin-nav-section">
                <button
                  type="button"
                  className="admin-nav-section-toggle"
                  onClick={() => toggleSection(section)}
                  aria-expanded={!collapsed}
                >
                  {section}
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {items.map((item) => {
                  if (collapsed) return null;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-nav-item ${isActive(item.href) ? "active" : ""}`}
                      onClick={closeSidebar}
                    >
                      <Icon className="nav-icon" size={20} />
                      {item.label}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="admin-nav-badge">{item.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
          {displaySections.length === 0 && (
            <div className="admin-dt-muted" style={{ padding: "8px 10px", fontSize: 12.5 }}>
              Tidak ada menu yang cocok.
            </div>
          )}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-account">
            <div className="admin-user-avatar" aria-hidden="true">{userInitial}</div>
            <div className="admin-sidebar-account-copy">
              <strong>{displayName}</strong>
              {userEmail && <span>{userEmail}</span>}
            </div>
          </div>
          <ThemeToggle showLabel />
          <Button
            type="button"
            variant="ghost"
            className="admin-nav-item admin-logout-button"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="nav-icon" size={20} aria-hidden="true" />
            {isSigningOut ? "Keluar..." : "Keluar dari akun"}
          </Button>
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <Button
              variant="ghost"
              size="icon"
              className="admin-menu-toggle"
              onClick={toggleSidebar}
              aria-label="Buka menu"
            >
              <Menu size={22} aria-hidden="true" />
            </Button>
            <div className="admin-topbar-brand">
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>jualrumahproperty</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-admin-accent)", marginLeft: 6, textTransform: "uppercase" }}>Workspace</span>
            </div>
          </div>
          <div className="admin-topbar-right">
            <ThemeToggle />
            <div
              className="admin-user-avatar"
              title={`${displayName}${userEmail ? ` — ${userEmail}` : ""}`}
              style={{
                flexShrink: 0,
              }}
            >
              {userInitial}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content">
          {crumbs.length > 0 && <Breadcrumb items={crumbs} />}
          {children}
        </div>
      </main>

      {/* ---- Bottom Navigation (Mobile) ---- */}
      <nav className="admin-bottom-nav">
        <div className="admin-bottom-nav-inner">
          {visibleBottomNavItems.map((item) => {
            const Icon = item.icon;
            if (item.isTrigger) {
              return (
                <Button
                  key="menu-trigger"
                  type="button"
                  variant="ghost"
                  onClick={toggleSidebar}
                  className={`admin-bottom-nav-item ${sidebarOpen ? "active" : ""}`}
                  aria-label="Menu Lengkap"
                >
                  <Icon className="nav-icon" size={22} aria-hidden="true" />
                  <span>{item.label}</span>
                </Button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-bottom-nav-item ${isActive(item.href) ? "active" : ""}`}
              >
                <Icon className="nav-icon" size={22} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </>
  );
}
