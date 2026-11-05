"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, type DtColumn } from "@/components/admin-ui/DataTable";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label as UiLabel } from "@/components/ui/label";

export interface IntermediaryItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  trustLevel: "NEW" | "VERIFIED" | "TRUSTED" | "BLACKLISTED" | string;
  notes: string | null;
  createdAt: string | Date;
  listingIntermediaries: {
    id: string;
    listing: {
      id: string;
      status: string;
      property: {
        id: string;
        code: string;
        area: {
          name: string;
        };
      };
    };
  }[];
}

interface IntermediaryListProps {
  initialIntermediaries: IntermediaryItem[];
}

export function getTrustBadge(level: string) {
  switch (level) {
    case "TRUSTED":
      return {
        label: "Trusted",
        cls: "admin-badge-active",
        icon: ShieldCheck,
        desc: "Jalur langsung / rekanan tepercaya",
      };
    case "VERIFIED":
      return {
        label: "Verified",
        cls: "admin-badge-ready",
        icon: Shield,
        desc: "Identitas dan kontak terkonfirmasi",
      };
    case "BLACKLISTED":
      return {
        label: "Blacklisted",
        cls: "admin-badge-suspended",
        icon: ShieldX,
        desc: "Bermasalah / dilarang bertransaksi",
      };
    default:
      return {
        label: "Baru",
        cls: "admin-badge-draft",
        icon: ShieldAlert,
        desc: "Perantara baru, belum diverifikasi",
      };
  }
}

export default function IntermediaryList({ initialIntermediaries }: IntermediaryListProps) {
  const [intermediaries, setIntermediaries] = useState<IntermediaryItem[]>(initialIntermediaries);
  const [search, setSearch] = useState("");
  const [selectedTrustFilter, setSelectedTrustFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IntermediaryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [trustLevel, setTrustLevel] = useState<string>("NEW");
  const [notes, setNotes] = useState("");

  const trustFiltered = intermediaries.filter((item) =>
    selectedTrustFilter === "ALL" ? true : item.trustLevel === selectedTrustFilter
  );

  const searchPredicate = (item: IntermediaryItem, q: string) =>
    [item.name, item.phone || "", item.company || "", item.email || "", item.notes || ""]
      .join(" ")
      .toLowerCase()
      .includes(q);

  const openCreateModal = () => {
    setEditingItem(null);
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setTrustLevel("NEW");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (item: IntermediaryItem) => {
    setEditingItem(item);
    setName(item.name);
    setPhone(item.phone || "");
    setEmail(item.email || "");
    setCompany(item.company || "");
    setTrustLevel(item.trustLevel || "NEW");
    setNotes(item.notes || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama perantara wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        company: company.trim() || null,
        trustLevel,
        notes: notes.trim() || null,
      };

      if (editingItem) {
        const res = await fetch(`/api/intermediaries/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update perantara");

        setIntermediaries((prev) =>
          prev.map((it) =>
            it.id === editingItem.id ? { ...it, ...data.intermediary } : it
          )
        );
        toast.success("Data perantara berhasil diperbarui");
      } else {
        const res = await fetch("/api/intermediaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menambahkan perantara");

        const newItem: IntermediaryItem = {
          ...data.intermediary,
          listingIntermediaries: [],
        };
        setIntermediaries((prev) => [newItem, ...prev]);
        toast.success("Perantara baru berhasil ditambahkan");
      }

      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: IntermediaryItem) => {
    if (item.listingIntermediaries.length > 0) {
      toast.error(
        `Perantara "${item.name}" tidak dapat dihapus karena masih terhubung ke ${item.listingIntermediaries.length} listing.`
      );
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus perantara "${item.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/intermediaries/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus perantara");

      setIntermediaries((prev) => prev.filter((it) => it.id !== item.id));
      toast.success(`Perantara "${item.name}" berhasil dihapus`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus perantara";
      toast.error(msg);
    }
  };

  const intermediaryColumns: DtColumn<IntermediaryItem>[] = [
    {
      key: "name",
      header: "Nama Perantara",
      sortValue: (item) => item.name,
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600 }}>{item.name}</div>
          {item.company && (
            <div className="admin-dt-muted" style={{ fontSize: 12, marginTop: 2 }}>
              {item.company}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontak",
      render: (item) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
          {item.phone && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <a href={`tel:${item.phone}`} className="admin-dt-link" style={{ fontWeight: 500 }}>
                {item.phone}
              </a>
              <a
                href={`https://wa.me/${item.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, textDecoration: "none" }}
                title="Chat WhatsApp"
              >
                WA ↗
              </a>
            </span>
          )}
          {item.email && <span className="admin-dt-muted">{item.email}</span>}
          {!item.phone && !item.email && <span className="admin-dt-muted">—</span>}
        </div>
      ),
    },
    {
      key: "trust",
      header: "Trust Level",
      sortValue: (item) => item.trustLevel,
      render: (item) => {
        const trust = getTrustBadge(item.trustLevel);
        const TrustIcon = trust.icon;
        return (
          <span className={`admin-badge ${trust.cls}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <TrustIcon size={12} /> {trust.label}
          </span>
        );
      },
    },
    {
      key: "listings",
      header: "Listing Terhubung",
      align: "center",
      sortValue: (item) => item.listingIntermediaries.length,
      render: (item) =>
        item.listingIntermediaries.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
            {item.listingIntermediaries.map((li) => (
              <Link
                key={li.id}
                href={`/admin/properties/${li.listing.property.id}`}
                className="admin-dt-link"
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "var(--workspace-surface-soft)",
                  border: "1px solid var(--workspace-border)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title={li.listing.property.code}
              >
                {li.listing.property.code}
              </Link>
            ))}
          </div>
        ) : (
          <span className="admin-dt-muted">—</span>
        ),
    },
    {
      key: "notes",
      header: "Catatan",
      render: (item) =>
        item.notes ? (
          <span title={item.notes} style={{ display: "inline-block", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", fontStyle: "italic" }}>
            {item.notes}
          </span>
        ) : (
          <span className="admin-dt-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          <UiButton variant="ghost"
            type="button"
            onClick={() => openEditModal(item)}
            className="h-10 px-4"
            style={{ padding: "6px 10px", fontSize: 12 }}
            title="Edit Perantara"
          >
            <Edit2 size={14} /> Edit
          </UiButton>
          <UiButton variant="ghost"
            type="button"
            onClick={() => handleDelete(item)}
            className="h-10 px-4"
            style={{
              padding: "6px 10px",
              fontSize: 12,
              color: item.listingIntermediaries.length > 0 ? "var(--workspace-text-muted)" : "var(--workspace-danger)",
            }}
            title={
              item.listingIntermediaries.length > 0
                ? "Tidak bisa dihapus (terhubung listing)"
                : "Hapus Perantara"
            }
          >
            <Trash2 size={14} />
          </UiButton>
        </div>
      ),
    },
  ];

  return (
    <div>

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Perantara / Broker</h1>
          <p>
            Kelola agen eksternal, mediator properti, kantor agensi, dan evaluasi reputasi (Trust Level).
          </p>
        </div>
        <UiButton variant="default"
          onClick={openCreateModal}
          className="h-10 px-4"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} /> Tambah Perantara
        </UiButton>
      </div>

      {/* Tabel Perantara */}
      <DataTable<IntermediaryItem>
        rows={trustFiltered}
        rowKey={(item) => item.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari perantara / agensi..."
        searchPredicate={searchPredicate}
        initialSort={{ key: "name", dir: "asc" }}
        pageSize={10}
        emptyTitle={
          search || selectedTrustFilter !== "ALL"
            ? "Perantara tidak ditemukan"
            : "Belum ada perantara terdaftar"
        }
        emptyText={
          search || selectedTrustFilter !== "ALL"
            ? "Coba sesuaikan kata kunci pencarian atau filter Trust Level."
            : "Klik tombol Tambah Perantara untuk mencatat mediator properti baru."
        }
        emptyAction={
          !search && selectedTrustFilter === "ALL" ? (
            <UiButton variant="default" onClick={openCreateModal} className="h-10 px-4">
              <Plus size={16} /> Tambah Perantara Pertama
            </UiButton>
          ) : undefined
        }
        filters={
          <div className="admin-pill-group">
            {[
              { key: "ALL", label: "Semua" },
              { key: "TRUSTED", label: "Trusted" },
              { key: "VERIFIED", label: "Verified" },
              { key: "NEW", label: "Baru" },
              { key: "BLACKLISTED", label: "Blacklisted" },
            ].map((pill) => (
              <button
                key={pill.key}
                onClick={() => setSelectedTrustFilter(pill.key)}
                className={`admin-pill admin-pill-sm ${selectedTrustFilter === pill.key ? "active" : ""}`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        }
        columns={intermediaryColumns}
      />

      {/* Modal Add / Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Data Perantara" : "Tambah Perantara Baru"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div>
                <div>
                  <UiLabel htmlFor="int-name" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Nama Perantara / Kontak <span style={{ color: "#ef4444" }}>*</span>
                  </UiLabel>
                  <UiInput
                    id="int-name"
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="Contoh: Pak Anton / Bu Rina ERA"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <UiLabel htmlFor="int-phone" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Nomor WhatsApp / HP</UiLabel>
                    <UiInput
                      id="int-phone"
                      type="text"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="0812xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <UiLabel htmlFor="int-company" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Perusahaan / Kantor Agensi</UiLabel>
                    <UiInput
                      id="int-company"
                      type="text"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="ERA, Ray White, Independent..."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <UiLabel htmlFor="int-email" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Email</UiLabel>
                  <UiInput
                    id="int-email"
                    type="email"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="broker@agensi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Trust Level Selector */}
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Tingkat Kepercayaan (Trust Level)</UiLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                    {[
                      {
                        key: "NEW",
                        label: "Baru",
                        desc: "Belum diverifikasi",
                        color: "var(--color-admin-text-secondary)",
                      },
                      {
                        key: "VERIFIED",
                        label: "Verified",
                        desc: "Kontak & identitas teruji",
                        color: "#3b82f6",
                      },
                      {
                        key: "TRUSTED",
                        label: "Trusted",
                        desc: "Jalur A1 / rekanan solid",
                        color: "#10b981",
                      },
                      {
                        key: "BLACKLISTED",
                        label: "Blacklisted",
                        desc: "Bermasalah / bypass",
                        color: "#ef4444",
                      },
                    ].map((level) => (
                      <label
                        key={level.key}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border:
                            trustLevel === level.key
                              ? `2px solid ${level.color}`
                              : "1px solid var(--color-admin-border)",
                          background:
                            trustLevel === level.key
                              ? "var(--color-admin-bg)"
                              : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="trustLevel"
                          value={level.key}
                          checked={trustLevel === level.key}
                          onChange={() => setTrustLevel(level.key)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: level.color }}>
                            {level.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>
                            {level.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <UiLabel htmlFor="int-notes" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan Reputasi & Track Record</UiLabel>
                  <UiTextarea
                    id="int-notes"
                    className="min-h-24 text-base md:text-sm"
                    rows={3}
                    placeholder="Catatan mengenai perantara ini, riwayat komisi, atau kedekatan dengan owner..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
            </div>

            <DialogFooter>
              <UiButton
                variant="outline"
                type="button"
                className="h-10 px-4"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </UiButton>
              <UiButton
                variant="default"
                type="submit"
                className="h-10 px-4"
                disabled={isSubmitting}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Save size={16} />
                {isSubmitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Perantara"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
