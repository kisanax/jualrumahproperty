import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import BrandLogo from "@/components/portal/BrandLogo";
import styles from "../../auth.module.css";

const content = {
  "broker-pending": {
    eyebrow: "Menunggu verifikasi",
    title: "Profil sedang ditinjau",
    description: "Tim internal sedang memeriksa data Anda. Workspace akan terbuka setelah profil disetujui.",
  },
  "broker-rejected": {
    eyebrow: "Verifikasi ditolak",
    title: "Profil belum dapat disetujui",
    description: "Hubungi tim Jual Rumah Property bila Anda memerlukan penjelasan atau ingin mengajukan peninjauan ulang.",
  },
  "broker-suspended": {
    eyebrow: "Akses ditangguhkan",
    title: "Workspace sedang ditangguhkan",
    description: "Akses operasional akun ini dihentikan sementara. Hubungi tim Jual Rumah Property untuk bantuan.",
  },
} as const;

export default async function BrokerStatusPage() {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login");
  if (access.kind === "member") redirect("/daftar-broker");
  if (access.kind === "staff" || access.kind === "broker-verified") redirect("/login/redirect");
  if (access.kind === "broker-incomplete" || access.kind === "broker-revision") redirect("/onboarding");

  const status = content[access.kind];

  return (
    <section className={styles.card}>
      <header className={styles.brand}><BrandLogo /></header>
      <div className={styles.body}>
        <p className={styles.eyebrow}>{status.eyebrow}</p>
        <h1 className={styles.title}>{status.title}</h1>
        <p className={styles.description}>{status.description}</p>
        <div className={styles.account}>
          <span className={styles.avatar}>{(access.user.name || access.user.email || "B").charAt(0).toUpperCase()}</span>
          <div><strong>{access.user.name || "Broker"}</strong><span>{access.user.email}</span></div>
        </div>
        <Link className={styles.primaryButton} href="/">Kembali ke beranda</Link>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className={styles.textButton} type="submit">Keluar dari akun</button>
        </form>
      </div>
    </section>
  );
}
