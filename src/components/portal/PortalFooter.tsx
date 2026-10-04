import Link from "next/link";
import PortalFooterNews from "./PortalFooterNews";

/**
 * Footer global portal publik.
 * Atas: section informasi ala laravel.com (brand + tagline, kolom link,
 * form update berita, copyright). Bawah: artwork skyline "jual rumah property".
 */
const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Properti",
    links: [
      { label: "Jual Properti", href: "/jual" },
      { label: "Cari Properti", href: "/properti" },
      { label: "Favorit Saya", href: "/favorit" },
    ],
  },
  {
    title: "Komunitas",
    links: [
      { label: "Mode Agen", href: "/agents" },
      { label: "Akun Saya", href: "/akun" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { label: "Hubungi Kami", href: "https://wa.me/628118000960" },
      { label: "Tentang Kami", href: "/#" },
    ],
  },
];

export default function PortalFooter() {
  return (
    <footer className="portal-footer">
      <div className="portal-footer-info">
        <div className="portal-footer-info-inner">
          <div className="portal-footer-brandcol">
            <Link href="/" className="portal-footer-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/jualrumahproperty-red.png" alt="Jual Rumah Property" />
            </Link>
            <p className="portal-footer-tagline">
              Propertinya para independen. Jual rumah lebih cepat bersama
              jaringan broker profesional di seluruh Indonesia.
            </p>
            <PortalFooterNews />
            <p className="portal-footer-copy">© 2026 Jual Rumah Property</p>
          </div>
          <nav className="portal-footer-cols" aria-label="Tautan footer">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="portal-footer-col">
                <h3>{col.title}</h3>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href}>{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
      <div className="portal-footer-scene" aria-hidden="true">
        <div className="portal-footer-photo" />
        <div className="portal-footer-shade" />
      </div>
    </footer>
  );
}
