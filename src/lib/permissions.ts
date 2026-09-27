import type { PlatformRole } from "@prisma/client";

// =============================================================================
// PERMISSION MATRIX — jualrumahproperty.com
//
// Model flat: MEMBER (portal) + SUPER_ADMIN / SUPPORT (staff) + BROKER.
//
// | Kemampuan                     | SUPER_ADMIN | SUPPORT | BROKER |
// |-------------------------------|:-----------:|:-------:|:------:|
// | Kelola user & role            |      ✅     |   ❌    |   ❌   |
// | Hapus permanen (hard delete)  |      ✅     |   ❌    |   ❌   |
// | Lihat & edit data operasional |      ✅     |   ✅    | terbatas |
// | Workspace broker terverifikasi|      ❌     |   ❌    |   ✅   |
// =============================================================================

export function isStaff(role: PlatformRole | undefined | null): boolean {
  return role === "SUPER_ADMIN" || role === "SUPPORT";
}

export function canManageUsers(role: PlatformRole | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}

export function canHardDelete(role: PlatformRole | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}

export const roleLabel: Record<PlatformRole, string> = {
  MEMBER: "Member",
  SUPER_ADMIN: "Super Admin",
  SUPPORT: "Support",
  BROKER: "Broker",
};
