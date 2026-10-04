import type { Metadata } from "next";
import Link from "next/link";
import PortalHeader from "@/components/portal/PortalHeader";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import PortalFooter from "@/components/portal/PortalFooter";
import { prisma } from "@/lib/prisma";
import styles from "./agents.module.css";

export const metadata: Metadata = {
  title: "Agen Properti Terverifikasi",
  description:
    "Temukan agen dan broker properti terverifikasi yang siap membantu pencarian dan pemasaran properti Anda.",
  alternates: { canonical: "/agents" },
};

const brokerTypeLabel: Record<string, string> = {
  INDEPENDENT: "Broker Independen",
  AGENCY_OWNER: "Pemilik Kantor / Agency",
  AGENCY_MEMBER: "Anggota Kantor / Agency",
};

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>
);

function initialsOf(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email.split("@")[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const first = parts[0]?.charAt(0) || "B";
  const second = parts[1]?.charAt(0) || "";
  return `${first}${second}`.toUpperCase();
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";

  const brokers = await prisma.user.findMany({
    where: {
      isActive: true,
      brokerProfile: { verificationStatus: "VERIFIED" },
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { brokerProfile: { city: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { brokerProfile: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className={styles.page}>
      <PortalHeader />

      <main className={styles.content}>
        {/* ── HERO ── */}
        <section className={styles.hero} aria-labelledby="agents-title">
          <small className={styles.eyebrow}>OUR AGENTS</small>
          <h1 id="agents-title" className={styles.heroTitle}>
            Trusted Local Insight
          </h1>
          <p className={styles.heroDesc}>
            Dengan pengetahuan lokal yang mendalam dan kecintaan pada Jakarta
            Selatan, tim broker kami siap memandu Anda menemukan properti
            terbaik — dari kawasan elit hingga segmen berkembang.
          </p>

          <form className={styles.search} action="/agents">
            <SearchIcon />
            <span className={styles.srOnly}>Cari nama atau kota agen</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari nama atau kota agen"
              aria-label="Cari nama atau kota agen"
            />
          </form>
        </section>

        {/* ── AGENT GRID ── */}
        {brokers.length > 0 ? (
          <section className={styles.gridSection} aria-label="Daftar agen">
            <div className={styles.grid}>
              {brokers.map((broker) => {
                const profile = broker.brokerProfile;
                const role = brokerTypeLabel[profile?.brokerType || ""] || "Broker Asosiasi";
                const city = profile?.city?.trim();

                return (
                  <article className={styles.card} key={broker.id}>
                    <div className={styles.photo}>
                      {broker.image ? (
                        <img
                          src={broker.image}
                          alt={broker.name || "Foto agen"}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className={styles.initials} aria-hidden="true">
                          {initialsOf(broker.name, broker.email || "B")}
                        </span>
                      )}
                    </div>
                    <h2 className={styles.name}>{broker.name || "Broker"}</h2>
                    <p className={styles.role}>{role}</p>
                    {city && <p className={styles.city}>{city}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className={styles.empty}>
            <h2>Tim agen kami segera hadir</h2>
            <p>
              Kami sedang menyiapkan direktori broker terverifikasi. Nantikan
              pembaruan dari kami.
            </p>
          </section>
        )}

        {/* ── SECTION PENDAFTARAN BROKER ── */}
        <section className={styles.join} id="gabung" aria-labelledby="join-title">
          <small className={styles.joinEyebrow}>GABUNG BERSAMA KAMI</small>
          <h2 id="join-title" className={styles.joinTitle}>
            Jadi Bagian dari Tim Kami
          </h2>
          <p className={styles.joinDesc}>
            Anda broker independen atau bagian dari agency? Perluas jangkauan
            listing Anda bersama Jual Rumah Property. Daftar dengan akun
            Google, lengkapi profil, dan tim internal kami akan meninjaunya.
          </p>
          <Link href="/daftar-broker?mode=daftar" className={styles.joinButton}>
            Daftar sebagai Broker
          </Link>
          <p className={styles.joinNote}>
            Pendaftaran menggunakan akun Google — profil Anda akan ditinjau tim
            internal sebelum tampil di halaman ini.
          </p>
        </section>

        {/* ── FOOTER ── */}
        <PortalFooter />
        <MobileBottomNav />
      </main>
    </div>
  );
}
