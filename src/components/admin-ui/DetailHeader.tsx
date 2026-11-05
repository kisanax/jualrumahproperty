import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "./Breadcrumb";

/**
 * Header halaman detail ala Cloudflare: breadcrumb trail (dengan kode resource),
 * judul besar + badge status, deskripsi, meta kecil (timestamps), dan aksi di kanan.
 * Server-safe — bisa dipakai di server component.
 */
export function DetailHeader({
  crumbs,
  title,
  badge,
  description,
  meta,
  actions,
}: {
  crumbs?: Crumb[];
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}
      <div className="admin-page-header">
        <div>
          <div className="admin-detail-title-row">
            <h1>{title}</h1>
            {badge}
          </div>
          {description && <p>{description}</p>}
          {meta && <div className="admin-detail-meta">{meta}</div>}
        </div>
        {actions && <div className="admin-detail-actions">{actions}</div>}
      </div>
    </div>
  );
}
