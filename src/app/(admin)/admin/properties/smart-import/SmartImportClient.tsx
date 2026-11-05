"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Video,
  PlayCircle,
  Maximize2,
  X,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { DuplicateMatch } from "@/lib/duplicate-checker";
import { AreaPicker } from "@/components/admin-ui";
import { Card as UiCard } from "@/components/ui/card";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import { Label as UiLabel } from "@/components/ui/label";
import { ButtonLink } from "@/components/admin-ui/Button";

interface KawasanOption {
  id: string;
  name: string;
  slug: string;
  areaId: number;
}

interface AmenityOption {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
}

interface SmartImportClientProps {
  amenities: AmenityOption[];
  kawasanList: KawasanOption[];
}

export default function SmartImportClient({
  amenities,
  kawasanList,
}: SmartImportClientProps) {
  const router = useRouter();

  // Raw text input state
  const [rawText, setRawText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [parserEngine, setParserEngine] = useState<"GEMINI_AI" | "LOCAL_HEURISTIC" | null>(null);

  // Duplicate states
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [dismissDuplicate, setDismissDuplicate] = useState(false);

  // Photo states
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [previewModal, setPreviewModal] = useState<{ url: string; title: string; isPrimary?: boolean } | null>(null);

  // Esc key & body scroll lock for preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewModal(null);
    };
    if (previewModal) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewModal]);

  // Form states (populated by AI)
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE">("HOUSE");
  const [areaId, setAreaId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [pickerAreaId, setPickerAreaId] = useState<number | null>(null);
  const [kawasanId, setKawasanId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [landArea, setLandArea] = useState<string>("");
  const [buildingArea, setBuildingArea] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [maidBedrooms, setMaidBedrooms] = useState<string>("");
  const [maidBathrooms, setMaidBathrooms] = useState<string>("");
  const [floors, setFloors] = useState<string>("1");
  const [garages, setGarages] = useState<string>("0");
  const [carports, setCarports] = useState<string>("0");
  const [certificateType, setCertificateType] = useState<string>("SHM");
  const [askingPrice, setAskingPrice] = useState<string>("");
  const [listingStatus, setListingStatus] = useState<"DRAFT" | "PENDING_VERIFICATION">("DRAFT");
  const [description, setDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPlatform, setVideoPlatform] = useState<string>("YOUTUBE");

  // Owner & Intermediary optional
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [intermediaryName, setIntermediaryName] = useState("");
  const [intermediaryPhone, setIntermediaryPhone] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Sample prompt helper
  const handleUseSample = () => {
    const sample = `DIJUAL RUMAH 1 LANTAI – CIPETE SELATAN

Lokasi Strategis – Cipete Selatan, Jakarta Selatan

Spesifikasi: • 1 Lantai
• Full Marmer
• Luas Tanah: 454 m²
• Luas Bangunan: 350 m²
• SHM
• 3 Kamar Tidur + 1
• 2 Kamar Mandi + 1
• Swimming Pool 
• Garasi 4 mobil 
• Halaman luas 

Harga: Rp12,5 Miliar – Nego

Serius berminat? Silakan hubungi untuk info & jadwal survey.`;
    setRawText(sample);
  };

  // Extract handler
  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error("Silakan tempel teks listing WhatsApp terlebih dahulu.");
      return;
    }

    setIsExtracting(true);
    setDuplicates([]);
    setDismissDuplicate(false);

    try {
      const res = await fetch("/api/properties/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengekstrak teks.");
      }

      const p = data.parsed;
      setParserEngine(p.parsedBy);
      setCode(data.suggestedCode || "");
      setTitle(p.title || "");
      setType(p.type || "HOUSE");
      // Area AI tetap dipakai sebagai kecamatan awal dan di-resolve oleh picker.
      setAreaId(p.areaId ? String(p.areaId) : "");
      setVillageId("");
      setPickerAreaId(p.areaId ? Number(p.areaId) : null);
      setKawasanId(p.kawasanId || "");
      setAddress(p.address || "");
      setLandArea(p.landArea ? String(p.landArea) : "");
      setBuildingArea(p.buildingArea ? String(p.buildingArea) : "");
      setBedrooms(p.bedrooms ? String(p.bedrooms) : "");
      setBathrooms(p.bathrooms ? String(p.bathrooms) : "");
      setMaidBedrooms(p.maidBedrooms ? String(p.maidBedrooms) : "");
      setMaidBathrooms(p.maidBathrooms ? String(p.maidBathrooms) : "");
      setFloors(p.floors ? String(p.floors) : "1");
      setGarages(p.garages ? String(p.garages) : "0");
      setCarports(p.carports ? String(p.carports) : "0");
      setCertificateType(p.certificateType || "SHM");
      setAskingPrice(p.askingPrice ? String(p.askingPrice) : "");
      setDescription(p.description || "");
      setInternalNotes(p.internalNotes || "");
      setVideoUrl(p.videoUrl || "");
      setVideoPlatform(p.videoPlatform || "YOUTUBE");

      // Auto-match amenities
      if (Array.isArray(p.amenitySlugs) && p.amenitySlugs.length > 0) {
        const matchedAmenityIds = amenities
          .filter((a) => p.amenitySlugs.includes(a.slug))
          .map((a) => a.id);
        setSelectedAmenityIds(matchedAmenityIds);
      }

      // Handle duplicate detection
      if (Array.isArray(data.duplicates) && data.duplicates.length > 0) {
        setDuplicates(data.duplicates);
        toast.warning(`Peringatan: Ditemukan ${data.duplicates.length} properti yang mirip di database!`, {
          duration: 5000,
        });
      } else {
        toast.success("Teks berhasil diekstrak! Tidak ditemukan data duplikat.");
      }

      setHasExtracted(true);
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      toast.error(err instanceof Error ? err.message : "Gagal memproses AI extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle Photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...filesArray]);

      const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  // Filter kawasans based on selected area
  const availableKawasans = kawasanList.filter((k) => String(k.areaId) === areaId);

  // Submit and Save
  const handleSaveProperty = async () => {
    if (!address.trim()) {
      toast.error("Alamat properti wajib diisi.");
      return;
    }
    if (!areaId) {
      toast.error("Pilih kecamatan untuk properti.");
      return;
    }

    setIsSaving(true);
    toast.loading("Menyimpan properti dan listing...", { id: "save-prop" });

    try {
      // 1. Simpan Property & Listing
      const payload = {
        code: code.trim(),
        type,
        areaId,
        villageId: villageId || null,
        kawasanId: kawasanId || null,
        address: address.trim(),
        landArea: landArea ? parseInt(landArea, 10) : null,
        buildingArea: buildingArea ? parseInt(buildingArea, 10) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
        floors: floors ? parseInt(floors, 10) : 1,
        garages: garages ? parseInt(garages, 10) : 0,
        carports: carports ? parseInt(carports, 10) : 0,
        certificateType: certificateType || null,
        amenityIds: selectedAmenityIds,
        askingPrice: askingPrice ? parseInt(askingPrice, 10) : null,
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl.trim() || undefined,
        videoPlatform: videoUrl.trim() ? videoPlatform : undefined,
        internalNotes: [
          internalNotes.trim(),
          maidBedrooms ? `Kamar Tidur ART: +${maidBedrooms}` : "",
          maidBathrooms ? `Kamar Mandi ART: +${maidBathrooms}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        ownerName: ownerName.trim() || undefined,
        ownerPhone: ownerPhone.trim() || undefined,
        intermediaryName: intermediaryName.trim() || undefined,
        intermediaryPhone: intermediaryPhone.trim() || undefined,
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Gagal menyimpan properti.");
      }

      const createdPropertyId = resData.property.id;

      // 2. Upload photos jika ada
      if (photos.length > 0) {
        toast.loading(`Mengunggah ${photos.length} foto properti...`, { id: "save-prop" });
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("isPrimary", i === 0 ? "true" : "false");
          formData.append("sortOrder", String(i));

          const uploadResponse = await fetch(`/api/properties/${createdPropertyId}/media`, {
            method: "POST",
            body: formData,
          });
          if (!uploadResponse.ok) throw new Error(`Gagal mengunggah foto ${i + 1}`);
        }
      }

      if (listingStatus === "PENDING_VERIFICATION" && resData.listing?.id) {
        const reviewResponse = await fetch(`/api/listings/${resData.listing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PENDING_VERIFICATION" }),
        });
        if (!reviewResponse.ok) {
          const reviewData = await reviewResponse.json();
          throw new Error(reviewData.error || "Gagal mengirim listing untuk verifikasi");
        }
      }

      toast.success("Properti & Listing berhasil disimpan!", { id: "save-prop" });
      router.push(`/admin/properties/${createdPropertyId}`);
    } catch (err: unknown) {
      console.error("Save error:", err);
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan properti.", {
        id: "save-prop",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <ButtonLink variant="secondary"
              href="/admin/properties"
              className="h-10 px-4"
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              <ArrowLeft size={14} /> Kembali
            </ButtonLink>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                fontSize: 12,
                borderRadius: 999,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              <Sparkles size={12} /> AI Smart Import
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Smart Import WhatsApp
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 2 }}>
            Ekstrak teks broadcast WhatsApp menjadi properti dan listing dengan deteksi duplikasi otomatis.
          </p>
        </div>
      </div>

      {/* Step 1: Text Input Box */}
      <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <span>📋 Paste Teks Listing WhatsApp</span>
          </label>
          <button
            type="button"
            onClick={handleUseSample}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-admin-primary)",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Contoh Teks Cipete Selatan
          </button>
        </div>

        <UiTextarea
          rows={7}
          className="min-h-24 text-base md:text-sm"
          placeholder="Tempel teks broadcast dari WhatsApp di sini (misal: 'DIJUAL RUMAH 1 LANTAI CIPETE SELATAN, LT 454 LB 350, SHM, 12.5M...')"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 13, lineHeight: 1.5 }}
        />

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>
            Format apapun diterima • Didukung Google Gemini AI & Heuristic Parser Lokal
          </div>
          <UiButton variant="default"
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || !rawText.trim()}
            className="h-10 px-4"
            style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}
          >
            {isExtracting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Mengekstrak dengan AI...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Ekstrak & Cek Duplikat
              </>
            )}
          </UiButton>
        </div>
      </UiCard>

      {/* Duplicate Warning Banner */}
      {duplicates.length > 0 && !dismissDuplicate && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            borderRadius: 12,
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <ShieldAlert size={24} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#d97706" }}>
                  ⚠️ Potensi Properti Duplikat Terdeteksi ({duplicates.length} aset serupa)
                </h3>
                <button
                  type="button"
                  onClick={() => setDismissDuplicate(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-admin-text-muted)",
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Tutup Peringatan
                </button>
              </div>
              <p style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
                Sistem menemukan properti dengan karakteristik fisik yang sangat mirip di database. Pastikan unit ini bukan entri ganda:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {duplicates.map((dup) => (
                  <div
                    key={dup.id}
                    style={{
                      background: "var(--color-admin-card-bg, #ffffff)",
                      border: "1px solid var(--color-admin-border)",
                      borderRadius: 8,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-admin-primary)" }}>
                          {dup.code}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#b45309",
                            fontWeight: 600,
                          }}
                        >
                          {dup.similarityScore}% Mirip
                        </span>
                        <span style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>
                          {dup.reason}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                        {dup.address} • LT {dup.landArea || "-"} m² • LB {dup.buildingArea || "-"} m²
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-admin-text-secondary)", marginTop: 2 }}>
                        Harga: {dup.latestPrice ? `Rp ${dup.latestPrice.toLocaleString("id-ID")}` : "Belum diatur"} • Status: {dup.status || "DRAFT"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <ButtonLink variant="secondary"
                        href={`/admin/properties/${dup.id}`}
                        target="_blank"
                        className="h-10 px-4"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        <ExternalLink size={14} /> Buka Detail Unit
                      </ButtonLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Form & Photos (Active after extraction or ready for edits) */}
      {hasExtracted && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
          {/* Kolom Kiri: Spesifikasi & Lokasi */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Kartu Dasar & Lokasi */}
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>🏠 Identitas & Lokasi</h2>
                {parserEngine && (
                  <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)", padding: "2px 8px", borderRadius: 4, background: "var(--color-admin-border)" }}>
                    Engine: {parserEngine}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Kode Properti</UiLabel>
                  <UiInput
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ fontWeight: 600, color: "var(--color-admin-primary)" }}
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Tipe Properti</UiLabel>
                  <select
                    className="admin-input"
                    value={type}
                    onChange={(e) => setType(e.target.value as "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE")}
                  >
                    <option value="HOUSE">Rumah</option>
                    <option value="APARTMENT">Apartemen</option>
                    <option value="LAND">Tanah</option>
                    <option value="SHOPHOUSE">Ruko / Shophouse</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Judul Listing Publik</UiLabel>
                <UiInput
                  type="text"
                  className="min-h-10 px-3 text-base md:text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Rumah Mewah 1 Lantai Full Marmer di Cipete Selatan"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, marginBottom: 14 }}>
                <AreaPicker
                  value={pickerAreaId}
                  required
                  idPrefix="smart-import-area"
                  onChange={({ areaId: leafId, kecamatanId }) => {
                    setPickerAreaId(leafId);
                    setAreaId(kecamatanId ? String(kecamatanId) : "");
                    setVillageId(leafId && kecamatanId && leafId !== kecamatanId ? String(leafId) : "");
                    setKawasanId("");
                  }}
                />
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Kawasan Populer</UiLabel>
                  <select
                    className="admin-input"
                    value={kawasanId}
                    onChange={(e) => setKawasanId(e.target.value)}
                  >
                    <option value="">-- Tanpa Kawasan Khusus --</option>
                    {availableKawasans.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Alamat / Patokan Lokasi</UiLabel>
                <UiInput
                  type="text"
                  className="min-h-10 px-3 text-base md:text-sm"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Cipete Selatan, Cilandak, Jakarta Selatan"
                />
              </div>
            </UiCard>

            {/* Kartu Spesifikasi Fisik */}
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📐 Spesifikasi Fisik</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Luas Tanah (m²)</UiLabel>
                  <UiInput
                    type="number"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={landArea}
                    onChange={(e) => setLandArea(e.target.value)}
                    placeholder="454"
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Luas Bangunan (m²)</UiLabel>
                  <UiInput
                    type="number"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={buildingArea}
                    onChange={(e) => setBuildingArea(e.target.value)}
                    placeholder="350"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Kamar Tidur</UiLabel>
                  <UiInput
                    type="number"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="3"
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Kamar Mandi</UiLabel>
                  <UiInput
                    type="number"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Jumlah Lantai</UiLabel>
                  <UiInput
                    type="number"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Garasi Mobil</UiLabel>
                  <UiInput
                    type="number"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={garages}
                    onChange={(e) => setGarages(e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Carport</UiLabel>
                  <UiInput
                    type="number"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={carports}
                    onChange={(e) => setCarports(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Sertifikat</UiLabel>
                  <select
                    className="admin-input"
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value)}
                  >
                    <option value="SHM">SHM (Hak Milik)</option>
                    <option value="SHGB">SHGB (Hak Guna Bangunan)</option>
                    <option value="SHSRS">Strata Title / SHSRS</option>
                    <option value="AJB">AJB</option>
                    <option value="GIRIK">Girik / Letter C</option>
                    <option value="PPJB">PPJB</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Fasilitas / Amenities Checkboxes */}
              <div>
                <UiLabel style={{ marginBottom: 8, display: "block" }}>
                  Fasilitas Terdeteksi
                </UiLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {amenities.map((am) => {
                    const isChecked = selectedAmenityIds.includes(am.id);
                    return (
                      <button
                        key={am.id}
                        type="button"
                        onClick={() => toggleAmenity(am.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          border: isChecked ? "1px solid var(--color-admin-primary)" : "1px solid var(--color-admin-border)",
                          background: isChecked ? "rgba(16, 185, 129, 0.12)" : "transparent",
                          color: isChecked ? "var(--color-admin-primary)" : "var(--color-admin-text-secondary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {isChecked && <CheckCircle2 size={12} />}
                        {am.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </UiCard>
          </div>

          {/* Kolom Kanan: Harga, Foto, Pihak Terkait & Simpan */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Kartu Harga & Listing */}
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>💰 Harga & Status Listing</h2>

              <div style={{ marginBottom: 14 }}>
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Harga Penawaran (Rp)</UiLabel>
                <UiInput
                  type="number"
                  className="min-h-10 px-3 text-base md:text-sm"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  placeholder="12500000000"
                  style={{ fontSize: 16, fontWeight: 700 }}
                />
                {askingPrice && parseInt(askingPrice, 10) > 0 && (
                  <div style={{ fontSize: 12, color: "var(--color-admin-primary)", marginTop: 4, fontWeight: 600 }}>
                    Terbaca: Rp {parseInt(askingPrice, 10).toLocaleString("id-ID")}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Status Listing Awal</UiLabel>
                <select
                  className="admin-input"
                  value={listingStatus}
                   onChange={(e) => setListingStatus(e.target.value as "DRAFT" | "PENDING_VERIFICATION")}
                >
                  <option value="DRAFT">DRAFT (Simpan dan lengkapi dahulu)</option>
                  <option value="PENDING_VERIFICATION">KIRIM UNTUK VERIFIKASI</option>
                </select>
              </div>

              <div>
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Deskripsi Publik</UiLabel>
                <UiTextarea
                  rows={4}
                  className="min-h-24 text-base md:text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ fontSize: 13, lineHeight: 1.5 }}
                />
              </div>
            </UiCard>

            {/* Kartu Video Tour (YouTube / Reels / TikTok) */}
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <Video size={18} style={{ color: "#ef4444" }} /> Video Tour Properti
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    fontWeight: 600,
                  }}
                >
                  YouTube / Reels / TikTok
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Link Video Tour (URL)</UiLabel>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    className="admin-input"
                    style={{ width: 130, flexShrink: 0 }}
                    value={videoPlatform}
                    onChange={(e) => setVideoPlatform(e.target.value)}
                  >
                    <option value="YOUTUBE">YouTube</option>
                    <option value="INSTAGRAM">IG Reels</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                  <UiInput
                    type="url"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="https://www.youtube.com/watch?v=... atau https://instagram.com/reel/..."
                    value={videoUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoUrl(val);
                      if (/youtube\.com|youtu\.be/i.test(val)) setVideoPlatform("YOUTUBE");
                      else if (/instagram\.com/i.test(val)) setVideoPlatform("INSTAGRAM");
                      else if (/tiktok\.com/i.test(val)) setVideoPlatform("TIKTOK");
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 6 }}>
                  💡 Masukkan link video walkthrough / drone view untuk menampilkan badge video eksklusif di portal.
                </p>
              </div>

              {videoUrl && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.03)",
                    border: "1px solid var(--color-admin-border)",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <PlayCircle size={16} style={{ color: "#ef4444" }} />
                  <span style={{ fontWeight: 600 }}>Tersambung:</span>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--color-admin-primary)", textDecoration: "underline", wordBreak: "break-all" }}
                  >
                    {videoUrl}
                  </a>
                </div>
              )}
            </UiCard>

            {/* Kartu Upload Foto & Video Walkthrough (WhatsApp Media) */}
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
                📸 Media Foto & Walkthrough (Drop dari WA Web / Laptop)
              </h2>

              <label
                style={{
                  border: "2px dashed var(--color-admin-border)",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  textAlign: "center",
                  background: "rgba(0,0,0,0.01)",
                }}
              >
                <UploadCloud size={32} style={{ color: "var(--color-admin-primary)", marginBottom: 8 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tarik & Lepas Foto / Video di sini</span>
                <span style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                  atau klik untuk pilih dari file explorer (Foto JPG/PNG/WebP atau Video MP4, Maks. 20 file)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/mp4"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
              </label>

              {/* Grid Preview Foto */}
              {photoPreviews.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  {photoPreviews.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setPreviewModal({
                          url,
                          title: `Media WA ${idx + 1}: ${photos[idx]?.name || `File ${idx + 1}`}`,
                          isPrimary: idx === 0,
                        })
                      }
                      role="button"
                      tabIndex={0}
                      title="Ketuk untuk melihat foto ukuran penuh"
                      style={{
                        position: "relative",
                        aspectRatio: "1/1",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: idx === 0 ? "2px solid var(--color-admin-primary)" : "1px solid var(--color-admin-border)",
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
                          bottom: 2,
                          right: 2,
                          background: "rgba(0, 0, 0, 0.65)",
                          backdropFilter: "blur(2px)",
                          borderRadius: 3,
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
                        <Maximize2 size={16} style={{ color: "#fff" }} />
                      </div>

                      {idx === 0 && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 2,
                            left: 2,
                            background: "var(--color-admin-primary)",
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 4px",
                            borderRadius: 3,
                            zIndex: 2,
                            pointerEvents: "none",
                          }}
                        >
                          UTAMA
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(idx);
                        }}
                        title="Hapus foto ini"
                        style={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          background: "rgba(0,0,0,0.7)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
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
              )}
            </UiCard>

            {/* Kartu Pihak Terkait (Opsional) */}
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>👤 Pihak Terkait (Opsional)</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Nama Owner</UiLabel>
                  <UiInput
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Nama pemilik sah"
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">No. WA Owner</UiLabel>
                  <UiInput
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="0812..."
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Nama Broker / Perantara</UiLabel>
                  <UiInput
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={intermediaryName}
                    onChange={(e) => setIntermediaryName(e.target.value)}
                    placeholder="Nama pengirim listing"
                  />
                </div>
                <div>
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">No. WA Broker</UiLabel>
                  <UiInput
                    type="text"
                    className="min-h-10 px-3 text-base md:text-sm"
                    value={intermediaryPhone}
                    onChange={(e) => setIntermediaryPhone(e.target.value)}
                    placeholder="0812..."
                  />
                </div>
              </div>
            </UiCard>

            {/* Tombol Simpan Final */}
            <UiButton variant="default"
              type="button"
              onClick={handleSaveProperty}
              disabled={isSaving}
              className="h-10 px-4"
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: 16,
                fontWeight: 700,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
              }}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Menyimpan Properti...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Simpan Properti & Foto Sekarang
                </>
              )}
            </UiButton>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal (Responsive Desktop & Mobile HP) */}
      {previewModal && (
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
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          onClick={() => setPreviewModal(null)}
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
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "60vw",
                }}
              >
                {previewModal.title}
              </span>
              {previewModal.isPrimary && (
                <span
                  style={{
                    background: "var(--color-admin-primary)",
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
              onClick={() => setPreviewModal(null)}
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

          {/* Center Image */}
          <div
            style={{
              flex: 1,
              width: "100%",
              maxWidth: 1080,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 0,
              padding: "8px 0",
            }}
            onClick={() => setPreviewModal(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewModal.url}
              alt={previewModal.title}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
              }}
            />
          </div>

          <div
            style={{
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.5)",
              textAlign: "center",
              paddingBottom: 8,
              flexShrink: 0,
            }}
          >
            Ketuk area luar atau tombol (X) untuk menutup
          </div>
        </div>
      )}
    </div>
  );
}
