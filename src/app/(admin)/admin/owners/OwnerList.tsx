"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Save } from "lucide-react";
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

export interface OwnerItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string | Date;
  propertyOwners: {
    id: string;
    isPrimary: boolean;
    property: {
      id: string;
      code: string;
      type: string;
      area: {
        name: string;
      };
    };
  }[];
}

interface OwnerListProps {
  initialOwners: OwnerItem[];
}

export default function OwnerList({ initialOwners }: OwnerListProps) {
  const [owners, setOwners] = useState<OwnerItem[]>(initialOwners);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<OwnerItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const searchPredicate = (o: OwnerItem, q: string) =>
    [o.name, o.phone || "", o.email || "", o.notes || "", o.idNumber || ""]
      .join(" ")
      .toLowerCase()
      .includes(q);

  const openCreateModal = () => {
    setEditingOwner(null);
    setName("");
    setPhone("");
    setEmail("");
    setIdNumber("");
    setAddress("");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (owner: OwnerItem) => {
    setEditingOwner(owner);
    setName(owner.name);
    setPhone(owner.phone || "");
    setEmail(owner.email || "");
    setIdNumber(owner.idNumber || "");
    setAddress(owner.address || "");
    setNotes(owner.notes || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama owner wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        idNumber: idNumber.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingOwner) {
        const res = await fetch(`/api/owners/${editingOwner.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update owner");

        setOwners((prev) =>
          prev.map((item) =>
            item.id === editingOwner.id
              ? { ...item, ...data.owner }
              : item
          )
        );
        toast.success("Data owner berhasil diperbarui");
      } else {
        const res = await fetch("/api/owners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat owner");

        const newOwner: OwnerItem = {
          ...data.owner,
          propertyOwners: [],
        };
        setOwners((prev) => [newOwner, ...prev]);
        toast.success("Owner baru berhasil ditambahkan");
      }

      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (owner: OwnerItem) => {
    if (owner.propertyOwners.length > 0) {
      toast.error(
        `Owner "${owner.name}" tidak dapat dihapus karena terhubung dengan ${owner.propertyOwners.length} properti.`
      );
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus owner "${owner.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/owners/${owner.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus owner");

      setOwners((prev) => prev.filter((item) => item.id !== owner.id));
      toast.success(`Owner "${owner.name}" berhasil dihapus`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus owner";
      toast.error(msg);
    }
  };

  const ownerColumns: DtColumn<OwnerItem>[] = [
    {
      key: "name",
      header: "Nama Owner",
      sortValue: (o) => o.name,
      render: (o) => (
        <div>
          <div style={{ fontWeight: 600 }}>{o.name}</div>
          {o.idNumber && (
            <div className="admin-dt-muted" style={{ fontSize: 12, marginTop: 2 }}>
              KTP: {o.idNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontak",
      render: (o) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
          {o.phone && (
            <a href={`tel:${o.phone}`} className="admin-dt-link" style={{ fontWeight: 500 }}>
              {o.phone}
            </a>
          )}
          {o.email && <span className="admin-dt-muted">{o.email}</span>}
          {!o.phone && !o.email && <span className="admin-dt-muted">—</span>}
        </div>
      ),
    },
    {
      key: "address",
      header: "Alamat",
      render: (o) =>
        o.address ? (
          <span title={o.address} style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>
            {o.address}
          </span>
        ) : (
          <span className="admin-dt-muted">—</span>
        ),
    },
    {
      key: "properties",
      header: "Properti Terdaftar",
      align: "center",
      sortValue: (o) => o.propertyOwners.length,
      render: (o) =>
        o.propertyOwners.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
            {o.propertyOwners.map((po) => (
              <Link
                key={po.id}
                href={`/admin/properties/${po.property.id}`}
                className="admin-dt-link"
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "var(--workspace-surface-soft)",
                  border: "1px solid var(--workspace-border)",
                  textDecoration: "none",
                }}
                title={`${po.property.code} — ${po.property.area.name}`}
              >
                {po.property.code}
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
      render: (o) =>
        o.notes ? (
          <span title={o.notes} style={{ display: "inline-block", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", fontStyle: "italic" }}>
            {o.notes}
          </span>
        ) : (
          <span className="admin-dt-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (o) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          <UiButton variant="ghost"
            type="button"
            onClick={() => openEditModal(o)}
            className="h-10 px-4"
            style={{ padding: "6px 10px", fontSize: 12 }}
            title="Edit Owner"
          >
            <Edit2 size={14} /> Edit
          </UiButton>
          <UiButton variant="ghost"
            type="button"
            onClick={() => handleDelete(o)}
            className="h-10 px-4"
            style={{
              padding: "6px 10px",
              fontSize: 12,
              color: o.propertyOwners.length > 0 ? "var(--workspace-text-muted)" : "var(--workspace-danger)",
            }}
            title={
              o.propertyOwners.length > 0
                ? "Tidak bisa dihapus (terikat properti)"
                : "Hapus Owner"
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

      {/* Header with Title and Add Button */}
      <div className="admin-page-header">
        <div>
          <h1>Owner Properti</h1>
          <p>
            Kelola data pemilik properti, nomor kontak, dokumen kepemilikan, dan catatan internal.
          </p>
        </div>
        <UiButton variant="default"
          onClick={openCreateModal}
          className="h-10 px-4"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} /> Tambah Owner
        </UiButton>
      </div>

      {/* Tabel Owner */}
      <DataTable<OwnerItem>
        rows={owners}
        rowKey={(o) => o.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari owner berdasarkan nama, telepon, email, atau catatan..."
        searchPredicate={searchPredicate}
        initialSort={{ key: "name", dir: "asc" }}
        pageSize={10}
        emptyTitle={search ? "Owner tidak ditemukan" : "Belum ada owner terdaftar"}
        emptyText={
          search
            ? `Tidak ada owner yang cocok dengan pencarian "${search}".`
            : "Klik tombol Tambah Owner untuk mendaftarkan pemilik properti baru."
        }
        emptyAction={
          !search ? (
            <UiButton variant="default" onClick={openCreateModal} className="h-10 px-4">
              <Plus size={16} /> Tambah Owner Pertama
            </UiButton>
          ) : undefined
        }
        columns={ownerColumns}
      />

      {/* Modal Add / Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOwner ? "Edit Data Owner" : "Tambah Owner Baru"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div>
                <div>
                  <UiLabel htmlFor="owner-name" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Nama Lengkap Owner <span style={{ color: "#ef4444" }}>*</span>
                  </UiLabel>
                  <UiInput
                    id="owner-name"
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="Contoh: Bpk. H. Rahmat Hidayat"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <UiLabel htmlFor="owner-phone" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Nomor Telepon / WA</UiLabel>
                    <UiInput
                      id="owner-phone"
                      type="text"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="0812xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <UiLabel htmlFor="owner-email" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Email</UiLabel>
                    <UiInput
                      id="owner-email"
                      type="email"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="owner@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <UiLabel htmlFor="owner-idnumber" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Nomor KTP / NIK</UiLabel>
                  <UiInput
                    id="owner-idnumber"
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="3174xxxx (Opsional)"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                </div>

                <div>
                  <UiLabel htmlFor="owner-address" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Alamat Domisili</UiLabel>
                  <UiTextarea
                    id="owner-address"
                    className="min-h-24 text-base md:text-sm"
                    rows={2}
                    placeholder="Alamat tempat tinggal owner..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div>
                  <UiLabel htmlFor="owner-notes" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan Internal</UiLabel>
                  <UiTextarea
                    id="owner-notes"
                    className="min-h-24 text-base md:text-sm"
                    rows={3}
                    placeholder="Preferensi komunikasi, waktu respon, atau info penting lainnya..."
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
                {isSubmitting ? "Menyimpan..." : editingOwner ? "Simpan Perubahan" : "Tambah Owner"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
