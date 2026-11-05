"use client";

import { useState } from "react";
import {
  Star,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/admin-ui";
import { DataTable, type DtColumn } from "@/components/admin-ui/DataTable";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label as UiLabel } from "@/components/ui/label";

interface KawasanItem {
  id: string;
  name: string;
  slug: string;
  areaId: number;
  tagline: string | null;
  bannerImage: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  area: {
    id: number;
    name: string;
    slug: string;
  };
  _count: {
    properties: number;
  };
}

interface KawasanListProps {
  initialKawasan: KawasanItem[];
}

export default function KawasanList({ initialKawasan }: KawasanListProps) {
  const [kawasanList, setKawasanList] = useState<KawasanItem[]>(initialKawasan);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKawasan, setEditingKawasan] = useState<KawasanItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [areaId, setAreaId] = useState("");
  const [tagline, setTagline] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const openAddModal = () => {
    setEditingKawasan(null);
    setName("");
    setSlug("");
    setAreaId("");
    setTagline("");
    setBannerImage("");
    setIsFeatured(false);
    setSortOrder(kawasanList.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (k: KawasanItem) => {
    setEditingKawasan(k);
    setName(k.name);
    setSlug(k.slug);
    setAreaId(String(k.areaId));
    setTagline(k.tagline || "");
    setBannerImage(k.bannerImage || "");
    setIsFeatured(k.isFeatured);
    setSortOrder(k.sortOrder);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingKawasan) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  };

  const handleToggleFeatured = async (k: KawasanItem) => {
    const nextVal = !k.isFeatured;
    try {
      const res = await fetch(`/api/kawasan/${k.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: nextVal }),
      });

      if (!res.ok) throw new Error("Gagal mengubah status banner");

      setKawasanList((prev) =>
        prev.map((item) => (item.id === k.id ? { ...item, isFeatured: nextVal } : item))
      );

      toast.success(
        nextVal
          ? `"${k.name}" sekarang ditampilkan di banner homepage`
          : `"${k.name}" dicopot dari banner homepage`
      );
    } catch {
      toast.error("Terjadi kesalahan saat mengubah status banner");
    }
  };

  const handleDelete = async (k: KawasanItem) => {
    if (k._count.properties > 0) {
      toast.error(`Kawasan ini memiliki ${k._count.properties} properti aktif. Hapus relasi terlebih dahulu.`);
      return;
    }

    if (!confirm(`Hapus kawasan "${k.name}"?`)) return;

    try {
      const res = await fetch(`/api/kawasan/${k.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus kawasan");

      setKawasanList((prev) => prev.filter((item) => item.id !== k.id));
      toast.success(`Kawasan "${k.name}" berhasil dihapus`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kawasan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !areaId) {
      toast.error("Nama dan Kecamatan wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingKawasan) {
        // Edit existing
        const res = await fetch(`/api/kawasan/${editingKawasan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            areaId,
            tagline,
            bannerImage,
            isFeatured,
            sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal update kawasan");

        setKawasanList((prev) =>
          prev.map((item) => (item.id === editingKawasan.id ? { ...item, ...data.kawasan } : item))
        );
        toast.success(`Kawasan "${name}" berhasil diperbarui`);
      } else {
        // Create new
        const res = await fetch("/api/kawasan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            areaId,
            tagline,
            bannerImage,
            isFeatured,
            sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat kawasan");

        setKawasanList((prev) => [data.kawasan, ...prev]);
        toast.success(`Kawasan "${name}" berhasil dibuat`);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const featuredCount = kawasanList.filter((k) => k.isFeatured).length;

  const kawasanColumns: DtColumn<KawasanItem>[] = [
    {
      key: "name",
      header: "Nama Kawasan",
      sortValue: (k) => k.name,
      render: (k) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => handleToggleFeatured(k)}
            title={k.isFeatured ? "Hapus dari banner homepage" : "Tampilkan di banner homepage"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              color: k.isFeatured ? "var(--workspace-primary)" : "var(--workspace-text-muted)",
            }}
          >
            <Star size={16} fill={k.isFeatured ? "currentColor" : "none"} />
          </button>
          <span className="admin-dt-link" style={{ fontWeight: 600 }}>{k.name}</span>
        </span>
      ),
    },
    {
      key: "area",
      header: "Kecamatan",
      sortValue: (k) => k.area.name,
      render: (k) => <>Kec. {k.area.name}</>,
    },
    {
      key: "slug",
      header: "Slug",
      sortValue: (k) => k.slug,
      render: (k) => <span className="admin-dt-muted">/{k.slug}</span>,
    },
    {
      key: "properties",
      header: "Properti",
      align: "right",
      sortValue: (k) => k._count.properties,
      render: (k) => k._count.properties,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (k) => (k.isFeatured ? 1 : 0),
      render: (k) =>
        k.isFeatured ? (
          <span className="admin-badge admin-badge-active">Featured</span>
        ) : (
          <span className="admin-badge admin-badge-draft">Standar</span>
        ),
    },
    {
      key: "tagline",
      header: "Tagline",
      render: (k) =>
        k.tagline ? (
          <span style={{ fontStyle: "italic" }}>&ldquo;{k.tagline}&rdquo;</span>
        ) : (
          <span className="admin-dt-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (k) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          <UiButton variant="ghost"
            type="button"
            onClick={() => openEditModal(k)}
            className="h-10 px-4"
            style={{ padding: "6px 10px", fontSize: 12 }}
            title="Edit kawasan"
          >
            <Edit2 size={14} /> Edit
          </UiButton>
          <UiButton variant="ghost"
            type="button"
            onClick={() => handleDelete(k)}
            className="h-10 px-4"
            style={{
              padding: "6px 10px",
              fontSize: 12,
              color: "var(--workspace-danger)",
            }}
            title="Hapus kawasan"
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
          <h1>Kawasan Populer / Branded</h1>
          <p>
            Kelola nama kawasan populer untuk SEO & banner &quot;Kawasan Pilihan&quot; di homepage
          </p>
        </div>
        <UiButton variant="default"
          type="button"
          onClick={openAddModal}
          className="h-10 px-4"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} /> Tambah Kawasan
        </UiButton>
      </div>

      {/* Banner summary notice ala CF */}
      <div className="admin-notice">
        <Sparkles size={16} />
        <span>
          <strong>{featuredCount} kawasan</strong> aktif di banner homepage — klik ikon bintang
          pada baris untuk toggle tampil di homepage. Total {kawasanList.length} kawasan.
        </span>
      </div>

      {/* Tabel Kawasan */}
      <DataTable<KawasanItem>
        rows={kawasanList}
        rowKey={(k) => k.id}
        searchPlaceholder="Cari nama kawasan, slug, atau kecamatan…"
        searchPredicate={(k, q) =>
          [k.name, k.slug, k.area.name, k.tagline || ""].join(" ").toLowerCase().includes(q)
        }
        initialSort={{ key: "name", dir: "asc" }}
        pageSize={10}
        emptyTitle="Kawasan tidak ditemukan"
        emptyText="Klik tombol Tambah Kawasan untuk mendaftarkan kawasan populer pertama."
        columns={kawasanColumns}
      />

      {/* Modal Add/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingKawasan ? "Edit Kawasan" : "Tambah Kawasan Populer"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div>
                {/* Nama Kawasan */}
                <div className="admin-input-group">
                  <UiLabel htmlFor="kawasan-name" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Nama Kawasan *
                  </UiLabel>
                  <UiInput
                    id="kawasan-name"
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="e.g. Kemang, Senopati, Pondok Indah"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-input-group">
                  <UiLabel htmlFor="kawasan-slug" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Slug URL *
                  </UiLabel>
                  <UiInput
                    id="kawasan-slug"
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="kemang"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-input-group">
                  <AreaPicker
                    value={areaId}
                    maxLevel={3}
                    required
                    idPrefix="kawasan-area"
                    onChange={({ kecamatanId }) => setAreaId(kecamatanId ? String(kecamatanId) : "")}
                  />
                </div>

                {/* Tagline Promo Homepage */}
                <div className="admin-input-group">
                  <UiLabel htmlFor="kawasan-tagline" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Tagline Promosi (Banner Homepage)
                  </UiLabel>
                  <UiInput
                    id="kawasan-tagline"
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="e.g. Pusat hunian ekspat & gaya hidup dinamis di Jakarta Selatan"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                  <div className="admin-input-hint" style={{ fontSize: 11 }}>
                    Ditampilkan di bawah nama kawasan pada banner homepage & meta description SEO
                  </div>
                </div>

                {/* Banner Image URL/Path */}
                <div className="admin-input-group">
                  <UiLabel htmlFor="kawasan-banner" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                    Path Foto Banner
                  </UiLabel>
                  <UiInput
                    id="kawasan-banner"
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="/images/kawasan/kemang.webp"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                  />
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>Tampilkan di banner Homepage</span>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <UiLabel htmlFor="kawasan-sort" style={{ fontSize: 13 }}>
                      Urutan:
                    </UiLabel>
                    <UiInput
                      id="kawasan-sort"
                      type="number"
                      className="min-h-10 px-3 text-base md:text-sm"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                      style={{ width: 70, padding: "6px 10px" }}
                    />
                  </div>
                </div>
            </div>

            <DialogFooter>
              <UiButton
                variant="ghost"
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-10 px-4"
              >
                Batal
              </UiButton>
              <UiButton
                variant="default"
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-4"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Save size={16} />
                {isSubmitting ? "Menyimpan..." : "Simpan Kawasan"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
