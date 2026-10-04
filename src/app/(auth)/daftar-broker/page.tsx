import Link from "next/link";
import { googleEnabled } from "@/auth";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import BrandLogo from "@/components/portal/BrandLogo";
import styles from "../auth.module.css";
import { beginBrokerApplication, continueWithGoogle } from "./actions";
import GoogleMark from "./GoogleMark";

export default async function BrokerRegistrationPage({ searchParams }: PageProps<"/daftar-broker">) {
  const access = await getAccountAccess();
  if (access.kind === "staff" || access.kind === "broker-verified") redirect("/login/redirect");
  if (access.kind.startsWith("broker-")) redirect("/login/redirect");

  const query = await searchParams;
  const configurationMissing = query.error === "google-not-configured" || !googleEnabled;

  return (
    <section className={styles.card}>
      <header className={styles.brand}><BrandLogo /></header>
      <div className={styles.body}>
        <p className={styles.eyebrow}>Daftar Broker</p>
        <h1 className={styles.title}>Bergabung sebagai Broker</h1>
        <p className={styles.description}>
          Buat atau gunakan akun Member, lalu lengkapi profil broker untuk ditinjau tim internal.
        </p>

        {access.kind === "member" ? (
          <>
            <div className={styles.account}>
              <span className={styles.avatar}>{(access.user.name || access.user.email || "M").charAt(0).toUpperCase()}</span>
              <div><strong>{access.user.name || "Member"}</strong><span>{access.user.email}</span></div>
            </div>
            <form action={beginBrokerApplication}>
              <button type="submit" className={styles.primaryButton}>Mulai pengajuan broker</button>
            </form>
            <p className={styles.googleHint}>Profil member ini akan digunakan untuk pengajuan. Setelah konfirmasi, lengkapi data broker untuk ditinjau tim internal.</p>
          </>
        ) : (
          <>
            {googleEnabled && (
              <form action={continueWithGoogle}>
                <button type="submit" className={styles.googleButton}>
                  <GoogleMark className={styles.googleIcon} />
                  Lanjutkan dengan Google
                </button>
              </form>
            )}
            {configurationMissing && (
              <>
                <Link href="/daftar?returnTo=%2Fdaftar-broker" className={styles.primaryButton}>Daftar dengan email</Link>
                <p className={styles.googleHint}>Akun dibuat sebagai Member terlebih dahulu, kemudian dilanjutkan ke pengajuan Broker.</p>
              </>
            )}
          </>
        )}

        <p className={styles.legal}>
          Sudah punya akun?{" "}
          <Link href="/login?returnTo=%2Fdaftar-broker" className={styles.modeToggle}>Masuk ke akun</Link>
        </p>
      </div>
    </section>
  );
}
