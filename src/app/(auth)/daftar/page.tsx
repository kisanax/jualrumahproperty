import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import { safeReturnTo } from "@/lib/auth-redirect";
import BrandLogo from "@/components/portal/BrandLogo";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import styles from "../auth.module.css";
import { registerMember } from "./actions";

const errorMessages: Record<string, string> = {
  "invalid-data": "Periksa nama, email, dan password. Password minimal 8 karakter.",
  "password-mismatch": "Konfirmasi password belum sama.",
  "email-used": "Email tersebut sudah terdaftar. Silakan masuk menggunakan akun yang ada.",
  "rate-limited": "Terlalu banyak percobaan pendaftaran. Coba kembali beberapa menit lagi.",
};

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [access, query] = await Promise.all([getAccountAccess(), searchParams]);
  const returnTo = safeReturnTo(typeof query.returnTo === "string" ? query.returnTo : null) ?? "/akun";

  if (access.kind !== "unauthenticated") redirect(returnTo === "/akun" ? "/login/redirect" : returnTo);
  const error = typeof query.error === "string" ? errorMessages[query.error] : null;

  return (
    <section className={`${styles.card} ${styles.loginCard}`}>
      <Link href="/" className={styles.loginClose} aria-label="Tutup dan kembali ke beranda">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </Link>
      <div className={styles.loginBody}>
        <BrandLogo />
        <h1 className={styles.loginTitle}>Buat akun jualrumahproperty.com</h1>
        <form action={registerMember} className={styles.loginForm}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className={styles.field}><label htmlFor="name" className={styles.srOnly}>Nama lengkap</label><input id="name" name="name" className={styles.loginInput} autoComplete="name" required minLength={2} maxLength={100} placeholder="Nama lengkap" /></div>
          <div className={styles.field}><label htmlFor="email" className={styles.srOnly}>Email</label><input id="email" name="email" className={styles.loginInput} type="email" inputMode="email" autoComplete="email" required placeholder="Email" /></div>
          <div className={styles.field}><label htmlFor="password" className={styles.srOnly}>Password</label><input id="password" name="password" className={styles.loginInput} type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Password, minimal 8 karakter" /></div>
          <div className={styles.field}><label htmlFor="passwordConfirmation" className={styles.srOnly}>Konfirmasi password</label><input id="passwordConfirmation" name="passwordConfirmation" className={styles.loginInput} type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Ulangi password" /></div>
          {error && <p className={styles.formError} role="alert">{error}</p>}
          <button type="submit" className={styles.primaryButton}>Daftar</button>
        </form>
        <p className={styles.loginLegal}>Sudah punya akun? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Masuk</Link></p>
      </div>
      <MobileBottomNav />
    </section>
  );
}
