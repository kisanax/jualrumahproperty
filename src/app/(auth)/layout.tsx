import type { Metadata } from "next";
import { Inter } from "next/font/google";
import styles from "./auth.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Masuk | Jual Rumah Property",
  description: "Masuk ke akun Jual Rumah Property Anda.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className={`${styles.shell} ${inter.className}`}>{children}</main>;
}
