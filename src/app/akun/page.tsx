import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import styles from "./account.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Akun Saya",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login");

  const destination = access.kind === "staff"
    ? { href: "/admin", label: "Buka admin panel" }
    : access.kind === "broker-verified"
      ? { href: "/admin", label: "Buka workspace broker" }
      : access.kind.startsWith("broker-")
        ? { href: "/login/redirect", label: "Lihat status pengajuan" }
        : { href: "/daftar-broker", label: "Menjadi broker" };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>jualrumahproperty</Link>
        <Link href="/" className={styles.back}>Kembali</Link>
      </header>
      <section className={styles.card}>
        <div className={styles.avatar}>{(access.user.name || access.user.email || "A").charAt(0).toUpperCase()}</div>
        <div>
          <p className={styles.kicker}>Akun saya</p>
          <h1>{access.user.name || "Pengguna"}</h1>
          <p className={styles.email}>{access.user.email}</p>
        </div>
        <div className={styles.actions}>
          <Link href={destination.href} className={styles.primary}>{destination.label}</Link>
          <Link href="/jual" className={styles.secondary}>Jelajahi properti</Link>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
          <button type="submit" className={styles.logout}>Keluar</button>
        </form>
      </section>
      <MobileBottomNav />
    </main>
  );
}
