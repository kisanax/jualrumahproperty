import type { PlatformRole } from "@prisma/client";

// =============================================================================
// KATALOG EVENT NOTIFIKASI — jualrumahproperty.com
//
// Preferensi per user disimpan di tabel notification_preferences.
// Absennya baris = memakai defaultEnabled dari katalog ini.
// Channel EMAIL & WHATSAPP disimpan sejak awal (siap provider), tapi
// pengiriman baru diaktifkan di fase berikutnya — saat ini IN_APP saja.
// =============================================================================

export type NotificationEventKey =
  | "LEAD_NEW"
  | "LISTING_STATUS_CHANGED"
  | "LISTING_PRICE_CHANGED"
  | "LISTING_EXPIRING"
  | "VERIFICATION_RESULT"
  | "USER_ACCOUNT_CHANGED";

export type NotificationEventDefinition = {
  key: NotificationEventKey;
  label: string;
  description: string;
  /** Untuk siapa event ini relevan (mengatur prefs yang ditawarkan per role). */
  roles: PlatformRole[];
  defaultEnabled: boolean;
};

export const NOTIFICATION_EVENTS: NotificationEventDefinition[] = [
  {
    key: "LEAD_NEW",
    label: "Leads baru",
    description: "Ada inquiry baru masuk pada listing yang kamu kelola.",
    roles: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
    defaultEnabled: true,
  },
  {
    key: "LISTING_STATUS_CHANGED",
    label: "Status listing berubah",
    description: "Listing berpindah status (aktif, negosiasi, terjual, dll).",
    roles: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
    defaultEnabled: true,
  },
  {
    key: "LISTING_PRICE_CHANGED",
    label: "Harga listing berubah",
    description: "Harga penawaran listing diperbarui.",
    roles: ["SUPER_ADMIN", "SUPPORT"],
    defaultEnabled: true,
  },
  {
    key: "LISTING_EXPIRING",
    label: "Listing mendekati berakhir",
    description: "Listing akan expired dalam waktu dekat.",
    roles: ["SUPER_ADMIN", "SUPPORT", "BROKER"],
    defaultEnabled: true,
  },
  {
    key: "VERIFICATION_RESULT",
    label: "Hasil verifikasi profil",
    description: "Profil broker diverifikasi / diminta revisi / ditolak.",
    roles: ["BROKER"],
    defaultEnabled: true,
  },
  {
    key: "USER_ACCOUNT_CHANGED",
    label: "Akun user berubah",
    description: "Akun dibuat, dinonaktifkan, atau berubah role.",
    roles: ["SUPER_ADMIN", "SUPPORT"],
    defaultEnabled: false,
  },
];

export function eventsForRole(role: PlatformRole): NotificationEventDefinition[] {
  return NOTIFICATION_EVENTS.filter((event) => event.roles.includes(role));
}
