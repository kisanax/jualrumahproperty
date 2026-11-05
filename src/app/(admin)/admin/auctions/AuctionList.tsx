"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gavel, Plus } from "lucide-react";
import { categories, auctionStatuses, effectiveStatus } from "@/lib/auctions";
import type { AuctionView } from "@/lib/auction-records";
import "./auctions.css";
import { DataTable, type DtColumn } from "@/components/admin-ui/DataTable";
import { ButtonLink } from "@/components/admin-ui/Button";

const statusBadgeCls: Record<string, string> = {
  DRAFT: "admin-badge-draft",
  SCHEDULED: "admin-badge-pending",
  ACTIVE: "admin-badge-active",
  EXPIRED: "admin-badge-suspended",
  CANCELLED: "admin-badge-archived",
  COMPLETED: "admin-badge-sold",
};

export default function AuctionList({records}:{records:AuctionView[]}) {
  const router=useRouter(); const [search,setSearch]=useState(""); const [filter,setFilter]=useState(""); const [category,setCategory]=useState("");
  // Refresh long-lived operator tabs so expiry is reflected without a cron worker.
  useEffect(()=>{const id=setInterval(()=>router.refresh(),60000);return()=>clearInterval(id);},[router]);
  const filtered=records.filter(r=>(!filter || effectiveStatus(r)===filter) && (!category || r.category===category));
  const expired=records.filter(r=>effectiveStatus(r)==="EXPIRED").length;

  const searchPredicate=(r: AuctionView, q: string)=>
    [r.title,r.city,r.address,r.seller,r.contactName].join(" ").toLowerCase().includes(q);

  const auctionColumns: DtColumn<AuctionView>[] = [
    {
      key: "title",
      header: "Properti",
      sortValue: (r) => r.title,
      render: (r) => (
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {r.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.photos[0]} alt="" style={{ width: 52, height: 38, objectFit: "cover", borderRadius: 4, border: "1px solid var(--workspace-border)", flex: "none" }} />
          )}
          <span style={{ minWidth: 0 }}>
            <Link href={`/admin/auctions/${r.id}`} className="admin-dt-link" style={{ fontWeight: 600, display: "block" }}>
              {r.title}
            </Link>
            <span className="admin-dt-muted" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
              {[r.district,r.city].filter(Boolean).join(", ")||"Lokasi belum diisi"}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      sortValue: (r) => r.category,
      render: (r) => <span className="admin-badge admin-badge-ready">{categories[r.category]}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => effectiveStatus(r),
      render: (r) => {
        const st = effectiveStatus(r);
        return (
          <span className={`admin-badge ${statusBadgeCls[st] || "admin-badge-draft"}`}>
            {st==="SCHEDULED"?"Terjadwal":auctionStatuses[st as keyof typeof auctionStatuses]}
          </span>
        );
      },
    },
    {
      key: "limitPrice",
      header: "Nilai Limit",
      align: "right",
      sortValue: (r) => Number(r.limitPrice) || 0,
      render: (r) => r.limitPrice ? `Rp ${Number(r.limitPrice).toLocaleString("id-ID")}` : <span className="admin-dt-muted">Belum tersedia</span>,
    },
    {
      key: "deposit",
      header: "Jaminan",
      align: "right",
      sortValue: (r) => Number(r.depositAmount) || 0,
      render: (r) => r.depositAmount ? `Rp ${Number(r.depositAmount).toLocaleString("id-ID")}` : <span className="admin-dt-muted">Belum diisi</span>,
    },
    {
      key: "period",
      header: "Masa Aktif",
      sortValue: (r) => r.activeFrom || "",
      render: (r) => (
        <span className="admin-dt-muted" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
          {r.activeFrom||"—"} s.d. {r.activeUntil||"—"}
        </span>
      ),
    },
    {
      key: "organizer",
      header: "Penyelenggara",
      render: (r) => r.organizer || r.seller || <span className="admin-dt-muted">Belum diisi</span>,
    },
  ];

  return <div className="auction-module">
    <div className="admin-page-header"><div><h1><Gavel size={24}/> Rumah Sitaan & Lelang</h1><p>Database internal Jabodetabek · {records.length} catatan</p></div><ButtonLink variant="primary" className="h-10 px-4" href="/admin/auctions/new"><Plus size={18}/> Tambah / Smart Paste WA</ButtonLink></div>
    {expired>0 && <button className="auction-notice" onClick={()=>setFilter("EXPIRED")}>{expired} listing kedaluwarsa perlu ditinjau →</button>}
    <DataTable<AuctionView>
      rows={filtered}
      rowKey={(r) => r.id}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Judul, kota, bank, perantara…"
      searchPredicate={searchPredicate}
      initialSort={{ key: "title", dir: "asc" }}
      pageSize={10}
      emptyTitle={records.length ? "Tidak ada hasil yang cocok" : "Belum ada data sitaan atau lelang"}
      emptyText="Tambahkan manual atau tempel satu pesan WhatsApp untuk ditinjau."
      emptyAction={
        !records.length ? (
          <ButtonLink variant="primary" className="h-10 px-4" href="/admin/auctions/new">
            <Plus size={16} /> Tambah Data Pertama
          </ButtonLink>
        ) : undefined
      }
      filters={
        <div style={{ display: "flex", gap: 10 }}>
          <select className="admin-input" style={{ minWidth: 170 }} value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter kategori">
            <option value="">Semua kategori</option>
            {Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
          <select className="admin-input" style={{ minWidth: 160 }} value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter status">
            <option value="">Semua status</option>
            <option value="SCHEDULED">Terjadwal</option>
            {Object.entries(auctionStatuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      }
      columns={auctionColumns}
    />
  </div>;
}
