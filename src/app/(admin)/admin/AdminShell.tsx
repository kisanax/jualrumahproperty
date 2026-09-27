"use client";

import { useState, useCallback, useEffect } from "react";
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
  LogOut,
} from "lucide-react";
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
];

// Bottom nav shows 4 core items + 1 "Menu" trigger that opens the full sidebar drawer
const bottomNavItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, moduleKey: "dashboard" },
  { label: "Properti", href: "/admin/properties", icon: Building2, moduleKey: "properties" },
  { label: "Listing", href: "/admin/listings", icon: ListChecks, moduleKey: "listings" },
  { label: "Leads", href: "/admin/leads", icon: MessageSquare, moduleKey: "leads" },
  { label: "Menu", href: "#menu", icon: Menu, isTrigger: true },
];


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

  const displayName = userName?.trim() || userEmail?.split("@")[0] || "Pengguna";
  const userInitial = displayName.charAt(0).toUpperCase();

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
          <Home size={22} style={{ color: "var(--color-admin-accent)" }} />
          <div>
            <h1>jualrumahproperty</h1>
            <span>Broker Workspace</span>
          </div>
          {/* Close button for mobile */}
          <button
            className="admin-menu-toggle"
            onClick={closeSidebar}
            aria-label="Tutup menu"
            style={{ marginLeft: "auto" }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} className="admin-nav-section">
              <div className="admin-nav-section-title">{section}</div>
              {items.map((item) => {
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
          ))}
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
          <button
            type="button"
            className="admin-nav-item admin-logout-button"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="nav-icon" size={20} />
            {isSigningOut ? "Keluar..." : "Keluar dari akun"}
          </button>
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-toggle"
              onClick={toggleSidebar}
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
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
        <div className="admin-content">{children}</div>
      </main>

      {/* ---- Bottom Navigation (Mobile) ---- */}
      <nav className="admin-bottom-nav">
        <div className="admin-bottom-nav-inner">
          {visibleBottomNavItems.map((item) => {
            const Icon = item.icon;
            if (item.isTrigger) {
              return (
                <button
                  key="menu-trigger"
                  type="button"
                  onClick={toggleSidebar}
                  className={`admin-bottom-nav-item ${sidebarOpen ? "active" : ""}`}
                  aria-label="Menu Lengkap"
                  style={{ background: "none", border: "none", cursor: "pointer", width: "100%" }}
                >
                  <Icon className="nav-icon" size={22} />
                  <span>{item.label}</span>
                </button>
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
