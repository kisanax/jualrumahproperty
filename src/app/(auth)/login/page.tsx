import Link from "next/link";
import { googleEnabled } from "@/auth";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import BrandLogo from "@/components/portal/BrandLogo";
import styles from "../auth.module.css";
import { signInWithEmail, signInWithGoogle } from "./actions";
import GoogleMark from "../daftar-broker/GoogleMark";
import MobileBottomNav from "@/components/portal/MobileBottomNav";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const access = await getAccountAccess();
  if (access.kind === "member") redirect("/akun");
  if (access.kind === "staff" || access.kind === "broker-verified") redirect("/admin");
  if (access.kind === "broker-incomplete" || access.kind === "broker-revision") redirect("/onboarding");
  if (access.kind.startsWith("broker-")) redirect("/onboarding/status");

  const query = await searchParams;
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : "";
  return (
    <section className={`${styles.card} ${styles.loginCard}`}>
      <Link href="/" className={styles.loginClose} aria-label="Tutup dan kembali ke beranda">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </Link>

      <div className={styles.loginBody}>
        <BrandLogo />
        <h1 className={styles.loginTitle}>Masuk ke jualrumahproperty.com</h1>

        <form action={signInWithEmail} className={styles.loginForm}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className={styles.field}>
            <label htmlFor="email" className={styles.srOnly}>Email atau username</label>
            <input id="email" name="email" className={styles.loginInput} type="text" inputMode="email" autoComplete="username" required placeholder="Email atau username" />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.srOnly}>Kata sandi</label>
            <input id="password" name="password" className={styles.loginInput} type="password" autoComplete="current-password" required minLength={4} placeholder="Kata sandi" />
          </div>
          {query.error === "invalid-credentials" && (
            <p className={styles.formError} role="alert">Email atau password tidak sesuai.</p>
          )}
          <button type="submit" className={styles.primaryButton}>Masuk</button>
        </form>

        {googleEnabled && (
          <>
            <div className={`${styles.divider} ${styles.loginDivider}`}><span>atau</span></div>
            <form action={signInWithGoogle} className={styles.socialLogin}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className={styles.googleIconButton} aria-label="Masuk dengan Google" title="Masuk dengan Google">
                <GoogleMark className={styles.googleIcon} />
              </button>
            </form>
          </>
        )}

        <p className={styles.loginLegal}>
          Belum punya akun? <Link href={`/daftar?returnTo=${encodeURIComponent(returnTo || "/akun")}`}>Daftar</Link>
        </p>
        <p className={styles.loginTrust}>Propertinya Para Independen — tanpa biaya, tanpa perantara tak dikenal.</p>
      </div>

      <MobileBottomNav />
    </section>
  );
}
