"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Plus, Edit2, Trash2, Save, AlertCircle } from "lucide-react";
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
import { ButtonLink } from "@/components/admin-ui/Button";

export interface CustomerLeadItem {
  id: string;
  currentStage: string;
  listing: {
    property: {
      code: string;
      type: string;
      area: { name: string };
      kawasan: { name: string } | null;
    };
  };
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  leads: CustomerLeadItem[];
}

interface CustomerListProps {
  initialCustomers: CustomerItem[];
}

function getStageBadge(stage: string) {
  switch (stage) {
    case "NEW":
      return { label: "Baru", cls: "admin-badge-pending" };
    case "QUALIFIED":
      return { label: "Kualifikasi", cls: "admin-badge-ready" };
    case "VIEWING":
      return { label: "Survei", cls: "admin-badge-active" };
    case "NEGOTIATING":
      return { label: "Negosiasi", cls: "admin-badge-negotiation" };
    case "WON":
      return { label: "Closing Menang", cls: "admin-badge-sold" };
    case "LOST":
      return { label: "Closing Hilang", cls: "admin-badge-suspended" };
    default:
      return { label: stage, cls: "admin-badge-draft" };
  }
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function CustomerList({ initialCustomers }: CustomerListProps) {
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const searchPredicate = (c: CustomerItem, q: string) => {
    const matchesGeneral =
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    const matchesLeads = c.leads?.some(
      (l) =>
        l.listing.property.code.toLowerCase().includes(q) ||
        l.listing.property.area.name.toLowerCase().includes(q) ||
        (l.listing.property.kawasan?.name &&
          l.listing.property.kawasan.name.toLowerCase().includes(q))
    );

    return matchesGeneral || matchesLeads;
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (c: CustomerItem) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || "");
    setNotes(c.notes || "");
    setModalOpen(true);
  };

  const openDeleteModal = (c: CustomerItem) => {
    setDeletingCustomer(c);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama customer wajib diisi");
      return;
    }
    if (!phone.trim()) {
      toast.error("Nomor telepon/WA wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingCustomer) {
        const res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update customer");

        setCustomers((prev) =>
          prev.map((item) => (item.id === editingCustomer.id ? data.customer : item))
        );
        toast.success("Data customer berhasil diperbarui");
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menambah customer");

        setCustomers((prev) => [data.customer, ...prev]);
        toast.success("Customer baru berhasil ditambahkan");
      }

      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;

    if (deletingCustomer.leads && deletingCustomer.leads.length > 0) {
      toast.error(
        `Customer tidak dapat dihapus karena memiliki ${deletingCustomer.leads.length} tiket inquiry (leads).`
      );
      setDeleteModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus customer");

      setCustomers((prev) => prev.filter((item) => item.id !== deletingCustomer.id));
      toast.success("Customer berhasil dihapus");
      setDeleteModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerColumns: DtColumn<CustomerItem>[] = [
    {
      key: "name",
      header: "Nama Customer",
      sortValue: (c) => c.name,
      render: (c) => (
        <div>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          <div className="admin-dt-muted" style={{ fontSize: 12, marginTop: 2 }}>
            Sejak {formatDate(c.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontak",
      render: (c) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
          <span style={{ fontWeight: 500 }}>{c.phone}</span>
          {c.email && <span className="admin-dt-muted">{c.email}</span>}
        </div>
      ),
    },
    {
      key: "leads",
      header: "Inquiry",
      align: "center",
      sortValue: (c) => c.leads?.length || 0,
      render: (c) => {
        const leads = c.leads || [];
        if (leads.length === 0) return <span className="admin-dt-muted">Belum ada inquiry</span>;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
            {leads.slice(0, 2).map((lead) => {
              const stageBadge = getStageBadge(lead.currentStage);
              return (
                <span key={lead.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Link
                    href={`/admin/properties/${lead.listing.property.code}`}
                    className="admin-dt-link"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    {lead.listing.property.code}
                  </Link>
                  <span className={`admin-badge ${stageBadge.cls}`} style={{ fontSize: 10, minHeight: 18, padding: "1px 7px" }}>
                    {stageBadge.label}
                  </span>
                </span>
              );
            })}
            {leads.length > 2 && (
              <span className="admin-dt-muted" style={{ fontSize: 11 }}>
                +{leads.length - 2} inquiry lainnya
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "notes",
      header: "Catatan",
      render: (c) =>
        c.notes ? (
          <span title={c.notes} style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", fontStyle: "italic" }}>
            {c.notes}
          </span>
        ) : (
          <span className="admin-dt-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => {
        const cleanPhone = c.phone.replace(/\D/g, "").replace(/^0/, "62");
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <ButtonLink variant="quiet"
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4"
              style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
              title="Chat WhatsApp"
            >
              <MessageSquare size={13} /> WA
            </ButtonLink>
            <UiButton variant="ghost"
              type="button"
              onClick={() => openEditModal(c)}
              className="h-10 px-4"
              style={{ padding: "6px 10px", fontSize: 12 }}
              title="Edit Customer"
            >
              <Edit2 size={14} /> Edit
            </UiButton>
            <UiButton variant="ghost"
              type="button"
              onClick={() => openDeleteModal(c)}
              className="h-10 px-4"
              style={{
                padding: "6px 10px",
                fontSize: 12,
                color: c.leads && c.leads.length > 0 ? "var(--workspace-text-muted)" : "var(--workspace-danger)",
              }}
              title={
                c.leads && c.leads.length > 0
                  ? "Customer memiliki inquiry terkait"
                  : "Hapus Customer"
              }
            >
              <Trash2 size={14} />
            </UiButton>
          </div>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in">

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>Database Customer (Calon Pembeli)</h1>
          <p>
            {customers.length} calon pembeli unik terdata lintas seluruh listing & CRM leads
          </p>
        </div>
        <UiButton variant="default" onClick={openCreateModal} className="h-10 px-4">
          <Plus size={16} /> Tambah Customer
        </UiButton>
      </div>

      {/* Tabel Customer */}
      <DataTable<CustomerItem>
        rows={customers}
        rowKey={(c) => c.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, no. HP, email, atau kode properti..."
        searchPredicate={searchPredicate}
        initialSort={{ key: "name", dir: "asc" }}
        pageSize={10}
        emptyTitle={search ? "Customer tidak ditemukan" : "Belum ada customer"}
        emptyText={
          search
            ? `Tidak ada hasil pencarian untuk "${search}". Coba kata kunci lain.`
            : "Customer tercatat otomatis saat lead masuk, atau bisa ditambahkan manual."
        }
        emptyAction={
          !search ? (
            <UiButton variant="default" onClick={openCreateModal} className="h-10 px-4">
              <Plus size={16} /> Tambah Customer Pertama
            </UiButton>
          ) : undefined
        }
        columns={customerColumns}
      />

      {/* MODAL TAMBAH / EDIT CUSTOMER */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Data Customer" : "Tambah Customer Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <UiLabel htmlFor="cust-name" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Nama Lengkap Customer <span style={{ color: "var(--color-admin-danger)" }}>*</span>
                  </UiLabel>
                  <UiInput
                    id="cust-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Hendra Wijaya"
                    className="min-h-10 px-3 text-base md:text-sm"
                  />
                </div>

                <div>
                  <UiLabel htmlFor="cust-phone" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Nomor Telepon / WhatsApp <span style={{ color: "var(--color-admin-danger)" }}>*</span>
                  </UiLabel>
                  <UiInput
                    id="cust-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="min-h-10 px-3 text-base md:text-sm"
                  />
                  <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 4, display: "block" }}>
                    Nomor HP digunakan sebagai ID unik CRM (kunci dedupe calon pembeli).
                  </span>
                </div>

                <div>
                  <UiLabel htmlFor="cust-email" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Email (Opsional)</UiLabel>
                  <UiInput
                    id="cust-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hendra@example.com"
                    className="min-h-10 px-3 text-base md:text-sm"
                  />
                </div>

                <div>
                  <UiLabel htmlFor="cust-notes" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan Preferensi / Kebutuhan</UiLabel>
                  <UiTextarea
                    id="cust-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Cari rumah 2 lantai di Kebayoran Baru, budget max 15 Milyar..."
                    className="min-h-24 text-base md:text-sm"
                    style={{ resize: "vertical" }}
                  />
                </div>
            </div>

            <DialogFooter>
              <UiButton
                variant="outline"
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-10 px-4"
                disabled={isSubmitting}
              >
                Batal
              </UiButton>
              <UiButton
                variant="default"
                type="submit"
                className="h-10 px-4"
                disabled={isSubmitting}
              >
                <Save size={16} />
                {isSubmitting ? "Menyimpan..." : editingCustomer ? "Simpan Perubahan" : "Simpan Customer"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: "var(--color-admin-danger)" }}>
              Hapus Data Customer
            </DialogTitle>
          </DialogHeader>

          <div>
            <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus data customer{" "}
              <strong>{deletingCustomer?.name}</strong> ({deletingCustomer?.phone})?
            </p>

            {deletingCustomer?.leads && deletingCustomer.leads.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: 14,
                  padding: 12,
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                <AlertCircle size={18} style={{ color: "var(--color-admin-danger)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: "var(--color-admin-danger)" }}>
                  Customer ini terhubung ke <strong>{deletingCustomer.leads.length} tiket inquiry (leads)</strong>.
                  Customer tidak dapat dihapus sebelum seluruh inquiry terkait diselesaikan atau dihapus dari CRM.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <UiButton
              variant="outline"
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="h-10 px-4"
              disabled={isSubmitting}
            >
              Batal
            </UiButton>
            <UiButton
              variant="destructive"
              type="button"
              onClick={handleDelete}
              className="h-10 px-4"
              disabled={isSubmitting || (deletingCustomer?.leads?.length ?? 0) > 0}
            >
              {isSubmitting ? "Menghapus..." : "Hapus Permanen"}
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
