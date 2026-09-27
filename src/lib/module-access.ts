import type { PlatformRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

// =============================================================================
// KONFIGURASI AKSES MODUL — jualrumahproperty.com
//
// Matriks role × modul, diedit SUPER_ADMIN via /admin/settings/module-access.
// Bila baris DB belum ada (mis. sebelum seed), fallback ke DEFAULTS di bawah.
// Enforcement: nav (AdminShell), halaman module, dan helper API.
// =============================================================================

export type ModuleKey =
  | "dashboard"
  | "brokers"
  | "users"
  | "properties"
  | "listings"
  | "auctions"
  | "owners"
  | "intermediaries"
  | "leads"
  | "customers"
  | "kawasan"
  | "notifications";

export type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  description: string;
  section: string;
};

export const MODULES: ModuleDefinition[] = [
  { key: "dashboard", label: "Dashboard", description: "Ringkasan statistik workspace", section: "Utama" },
  { key: "brokers", label: "Broker", description: "Direktori dan verifikasi akun broker", section: "Organisasi" },
  { key: "users", label: "Tim & Akses", description: "Kelola akun user dan role", section: "Organisasi" },
  { key: "properties", label: "Properti", description: "Database properti fisik", section: "Utama" },
  { key: "listings", label: "Listing", description: "Penawaran penjualan & workflow status", section: "Utama" },
  { key: "auctions", label: "Sitaan & Lelang", description: "Records lelang properti", section: "Utama" },
  { key: "owners", label: "Owner", description: "Data pemilik properti", section: "Pihak Terkait" },
  { key: "intermediaries", label: "Perantara", description: "Broker/agen perantara listing", section: "Pihak Terkait" },
  { key: "leads", label: "Leads (Kanban)", description: "Pipeline inquiry calon pembeli", section: "CRM" },
  { key: "customers", label: "Customer", description: "CRM calon pembeli", section: "CRM" },
  { key: "kawasan", label: "Kawasan", description: "Master kawasan populer", section: "Area & Lokasi" },
  { key: "notifications", label: "Notifikasi", description: "Preferensi notifikasi per user", section: "Pengaturan" },
];

/** Default bila belum ada konfigurasi di DB. users & module-access selalu SUPER_ADMIN. */
export const MODULE_DEFAULTS: Record<ModuleKey, PlatformRole[]> = {
  dashboard: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
  brokers: ["SUPER_ADMIN", "SUPPORT"],
  users: ["SUPER_ADMIN"],
  properties: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
  listings: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
  auctions: ["SUPER_ADMIN", "SUPPORT"],
  owners: ["SUPER_ADMIN", "SUPPORT"],
  intermediaries: ["SUPER_ADMIN", "SUPPORT"],
  leads: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
  customers: ["SUPER_ADMIN", "SUPPORT"],
  kawasan: ["SUPER_ADMIN", "SUPPORT"],
  notifications: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
};

/** Ambil set modul yang aktif untuk sebuah role (DB, fallback default). */
export async function getAccessibleModules(
  prisma: PrismaClient,
  role: PlatformRole
): Promise<Set<ModuleKey>> {
  const rows = await prisma.roleModuleAccess.findMany({ where: { role } });
  const accessible = new Set<ModuleKey>();

  for (const moduleDef of MODULES) {
    const row = rows.find((r) => r.moduleKey === moduleDef.key);
    if (row ? row.enabled : MODULE_DEFAULTS[moduleDef.key].includes(role)) {
      accessible.add(moduleDef.key);
    }
  }

  // Modul pengaturan super admin tidak bisa dimatikan lewat konfigurasi
  // (menghindari lockout) — selalu aktif untuk SUPER_ADMIN.
  if (role === "SUPER_ADMIN") accessible.add("users");

  return accessible;
}

/** Cek akses satu modul untuk sebuah role. */
export async function canAccessModule(
  prisma: PrismaClient,
  role: PlatformRole,
  moduleKey: ModuleKey
): Promise<boolean> {
  const accessible = await getAccessibleModules(prisma, role);
  return accessible.has(moduleKey);
}

export type ModuleMatrixEntry = {
  key: ModuleKey;
  label: string;
  description: string;
  section: string;
  byRole: Record<string, boolean>;
};

/** Matriks lengkap role × modul untuk halaman Konfigurasi Akses & API. */
export async function getModuleMatrix(prisma: PrismaClient): Promise<ModuleMatrixEntry[]> {
  const rows = await prisma.roleModuleAccess.findMany();
  const roles: PlatformRole[] = ["SUPER_ADMIN", "SUPPORT", "BROKER"];

  return MODULES.map((moduleDef) => {
    const byRole: Record<string, boolean> = {};
    for (const role of roles) {
      const row = rows.find((r) => r.role === role && r.moduleKey === moduleDef.key);
      byRole[role] = row
        ? row.enabled
        : MODULE_DEFAULTS[moduleDef.key].includes(role);
    }
    return {
      key: moduleDef.key,
      label: moduleDef.label,
      description: moduleDef.description,
      section: moduleDef.section,
      byRole,
    };
  });
}
