"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  MapPin,
  Ruler,
  FileText,
  UploadCloud,
  Trash2,
  Star,
  ImageIcon,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import PropertyPublicPreviewModal from "../PropertyPublicPreviewModal";
import { AreaPicker } from "@/components/admin-ui";
import { getMediaUrl } from "@/lib/media-url";

interface KawasanOption {
  id: string;
  name: string;
  areaId: number;
}

export interface MediaItem {
  id: string;
  fileName: string;
  filePath: string;
  isPrimary: boolean;
  altText?: string | null;
  type: string;
}

interface PropertyData {
  id: string;
  code: string;
  type: string;
  areaId: number;
  villageId: number | null;
  kawasanId: string | null;
  address: string;
  landArea: number | null;
  buildingArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  garages?: number | null;
  carports?: number | null;
  certificateType: string | null;
  yearBuilt: number | null;
  facing: string | null;
  electricity: number | null;
  waterSource: string | null;
  internalNotes: string | null;
}

interface EditPropertyProps {
  property: PropertyData;
  kawasanList: KawasanOption[];
  initialMedia?: MediaItem[];
  areaName?: string;
  listing?: {
    title?: string | null;
    description?: string | null;
    askingPrice?: number | string | null;
    videoUrl?: string | null;
    videoPlatform?: string | null;
    status?: string;
  } | null;
  amenities?: Array<{
    amenity: {
      name: string;
      icon?: string | null;
    };
  }>;
  owner?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
}

export default function EditPropertyClient({
  property,
  kawasanList,
  initialMedia = [],
  areaName,
  listing,
  amenities = [],
  owner,
}: EditPropertyProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [type, setType] = useState(property.type);
  const [areaId, setAreaId] = useState(String(property.areaId));
  const [villageId, setVillageId] = useState(property.villageId ? String(property.villageId) : "");
  const [pickerAreaId, setPickerAreaId] = useState<number | null>(property.villageId ?? property.areaId);
  const [kawasanId, setKawasanId] = useState(property.kawasanId || "");
  const [address, setAddress] = useState(property.address);
  const [landArea, setLandArea] = useState(property.landArea?.toString() || "");
  const [buildingArea, setBuildingArea] = useState(property.buildingArea?.toString() || "");
  const [bedrooms, setBedrooms] = useState(property.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(property.bathrooms?.toString() || "");
  const [floors, setFloors] = useState(property.floors?.toString() || "1");
  const [certificateType, setCertificateType] = useState(property.certificateType || "SHM");
  const [yearBuilt, setYearBuilt] = useState(property.yearBuilt?.toString() || "");
  const [facing, setFacing] = useState(property.facing || "");
  const [electricity, setElectricity] = useState(property.electricity?.toString() || "");
  const [waterSource, setWaterSource] = useState(property.waterSource || "");
  const [internalNotes, setInternalNotes] = useState(property.internalNotes || "");
  const [ownerName, setOwnerName] = useState(owner?.name || "");
  const [ownerPhone, setOwnerPhone] = useState(owner?.phone || "");

  // Photo management states
  const [mediaList, setMediaList] = useState<MediaItem[]>(initialMedia);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  // Full Lightbox Gallery state with Touch Gestures
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const allPhotos = [
    ...mediaList.map((m) => ({
      url: getMediaUrl(m.filePath),
      title: m.fileName,
      isPrimary: m.isPrimary,
    })),
    ...newPreviews.map((url, idx) => ({
      url,
      title: newPhotos[idx]?.name || `Foto Baru ${idx + 1}`,
      isPrimary: mediaList.length === 0 && idx === 0,
    })),
  ];

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > 45) {
      setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allPhotos.length : 0));
    } else if (distance < -45) {
      setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allPhotos.length) % allPhotos.length : 0));
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Keyboard navigation and body scroll lock for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allPhotos.length : 0));
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allPhotos.length) % allPhotos.length : 0));
      }
    };

    if (lightboxIndex !== null) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, allPhotos.length]);

  const handleKawasanChange = (kId: string) => {
    setKawasanId(kId);
    if (kId) {
      const selectedKawasan = kawasanList.find((k) => k.id === kId);
      if (selectedKawasan) {
        setAreaId(String(selectedKawasan.areaId));
        setPickerAreaId(selectedKawasan.areaId);
      }
    }
  };

  // Photo select handler
  const handleSelectNewPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNewPhotos((prev) => [...prev, ...files]);
      const previews = files.map((f) => URL.createObjectURL(f));
      setNewPreviews((prev) => [...prev, ...previews]);
      e.target.value = "";
    }
  };

  const handleRemoveNewPhoto = (idx: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSetPrimary = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/properties/${property.id}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, isPrimary: true }),
      });
      if (res.ok) {
        setMediaList((prev) =>
          prev.map((m) => ({ ...m, isPrimary: m.id === mediaId }))
        );
        toast.success("Foto utama berhasil diperbarui.");
      } else {
        toast.error("Gagal mengatur foto utama.");
      }
    } catch {
      toast.error("Gagal menghubungi server.");
    }
  };

  const handleDeleteExistingMedia = async (mediaId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus foto ini?")) return;
    try {
      const res = await fetch(`/api/properties/${property.id}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
        toast.success("Foto berhasil dihapus.");
      } else {
        toast.error("Gagal menghapus foto.");
      }
    } catch {
      toast.error("Gagal menghubungi server.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast.error("Alamat properti wajib diisi");
      return;
    }

    setIsSubmitting(true);
    toast.loading("Menyimpan perubahan properti...", { id: "edit-prop" });

    try {
      const payload = {
        type,
        areaId,
        villageId: villageId || null,
        kawasanId: kawasanId || null,
        address: address.trim(),
        landArea: landArea ? parseInt(landArea) : null,
        buildingArea: buildingArea ? parseInt(buildingArea) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        floors: floors ? parseInt(floors) : 1,
        certificateType: certificateType || null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        facing: facing || null,
        electricity: electricity ? parseInt(electricity) : null,
        waterSource: waterSource || null,
        internalNotes: internalNotes || null,
        owner: owner?.id || ownerName.trim()
          ? {
              id: owner?.id || null,
              name: ownerName.trim(),
              phone: ownerPhone.trim() || null,
            }
          : undefined,
      };

      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui properti");
      }

      // Upload new photos if any
      if (newPhotos.length > 0) {
        toast.loading(`Mengunggah ${newPhotos.length} foto baru...`, { id: "edit-prop" });
        for (let i = 0; i < newPhotos.length; i++) {
          const file = newPhotos[i];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("isPrimary", mediaList.length === 0 && i === 0 ? "true" : "false");
          formData.append("sortOrder", String(mediaList.length + i));

          await fetch(`/api/properties/${property.id}/media`, {
            method: "POST",
            body: formData,
          });
        }
      }

      toast.success("Properti & foto berhasil diperbarui!", { id: "edit-prop" });
      router.push(`/admin/properties/${property.id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan", {
        id: "edit-prop",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href={`/admin/properties/${property.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--color-admin-text-secondary)",
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={16} /> Kembali ke detail properti
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32 }}>
              {{ HOUSE: "🏠", APARTMENT: "🏢", LAND: "📐", SHOPHOUSE: "🏪" }[type] || "🏠"}
            </span>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                Edit Properti: {property.code}
              </h1>
              <p style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", margin: 0, marginTop: 2 }}>
                Perbarui spesifikasi, foto, dan catatan internal properti
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <PropertyPublicPreviewModal
              property={{
                id: property.id,
                code: property.code,
                type,
                address,
                landArea: landArea ? Number(landArea) : null,
                buildingArea: buildingArea ? Number(buildingArea) : null,
                bedrooms: bedrooms ? Number(bedrooms) : null,
                bathrooms: bathrooms ? Number(bathrooms) : null,
                floors: floors ? Number(floors) : null,
                garages: property.garages,
                carports: property.carports,
                certificateType,
                electricity: electricity ? Number(electricity) : null,
                waterSource,
                facing,
              }}
              areaName={areaName}
              listing={listing}
              media={allPhotos.map((p, idx) => ({
                id: `preview-${idx}`,
                filePath: p.url.startsWith("http") ? p.url : p.url.replace(/^\/uploads\//, ""),
                isPrimary: p.isPrimary,
                altText: p.title,
              }))}
              amenities={amenities}
              buttonText="Preview Listing (HP)"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Card 1: Identitas & Lokasi */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <MapPin size={16} style={{ display: "inline", marginRight: 6 }} />
              Identitas & Lokasi Properti
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Property Type Buttons */}
            <div>
              <label className="admin-label">Tipe Properti</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { key: "HOUSE", label: "Rumah", icon: "🏠" },
                  { key: "APARTMENT", label: "Apartemen", icon: "🏢" },
                  { key: "LAND", label: "Tanah", icon: "📐" },
                  { key: "SHOPHOUSE", label: "Ruko", icon: "🏪" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setType(item.key)}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: type === item.key ? "2px solid var(--color-admin-primary)" : "1px solid var(--color-admin-border)",
                      background: type === item.key ? "rgba(16, 185, 129, 0.08)" : "transparent",
                      color: type === item.key ? "var(--color-admin-primary)" : "var(--color-admin-text)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: type === item.key ? 600 : 400,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ fontSize: 13 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kawasan & administrative area */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
              <div>
                <label className="admin-label">Kawasan Populer / Branded</label>
                <select
                  className="admin-input"
                  value={kawasanId}
                  onChange={(e) => handleKawasanChange(e.target.value)}
                >
                  <option value="">— Tidak terikat kawasan khusus —</option>
                  {kawasanList.filter((k) => !areaId || String(k.areaId) === areaId).map((k) => (
                    <option key={k.id} value={k.id}>
                      ⭐ {k.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
                  Memilih kawasan akan otomatis mencocokkan Kecamatan induk.
                </div>
              </div>

              <AreaPicker
                value={pickerAreaId}
                required
                idPrefix="edit-property-area"
                onChange={({ areaId: leafId, kecamatanId }) => {
                  setPickerAreaId(leafId);
                  setAreaId(kecamatanId ? String(kecamatanId) : "");
                  setVillageId(leafId && kecamatanId && leafId !== kecamatanId ? String(leafId) : "");
                  if (kawasanId && kawasanList.find((item) => item.id === kawasanId)?.areaId !== kecamatanId) {
                    setKawasanId("");
                  }
                }}
              />
            </div>

            {/* Address */}
            <div>
              <label className="admin-label">
                Alamat Lengkap (Internal Only) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                className="admin-input"
                rows={3}
                placeholder="Jl. Raya Kemang No. 12, RT 01/RW 02..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
              <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
                Alamat lengkap hanya dapat diakses oleh tim internal admin Jual Rumah Property.
              </div>
            </div>
          </div>
        </div>

        {/* Owner boleh dilengkapi saat draft, tetapi wajib sebelum listing dipublikasikan. */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <Users size={16} style={{ display: "inline", marginRight: 6 }} />
              Owner properti
            </div>
            <div className="admin-card-subtitle">
              Boleh dikosongkan saat draft, tetapi wajib dilengkapi sebelum status Siap Publish.
            </div>
          </div>
          <div className="admin-grid-2">
            <div className="admin-input-group">
              <label className="admin-label">Nama owner</label>
              <input
                type="text"
                className="admin-input"
                placeholder="Nama pemilik properti"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
              />
            </div>
            <div className="admin-input-group">
              <label className="admin-label">Nomor WhatsApp owner</label>
              <input
                type="tel"
                className="admin-input"
                inputMode="tel"
                placeholder="08xxx"
                value={ownerPhone}
                onChange={(event) => setOwnerPhone(event.target.value)}
              />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
            Informasi ini bersifat internal dan tidak ditampilkan pada portal publik.
          </div>
        </div>

        {/* Card 2: Foto & Media Properti (NEW) */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <ImageIcon size={16} style={{ display: "inline", marginRight: 6 }} />
              Foto & Media Properti ({mediaList.length + newPhotos.length})
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Foto yang Sudah Ada */}
            {mediaList.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text-secondary)", marginBottom: 10 }}>
                  Foto Terdaftar Saat Ini:
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: 10,
                  }}
                >
                  {mediaList.map((m, idx) => (
                    <div
                      key={m.id}
                      onClick={() => setLightboxIndex(idx)}
                      role="button"
                      tabIndex={0}
                      title="Ketuk untuk melihat foto ukuran penuh"
                      style={{
                        position: "relative",
                        aspectRatio: "4/3",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: m.isPrimary ? "2px solid #10b981" : "1px solid var(--color-admin-border)",
                        background: "#000",
                        cursor: "pointer",
                        touchAction: "manipulation",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getMediaUrl(m.filePath)}
                        alt={m.altText || m.fileName}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />

                      {/* Zoom Badge Indicator */}
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          background: "rgba(0, 0, 0, 0.65)",
                          backdropFilter: "blur(2px)",
                          borderRadius: 4,
                          padding: "3px 5px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      >
                        <Maximize2 size={11} />
                      </span>

                      {/* Hover zoom overlay (desktop) */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "opacity 0.15s ease",
                          pointerEvents: "none",
                        }}
                        className="hover-overlay"
                      >
                        <Maximize2 size={20} style={{ color: "#fff" }} />
                      </div>

                      {/* Primary badge */}
                      {m.isPrimary && (
                        <span
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            background: "#10b981",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Star size={10} fill="#fff" /> UTAMA
                        </span>
                      )}

                      {/* Action overlay buttons */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: "rgba(0,0,0,0.75)",
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 8px",
                          zIndex: 3,
                        }}
                      >
                        {!m.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(m.id)}
                            title="Jadikan Foto Utama"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#fbbf24",
                              fontSize: 11,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Star size={12} /> Set Utama
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingMedia(m.id)}
                          title="Hapus Foto Ini"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            marginLeft: "auto",
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Foto Baru yang Dipilih */}
            {newPreviews.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 10 }}>
                  Foto Baru yang Akan Ditambahkan ({newPreviews.length}):
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: 8,
                  }}
                >
                  {newPreviews.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxIndex(mediaList.length + idx)}
                      role="button"
                      tabIndex={0}
                      title="Ketuk untuk melihat foto ukuran penuh"
                      style={{
                        position: "relative",
                        aspectRatio: "4/3",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px dashed #10b981",
                        cursor: "pointer",
                        touchAction: "manipulation",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />

                      {/* Zoom Badge Indicator */}
                      <span
                        style={{
                          position: "absolute",
                          bottom: 4,
                          left: 4,
                          background: "rgba(0, 0, 0, 0.65)",
                          backdropFilter: "blur(2px)",
                          borderRadius: 4,
                          padding: "2px 4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      >
                        <Maximize2 size={10} />
                      </span>

                      {/* Hover zoom overlay (desktop) */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "opacity 0.15s ease",
                          pointerEvents: "none",
                        }}
                        className="hover-overlay"
                      >
                        <Maximize2 size={18} style={{ color: "#fff" }} />
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNewPhoto(idx);
                        }}
                        title="Batal upload foto ini"
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.75)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 22,
                          height: 22,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 3,
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dropzone Upload Foto Baru */}
            <label
              style={{
                border: "2px dashed var(--color-admin-border)",
                borderRadius: 10,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                textAlign: "center",
                background: "rgba(0,0,0,0.01)",
                marginTop: 4,
              }}
            >
              <UploadCloud size={28} style={{ color: "var(--color-admin-primary)", marginBottom: 6 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Pilih Foto dari Galeri / Kamera</span>
              <span style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                Format foto apapun diterima (JPG, PNG, WebP, iPhone HEIC)
              </span>
              <input
                type="file"
                multiple
                accept="image/*,video/mp4"
                onChange={handleSelectNewPhotos}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {/* Card 3: Dimensi & Spesifikasi Bangunan */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <Ruler size={16} style={{ display: "inline", marginRight: 6 }} />
              Dimensi & Spesifikasi Bangunan
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div>
              <label className="admin-label">Luas Tanah (m²)</label>
              <input
                type="number"
                className="admin-input"
                placeholder="Contoh: 350"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Luas Bangunan (m²)</label>
              <input
                type="number"
                className="admin-input"
                placeholder="Contoh: 450"
                value={buildingArea}
                onChange={(e) => setBuildingArea(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Jumlah Lantai</label>
              <input
                type="number"
                className="admin-input"
                placeholder="Contoh: 2"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div>
              <label className="admin-label">Kamar Tidur Utama</label>
              <input
                type="number"
                className="admin-input"
                placeholder="Contoh: 4"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Kamar Mandi Utama</label>
              <input
                type="number"
                className="admin-input"
                placeholder="Contoh: 3"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 14 }}>
            <div>
              <label className="admin-label">Sertifikat</label>
              <select
                className="admin-input"
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value)}
              >
                <option value="SHM">SHM (Sertifikat Hak Milik)</option>
                <option value="SHGB">SHGB (Hak Guna Bangunan)</option>
                <option value="SHSRS">SHSRS (Strata Title / Rusun)</option>
                <option value="AJB">AJB (Akta Jual Beli)</option>
                <option value="PPJB">PPJB (Perjanjian Pengikatan)</option>
                <option value="GIRIK">Girik / Letter C</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Tahun Bangun</label>
              <input
                type="number"
                className="admin-input"
                placeholder="Contoh: 2018"
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Arah Hadap</label>
              <input
                type="text"
                className="admin-input"
                placeholder="Utara, Selatan..."
                value={facing}
                onChange={(e) => setFacing(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Daya Listrik (Watt)</label>
              <input
                type="number"
                className="admin-input"
                placeholder="4400, 7700..."
                value={electricity}
                onChange={(e) => setElectricity(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="admin-label">Sumber Air</label>
            <input
              type="text"
              className="admin-input"
              placeholder="PAM, Sumur Bor Jetpump..."
              value={waterSource}
              onChange={(e) => setWaterSource(e.target.value)}
            />
          </div>
        </div>

        {/* Card 4: Catatan Internal */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <FileText size={16} style={{ display: "inline", marginRight: 6 }} />
              Catatan Internal Properti
            </div>
          </div>
          <div>
            <textarea
              className="admin-input"
              rows={3}
              placeholder="Catatan akses jalan, kondisi fisik, historis kepemilikan, atau hal yang perlu diperhatikan tim..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <PropertyPublicPreviewModal
            property={{
              id: property.id,
              code: property.code,
              type,
              address,
              landArea: landArea ? Number(landArea) : null,
              buildingArea: buildingArea ? Number(buildingArea) : null,
              bedrooms: bedrooms ? Number(bedrooms) : null,
              bathrooms: bathrooms ? Number(bathrooms) : null,
              floors: floors ? Number(floors) : null,
              garages: property.garages,
              carports: property.carports,
              certificateType,
              electricity: electricity ? Number(electricity) : null,
              waterSource,
              facing,
            }}
            areaName={areaName}
            listing={listing}
            media={allPhotos.map((p, idx) => ({
              id: `preview-${idx}`,
              filePath: p.url.startsWith("http") ? p.url : p.url.replace(/^\/uploads\//, ""),
              isPrimary: p.isPrimary,
              altText: p.title,
            }))}
            amenities={amenities}
            buttonText="Lihat Preview Listing (HP)"
          />
          <Link
            href={`/admin/properties/${property.id}`}
            className="admin-btn admin-btn-secondary"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isSubmitting}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px" }}
          >
            <Save size={16} />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan Properti"}
          </button>
        </div>
      </form>

      {/* Lightbox Preview Modal with Swipe & Next/Prev Navigation */}
      {lightboxIndex !== null && allPhotos[lightboxIndex] && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "max(12px, env(safe-area-inset-top))",
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            paddingLeft: 12,
            paddingRight: 12,
            height: "100vh",
            maxHeight: "100dvh",
            userSelect: "none",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            style={{
              width: "100%",
              maxWidth: 1080,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#fff",
              padding: "6px 8px",
              zIndex: 20,
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.02em" }}>
                Foto {lightboxIndex + 1} / {allPhotos.length}
              </span>
              {allPhotos[lightboxIndex].isPrimary && (
                <span
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <Star size={11} fill="#fff" /> Foto Utama
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: "50%",
                width: 42,
                height: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Tutup (Esc)"
              aria-label="Tutup"
            >
              <X size={22} />
            </button>
          </div>

          {/* Center Image with Touch Gestures & Navigation */}
          <div
            style={{
              flex: 1,
              width: "100%",
              maxWidth: 1080,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              minHeight: 0,
              touchAction: "pan-y",
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={() => setLightboxIndex(null)}
          >
            {/* Prev Button */}
            {allPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allPhotos.length) % allPhotos.length : 0));
                }}
                style={{
                  position: "absolute",
                  left: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(0, 0, 0, 0.65)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "50%",
                  width: 42,
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  cursor: "pointer",
                  zIndex: 25,
                  backdropFilter: "blur(4px)",
                }}
                title="Foto Sebelumnya"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={allPhotos[lightboxIndex].url}
              alt={allPhotos[lightboxIndex].title}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
              }}
            />

            {/* Next Button */}
            {allPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allPhotos.length : 0));
                }}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(0, 0, 0, 0.65)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "50%",
                  width: 42,
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  cursor: "pointer",
                  zIndex: 25,
                  backdropFilter: "blur(4px)",
                }}
                title="Foto Berikutnya"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "rgba(255, 255, 255, 0.6)",
              textAlign: "center",
              paddingBottom: 8,
              flexShrink: 0,
            }}
          >
            Usap layar ke kiri/kanan untuk ganti foto • Ketuk area luar untuk menutup
          </div>
        </div>
      )}
    </div>
  );
}
