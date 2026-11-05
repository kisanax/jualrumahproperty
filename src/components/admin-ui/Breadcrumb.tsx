import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb ala Cloudflare — trail lokasi di atas judul halaman.
 * Server-safe (tanpa hook): bisa dipakai di server component maupun client.
 */
export function Breadcrumb({ items = [], className }: { items?: Crumb[]; className?: string }) {
  if (!items.length) return null;
  return (
    <nav className={className ? `admin-breadcrumb ${className}` : "admin-breadcrumb"} aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`}>
              {item.href && !isLast ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
