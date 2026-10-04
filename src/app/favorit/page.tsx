import Link from "next/link";
import { redirect } from "next/navigation";
import PortalHeader from "@/components/portal/PortalHeader";
import MobileBottomNav from "@/components/portal/MobileBottomNav";
import PortalFooter from "@/components/portal/PortalFooter";
import FavoritesGrid from "@/components/portal/FavoritesGrid";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import "./favorites.css";

export const metadata = { title: "Properti Favorit" };

export default async function FavoritesPage() {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login?returnTo=/favorit");

  return (
    <main>
      <PortalHeader />
      <section className="fav-content">
        <div className="fav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
        </div>
        <p className="fav-eyebrow">Koleksi pribadi</p>
        <h1>Properti favorit</h1>
        <p className="fav-sub">Simpan properti yang menarik agar mudah dibandingkan dan ditemukan kembali.</p>
        <FavoritesGrid />
      </section>
      <PortalFooter />
      <MobileBottomNav />
    </main>
  );
}
