import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import { prisma } from "@/lib/prisma";
import BrandLogo from "@/components/portal/BrandLogo";
import styles from "../auth.module.css";
import { submitBrokerOnboarding } from "./actions";

export default async function BrokerOnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login");
  if (access.kind === "member") redirect("/daftar-broker");
  if (access.kind === "staff" || access.kind === "broker-verified") redirect("/login/redirect");
  if (access.kind === "broker-pending" || access.kind === "broker-rejected" || access.kind === "broker-suspended") {
    redirect("/onboarding/status");
  }

  const [profile, query] = await Promise.all([
    prisma.brokerProfile.findUnique({ where: { userId: access.user.id } }),
    searchParams,
  ]);
  const status = access.verificationStatus;
  const revision = status === "REVISION_REQUIRED";
  const showForm = status === "PROFILE_INCOMPLETE" || revision;

  const heading = revision
      ? { eyebrow: "Perlu revisi", title: "Perbarui profil broker", description: "Tim verifikasi meminta perbaikan data. Periksa kembali profil Anda lalu kirim ulang untuk ditinjau." }
      : { eyebrow: "Langkah 2 dari 2", title: "Lengkapi profil broker", description: "Data ini menentukan tipe workspace dan wilayah operasional awal Anda." };

  return (
    <section className={styles.card}>
      <header className={styles.brand}>
        <BrandLogo />
      </header>
      <div className={styles.body}>
        <div className={styles.progress}><span /><span /></div>
        <p className={styles.eyebrow}>{heading.eyebrow}</p>
        <h1 className={styles.title}>{heading.title}</h1>
        <p className={styles.description}>{heading.description}</p>

        <div className={styles.account}>
          <span className={styles.avatar}>{(access.user.name || access.user.email || "B").charAt(0).toUpperCase()}</span>
          <div><strong>{access.user.name || "Broker baru"}</strong><span>{access.user.email}</span></div>
            <form className={styles.logoutForm} action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className={styles.textButton} type="submit">Ganti akun</button>
          </form>
        </div>

        {revision && <p className={styles.notice}>Status profil: Perlu revisi. Pengiriman ulang akan mengubah status menjadi Menunggu review.</p>}

        {showForm && (
          <form action={submitBrokerOnboarding} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="brokerType">Jenis akun</label>
              <select id="brokerType" name="brokerType" className={styles.input} required defaultValue={profile?.brokerType || "INDEPENDENT"}>
                <option value="INDEPENDENT">Broker independen</option>
                <option value="AGENCY_OWNER">Pemilik kantor / agency</option>
                <option value="AGENCY_MEMBER">Anggota kantor / agency</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="phone">Nomor WhatsApp</label>
              <input id="phone" name="phone" className={styles.input} type="tel" inputMode="tel" required minLength={8} defaultValue={profile?.phone || ""} placeholder="08xxxxxxxxxx" />
            </div>
            <div className={styles.field}>
              <label htmlFor="city">Kota operasional utama</label>
              <input id="city" name="city" className={styles.input} required defaultValue={profile?.city || ""} placeholder="Contoh: Jakarta Selatan" />
            </div>
            <div className={styles.field}>
              <label htmlFor="province">Provinsi</label>
              <input id="province" name="province" className={styles.input} required defaultValue={profile?.province || ""} placeholder="Contoh: DKI Jakarta" />
            </div>
            <div className={styles.field}>
              <label htmlFor="licenseNumber">Nomor lisensi / sertifikasi (opsional)</label>
              <input id="licenseNumber" name="licenseNumber" className={styles.input} defaultValue={profile?.licenseNumber || ""} />
              <span className={styles.hint}>Dokumen pendukung dapat ditambahkan setelah profil dasar tersimpan.</span>
            </div>
            {query.error && <p className={styles.notice}>Periksa kembali data wajib sebelum melanjutkan.</p>}
            <button className={styles.primaryButton} type="submit">Kirim untuk ditinjau</button>
          </form>
        )}
      </div>
    </section>
  );
}
