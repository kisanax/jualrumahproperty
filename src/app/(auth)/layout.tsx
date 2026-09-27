import type { Metadata } from "next";
import styles from "./auth.module.css";

export const metadata: Metadata = {
  title: "Masuk | Jual Rumah Property",
  description: "Masuk ke akun Jual Rumah Property Anda.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className={styles.shell} style={{ fontFamily: '"Inter Variable", system-ui, sans-serif' }}>{children}</main>;
}
