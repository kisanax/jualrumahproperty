"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ShieldCheck, UserRound } from "lucide-react";
import {
  Button,
  ButtonLink,
  FormSection,
  RecordHeader,
  RecordPage,
  StatusBadge,
  UnderlineField,
  type StatusTone,
} from "@/components/admin-ui";
import { roleLabel } from "@/lib/permissions";
import { accountStatus, type AccountUser, type UserAccountStatus } from "@/modules/users/types";
import styles from "./worksheet.module.css";

const statusTone: Record<UserAccountStatus, StatusTone> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DELETED: "neutral",
};

const statusLabel: Record<UserAccountStatus, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Nonaktif",
  DELETED: "Terhapus",
};

const verificationLabel: Record<string, string> = {
  PROFILE_INCOMPLETE: "Profil belum lengkap",
  PENDING_REVIEW: "Menunggu review",
  REVISION_REQUIRED: "Perlu revisi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  SUSPENDED: "Ditangguhkan",
};

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

const permissionSummary: Record<string, string[]> = {
  MEMBER: ["Akses portal publik", "Simpan favorit dan kelola akun", "Dapat mengajukan diri menjadi broker"],
  SUPER_ADMIN: [
    "Kelola user, role, dan status akun",
    "Hapus permanen data (hard delete)",
    "Lihat & edit seluruh data operasional",
  ],
  SUPPORT: [
    "Lihat & edit seluruh data operasional",
    "Kelola properti, listing, CRM",
    "Tidak dapat kelola user & hapus permanen",
  ],
  BROKER: ["Workspace operasional setelah verifikasi", "Akses modul broker sesuai konfigurasi"],
};

export default function UserWorksheet({
  user,
  mode = "edit",
  isSelf = false,
  defaultRole = "MEMBER",
}: {
  user?: AccountUser;
  mode?: "edit" | "create";
  isSelf?: boolean;
  defaultRole?: AccountUser["platformRole"];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isCreate = mode === "create";
  const currentStatus = user ? accountStatus(user) : "ACTIVE";
  const [effectiveRole, setEffectiveRole] = useState(user?.platformRole ?? defaultRole);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim().toLowerCase(),
      platformRole: String(form.get("platformRole") || "MEMBER"),
    };
    const password = String(form.get("password") || "");
    if (password) payload.password = password;
    const verificationStatus = form.get("verificationStatus");
    if (!isCreate && user!.platformRole === "BROKER" && effectiveRole === "BROKER" && verificationStatus) {
      payload.verificationStatus = String(verificationStatus);
    }

    try {
      const res = await fetch(isCreate ? "/api/users" : `/api/users/${user!.id}`, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan user.");
        return;
      }

      if (isCreate) {
        router.push(`/admin/users/${data.user.id}`);
        router.refresh();
      } else {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2400);
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  }

  async function mutate(payload: Record<string, unknown>, successMessage: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memperbarui status.");
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
    void successMessage;
  }

  async function hardDelete() {
    if (!window.confirm("Hapus permanen akun ini? Tindakan tidak bisa dibatalkan. Jika akun masih terikat data historis, gunakan hapus-logis.")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user!.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menghapus user.");
        return;
      }
      router.push("/admin/users");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RecordPage>
      <form onSubmit={handleSubmit}>
        <RecordHeader
          eyebrow={isCreate ? "Buat akun baru" : "Akun user"}
          title={isCreate ? "Akun baru" : user!.name || "(tanpa nama)"}
          subtitle={isCreate ? "Identitas, role, dan akses awal" : `${roleLabel[user!.platformRole]} · ${user!.email}`}
          crumbs={
            isCreate
              ? undefined
              : [
                  { label: "Admin", href: "/admin" },
                  { label: "Tim & Akses", href: "/admin/users" },
                  { label: user!.name || "(tanpa nama)" },
                ]
          }
          status={isCreate ? undefined : <StatusBadge tone={statusTone[currentStatus]}>{statusLabel[currentStatus]}</StatusBadge>}
          actions={
            <div className={styles.desktopActions}>
              <Button type="submit" disabled={busy}>
                <Check size={17} /> {isCreate ? "Buat akun" : "Simpan perubahan"}
              </Button>
            </div>
          }
        />

        <FormSection title="Identitas & akses" description="Email dipakai untuk login (kredensial atau Google).">
          <div className="ui-form-grid">
            <UnderlineField name="name" label="Nama lengkap" defaultValue={isCreate ? "" : user!.name ?? ""} required />
            <UnderlineField
              name="email"
              label="Email"
              type="email"
              defaultValue={isCreate ? "" : user!.email ?? ""}
              required
              hint={isCreate ? undefined : "Mengubah email mengubah kredensial login akun."}
            />
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Role platform</span>
              <select
                className={selectClass}
                name="platformRole"
                value={effectiveRole}
                onChange={(event) => setEffectiveRole(event.target.value as AccountUser["platformRole"])}
              >
                {Object.entries(roleLabel).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">Menentukan izin akun — lihat ringkasan izin di bawah.</span>
            </label>
            <UnderlineField
              name="password"
              label={isCreate ? "Password awal (opsional)" : "Reset password (opsional)"}
              type="password"
              minLength={8}
              hint="Min. 8 karakter. Kosongkan bila akun menggunakan login Google."
            />
          </div>
        </FormSection>

        {!isCreate && (
          <FormSection title="Ringkasan izin" description="Permission efektif dari role yang dipilih.">
            <div className={styles.permissionList}>
              {(permissionSummary[effectiveRole] ?? []).map((item) => (
                <span key={item}>
                  <ShieldCheck size={17} /> {item}
                </span>
              ))}
            </div>
          </FormSection>
        )}

        {!isCreate && (
          <FormSection title="Status akun" description="Nonaktif = tidak bisa login. Hapus-logis = arsip untuk audit trail.">
            <div className={styles.statusActions}>
              {currentStatus === "DELETED" ? (
                <Button type="button" variant="secondary" disabled={busy} onClick={() => mutate({ deletedAt: false }, "restored")}>
                  Pulihkan akun
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || isSelf}
                    onClick={() => mutate({ isActive: currentStatus !== "ACTIVE" }, "toggled")}
                  >
                    {currentStatus === "ACTIVE" ? "Nonaktifkan akun" : "Aktifkan kembali"}
                  </Button>
                  <Button type="button" variant="danger" disabled={busy || isSelf} onClick={() => mutate({ deletedAt: true }, "deleted")}>
                    Hapus-logis (arsipkan)
                  </Button>
                </>
              )}
              {isSelf && <span className={styles.selfNote}>Akun sendiri tidak bisa dinonaktifkan / dihapus dari halaman ini.</span>}
            </div>
          </FormSection>
        )}

        {!isCreate && user!.platformRole === "BROKER" && effectiveRole === "BROKER" && (
          <FormSection title="Profil broker" description="Verifikasi menentukan apakah broker dapat membuka workspace operasional.">
            <div className="ui-form-grid ui-form-grid--single">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Status verifikasi</span>
                <select
                  className={selectClass}
                  name="verificationStatus"
                  defaultValue={user!.brokerProfile?.verificationStatus ?? "PROFILE_INCOMPLETE"}
                >
                  {Object.entries(verificationLabel).map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">Hanya status Terverifikasi yang membuka akses workspace.</span>
              </label>
              <UnderlineField label="Jenis akun" value={user!.brokerProfile?.brokerType === "AGENCY_OWNER" ? "Pemilik kantor / agency" : user!.brokerProfile?.brokerType === "AGENCY_MEMBER" ? "Anggota kantor / agency" : user!.brokerProfile?.brokerType === "INDEPENDENT" ? "Broker independen" : "—"} disabled />
              <UnderlineField label="Nomor WhatsApp" value={user!.brokerProfile?.phone ?? "—"} disabled />
              <UnderlineField label="Kota operasional" value={user!.brokerProfile?.city ? `${user!.brokerProfile.city}${user!.brokerProfile.province ? `, ${user!.brokerProfile.province}` : ""}` : "—"} disabled />
            </div>
          </FormSection>
        )}

        {!isCreate && (
          <FormSection title="Zona berbahaya" description="Hapus permanen menghapus baris dari database. Gunakan hanya bila tidak ada data historis terkait.">
            <div className={styles.statusActions}>
              <Button type="button" variant="danger" disabled={busy || isSelf} onClick={hardDelete}>
                <AlertTriangle size={17} /> Hapus permanen
              </Button>
            </div>
          </FormSection>
        )}

        <div className={styles.mobileActions}>
          <ButtonLink href="/admin/users" variant="secondary">
            Batal
          </ButtonLink>
          <Button type="submit" disabled={busy}>
            <Check size={17} /> {isCreate ? "Buat akun" : "Simpan"}
          </Button>
        </div>

        {error && (
          <div className={styles.toast} role="alert">
            <AlertTriangle size={17} /> {error}
          </div>
        )}
        {saved && (
          <div className={styles.toast} role="status">
            <UserRound size={17} /> Perubahan tersimpan
          </div>
        )}
      </form>
    </RecordPage>
  );
}
