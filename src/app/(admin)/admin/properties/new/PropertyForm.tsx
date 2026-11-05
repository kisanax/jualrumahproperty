"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Upload,
  X,
  Star,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Save,
  Building2,
  Tag,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/admin-ui";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { Card as UiCard } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Label as UiLabel } from "@/components/ui/label";

// =============================================================================
// Types
// =============================================================================

interface AmenityOption {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface KawasanOption {
  id: string;
  name: string;
  slug: string;
  areaId: number;
}

interface PropertyFormProps {
  amenitiesByCategory: Record<string, AmenityOption[]>;
  kawasan?: KawasanOption[];
}

interface FormData {
  // Step 1
  areaId: string;
  villageId: string;
  areaName: string;
  kawasanId: string;
  address: string;
  type: "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE" | "";
  landArea: string;
  buildingArea: string;
  bedrooms: string;
  bathrooms: string;
  floors: string;
  certificateType: string;
  yearBuilt: string;
  facing: string;
  electricity: string;
  waterSource: string;
  // Owner/Intermediary (optional)
  ownerName: string;
  ownerPhone: string;
  intermediaryName: string;
  intermediaryPhone: string;
  // Step 2: photos handled separately
  // Step 3
  title: string;
  askingPrice: string;
  minimumPrice: string;
  priceOnRequest: boolean;
  description: string;
  showFullAddress: boolean;
  selectedAmenities: string[];
  internalNotes: string;
  commissionNotes: string;
}

interface PhotoFile {
  file: File;
  preview: string;
  isPrimary: boolean;
  altText: string;
}

// =============================================================================
// Constants
// =============================================================================

const STEPS = [
  { label: "Data properti dasar", icon: Building2 },
  { label: "Foto & media", icon: Camera },
  { label: "Detail listing & harga", icon: Tag },
  { label: "Review & simpan", icon: FileText },
];

const PROPERTY_TYPES = [
  { value: "HOUSE", label: "Rumah", emoji: "🏠" },
  { value: "APARTMENT", label: "Apartemen", emoji: "🏢" },
  { value: "LAND", label: "Tanah", emoji: "📐" },
  { value: "SHOPHOUSE", label: "Ruko", emoji: "🏪" },
] as const;

const CERTIFICATE_TYPES = [
  { value: "SHM", label: "SHM" },
  { value: "SHGB", label: "SHGB" },
  { value: "SHSRS", label: "SHSRS" },
  { value: "AJB", label: "AJB" },
  { value: "GIRIK", label: "Girik" },
  { value: "PPJB", label: "PPJB" },
  { value: "OTHER", label: "Lainnya" },
];

const INITIAL_FORM: FormData = {
  areaId: "",
  villageId: "",
  areaName: "",
  kawasanId: "",
  address: "",
  type: "",
  landArea: "",
  buildingArea: "",
  bedrooms: "",
  bathrooms: "",
  floors: "1",
  certificateType: "",
  yearBuilt: "",
  facing: "",
  electricity: "",
  waterSource: "",
  ownerName: "",
  ownerPhone: "",
  intermediaryName: "",
  intermediaryPhone: "",
  title: "",
  askingPrice: "",
  minimumPrice: "",
  priceOnRequest: false,
  description: "",
  showFullAddress: false,
  selectedAmenities: [],
  internalNotes: "",
  commissionNotes: "",
};

// =============================================================================
// Main Component
// =============================================================================

export default function PropertyForm({ amenitiesByCategory, kawasan = [] }: PropertyFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [pickerAreaId, setPickerAreaId] = useState<number | null>(null);

  // Collapse states
  const [ownerExpanded, setOwnerExpanded] = useState(false);
  const [extraFieldsExpanded, setExtraFieldsExpanded] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [commissionExpanded, setCommissionExpanded] = useState(false);
  const [watermarkExpanded, setWatermarkExpanded] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =========================================================================
  // Form handlers
  // =========================================================================

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // =========================================================================
  // Duplicate check (debounced)
  // =========================================================================

  const addressDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const checkDuplicate = useCallback(
    (address: string) => {
      if (addressDebounce.current) clearTimeout(addressDebounce.current);
      if (address.length < 5) {
        setDuplicateWarning(null);
        return;
      }
      addressDebounce.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/properties/duplicate-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address, areaId: formData.areaId }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.duplicate) {
              setDuplicateWarning(
                `Mirip dengan properti ${data.duplicate.code} (${data.duplicate.area}). `
              );
            } else {
              setDuplicateWarning(null);
            }
          }
        } catch {
          // Ignore errors — duplicate check is advisory
        }
      }, 500);
    },
    [formData.areaId]
  );

  // =========================================================================
  // Photo handling
  // =========================================================================

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const maxPhotos = 20;
      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) {
        toast.error("Maksimal 20 foto per properti");
        return;
      }

      const newPhotos: PhotoFile[] = [];
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: format tidak didukung`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: maksimal 10MB per foto`);
          continue;
        }
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
          isPrimary: photos.length === 0 && newPhotos.length === 0,
          altText: "",
        });
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length]
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const newPhotos = prev.filter((_, i) => i !== index);
      // If removed was primary, make first remaining primary
      if (prev[index].isPrimary && newPhotos.length > 0) {
        newPhotos[0].isPrimary = true;
      }
      // Revoke URL
      URL.revokeObjectURL(prev[index].preview);
      return newPhotos;
    });
  }, []);

  const setPrimaryPhoto = useCallback((index: number) => {
    setPhotos((prev) =>
      prev.map((p, i) => ({
        ...p,
        isPrimary: i === index,
      }))
    );
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================================
  // Price formatting
  // =========================================================================

  const formatPriceDisplay = (value: string): string => {
    const num = value.replace(/\D/g, "");
    if (!num) return "";
    return parseInt(num).toLocaleString("id-ID");
  };

  const handlePriceChange = (key: "askingPrice" | "minimumPrice", value: string) => {
    const rawNum = value.replace(/\D/g, "");
    updateField(key, rawNum);
  };

  // =========================================================================
  // Navigation
  // =========================================================================

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!(formData.areaId && formData.address && formData.type && formData.landArea);
      case 1:
        return true; // Photos optional
      case 2:
        return !!(formData.askingPrice || formData.priceOnRequest);
      case 3:
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1 && canGoNext()) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // =========================================================================
  // Submit
  // =========================================================================

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Create property
      const propertyRes = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: formData.areaId,
          villageId: formData.villageId || null,
          kawasanId: formData.kawasanId || null,
          address: formData.address,
          type: formData.type,
          landArea: formData.landArea ? parseInt(formData.landArea) : null,
          buildingArea: formData.buildingArea ? parseInt(formData.buildingArea) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          floors: formData.floors ? parseInt(formData.floors) : null,
          certificateType: formData.certificateType || null,
          yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
          facing: formData.facing || null,
          electricity: formData.electricity ? parseInt(formData.electricity) : null,
          waterSource: formData.waterSource || null,
          amenityIds: formData.selectedAmenities,
          internalNotes: formData.internalNotes || null,
          // Owner & intermediary
          ownerName: formData.ownerName || null,
          ownerPhone: formData.ownerPhone || null,
          intermediaryName: formData.intermediaryName || null,
          intermediaryPhone: formData.intermediaryPhone || null,
          // Listing data
          title: formData.title || null,
          askingPrice: formData.askingPrice ? parseInt(formData.askingPrice) : null,
          minimumPrice: formData.minimumPrice ? parseInt(formData.minimumPrice) : null,
          priceOnRequest: formData.priceOnRequest,
          description: formData.description || null,
          showFullAddress: formData.showFullAddress,
          commissionNotes: formData.commissionNotes || null,
        }),
      });

      if (!propertyRes.ok) {
        const err = await propertyRes.json();
        throw new Error(err.error || "Gagal menyimpan properti");
      }

      const { property } = await propertyRes.json();

      // 2. Upload photos if any
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const fd = new FormData();
          fd.append("file", photo.file);
          fd.append("propertyId", property.id);
          fd.append("isPrimary", photo.isPrimary.toString());
          fd.append("sortOrder", i.toString());
          fd.append("altText", photo.altText || "");

          await fetch("/api/properties/" + property.id + "/media", {
            method: "POST",
            body: fd,
          });
        }
      }

      toast.success("Properti berhasil disimpan sebagai draft!");
      router.push(`/admin/properties/${property.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Auto-generate title
  // =========================================================================

  const autoTitle = useMemo(() => {
    if (formData.title) return formData.title;
    const type = PROPERTY_TYPES.find((t) => t.value === formData.type);
    if (!type || !formData.areaName) return "";
    const specs = [];
    if (formData.landArea && formData.buildingArea) {
      specs.push(`${formData.landArea}/${formData.buildingArea} m²`);
    }
    if (formData.bedrooms) specs.push(`${formData.bedrooms} KT`);
    return `${type.label} ${specs.length ? specs.join(" ") + " " : ""}di ${formData.areaName.split(",")[0]}`;
  }, [formData.type, formData.areaName, formData.landArea, formData.buildingArea, formData.bedrooms, formData.title]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <>

      {/* Progress Stepper */}
      <div style={{ marginBottom: 24 }}>
        <div className="admin-stepper">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`admin-stepper-bar ${i <= currentStep ? "completed" : ""}`}
            />
          ))}
        </div>
        <div className="admin-stepper-label">
          Langkah {currentStep + 1} dari {STEPS.length}
        </div>
        <div className="admin-stepper-title">{STEPS[currentStep].label}</div>
      </div>

      {/* Smart Paste WA Callout Banner */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={18} style={{ color: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--color-admin-text-primary)" }}>
            Punya teks listing dari WhatsApp? Ekstrak data & foto otomatis tanpa perlu mengetik manual.
          </span>
        </div>
        <UiButton variant="outline"
          type="button"
          onClick={() => router.push("/admin/properties/smart-import")}
          className="h-10 px-4"
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderColor: "rgba(16, 185, 129, 0.5)",
            color: "#10b981",
            fontWeight: 600,
          }}
        >
          <Sparkles size={14} /> Buka Smart Paste WA
        </UiButton>
      </div>

      {/* ================================================================= */}
      {/* STEP 1: Data Properti Dasar */}
      {/* ================================================================= */}
      {currentStep === 0 && (
        <div className="animate-slide-up">
          {/* Administrative area */}
          <div className="admin-input-group">
            <AreaPicker
              value={pickerAreaId}
              required
              idPrefix="new-property-area"
              onChange={({ areaId, kecamatanId, area }) => {
                setPickerAreaId(areaId);
                updateField("areaId", kecamatanId ? String(kecamatanId) : "");
                updateField("villageId", area?.level === 4 && areaId ? String(areaId) : "");
                updateField("areaName", area?.name || "");
                if (formData.kawasanId && kawasan.find((item) => item.id === formData.kawasanId)?.areaId !== kecamatanId) {
                  updateField("kawasanId", "");
                }
              }}
            />
            <div className="admin-input-hint">Kecamatan dipakai untuk kode properti; kelurahan/desa disimpan sebagai lokasi rinci.</div>
          </div>

          {/* Kawasan Populer (Opsional) */}
          <div className="admin-input-group">
            <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Kawasan Populer / Branded (Opsional)</UiLabel>
            <select
              className="admin-input"
              value={formData.kawasanId}
              onChange={(e) => {
                const selectedKawasanId = e.target.value;
                updateField("kawasanId", selectedKawasanId);
                if (selectedKawasanId) {
                  const found = kawasan.find((k) => k.id === selectedKawasanId);
                  if (found && !formData.areaId) {
                    setPickerAreaId(found.areaId);
                    updateField("areaId", String(found.areaId));
                    updateField("villageId", "");
                  }
                }
              }}
            >
              <option value="">Pilih kawasan populer jika ada (e.g. Kemang, Senopati, Pondok Indah)...</option>
              {kawasan.filter((k) => !formData.areaId || String(k.areaId) === formData.areaId).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
            <div className="admin-input-hint">
              Dipakai untuk label marketing publik, banner &quot;Kawasan Pilihan&quot; di homepage, dan SEO lokal.
            </div>
          </div>

          {/* Address */}
          <div className="admin-input-group">
            <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Alamat (internal saja) *</UiLabel>
            <UiInput
              type="text"
              className="min-h-10 px-3 text-base md:text-sm"
              placeholder="Jl. Kemang Utara IX No.12"
              value={formData.address}
              onChange={(e) => {
                updateField("address", e.target.value);
                checkDuplicate(e.target.value);
              }}
            />
            {duplicateWarning && (
              <div className="admin-inline-warning">
                <AlertTriangle size={18} className="admin-inline-warning-icon" />
                <div className="admin-inline-warning-text">
                  {duplicateWarning}
                  <a href="#">Cek detail</a>
                </div>
              </div>
            )}
          </div>

          {/* Property Type */}
          <div className="admin-input-group">
            <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Tipe properti *</UiLabel>
            <div className="admin-pill-group admin-property-type-grid">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  className={`admin-pill ${formData.type === pt.value ? "active" : ""}`}
                  onClick={() => updateField("type", pt.value)}
                >
                  {pt.emoji} {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Land & Building Area */}
          <div className="admin-grid-2">
            <div className="admin-input-group">
              <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Luas tanah (m²) *</UiLabel>
              <UiInput
                type="number"
                className="min-h-10 px-3 text-base md:text-sm"
                placeholder="320"
                value={formData.landArea}
                onChange={(e) => updateField("landArea", e.target.value)}
              />
            </div>
            {formData.type !== "LAND" && (
              <div className="admin-input-group">
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Luas bangunan (m²)</UiLabel>
                <UiInput
                  type="number"
                  className="min-h-10 px-3 text-base md:text-sm"
                  placeholder="280"
                  value={formData.buildingArea}
                  onChange={(e) => updateField("buildingArea", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Bedrooms & Bathrooms */}
          {formData.type !== "LAND" && (
            <div className="admin-grid-2">
              <div className="admin-input-group">
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Kamar tidur</UiLabel>
                <UiInput
                  type="number"
                  className="min-h-10 px-3 text-base md:text-sm"
                  placeholder="4"
                  value={formData.bedrooms}
                  onChange={(e) => updateField("bedrooms", e.target.value)}
                />
              </div>
              <div className="admin-input-group">
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Kamar mandi</UiLabel>
                <UiInput
                  type="number"
                  className="min-h-10 px-3 text-base md:text-sm"
                  placeholder="3"
                  value={formData.bathrooms}
                  onChange={(e) => updateField("bathrooms", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Extra Fields — Collapsed */}
          <div className="admin-collapse">
            <button
              type="button"
              className="admin-collapse-trigger"
              aria-expanded={extraFieldsExpanded}
              onClick={() => setExtraFieldsExpanded(!extraFieldsExpanded)}
            >
              <span>Detail tambahan (opsional)</span>
              <ChevronDown size={18} className="collapse-arrow" />
            </button>
            {extraFieldsExpanded && (
              <div className="admin-collapse-content">
                <div className="admin-grid-2">
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Lantai</UiLabel>
                    <UiInput
                      type="number"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="2"
                      value={formData.floors}
                      onChange={(e) => updateField("floors", e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Sertifikat</UiLabel>
                    <select
                      className="admin-input"
                      value={formData.certificateType}
                      onChange={(e) => updateField("certificateType", e.target.value)}
                    >
                      <option value="">Pilih...</option>
                      {CERTIFICATE_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="admin-grid-2">
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Tahun dibangun</UiLabel>
                    <UiInput
                      type="number"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="2018"
                      value={formData.yearBuilt}
                      onChange={(e) => updateField("yearBuilt", e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Hadap</UiLabel>
                    <UiInput
                      type="text"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="Selatan"
                      value={formData.facing}
                      onChange={(e) => updateField("facing", e.target.value)}
                    />
                  </div>
                </div>
                <div className="admin-grid-2">
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Listrik (Watt)</UiLabel>
                    <UiInput
                      type="number"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="3500"
                      value={formData.electricity}
                      onChange={(e) => updateField("electricity", e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Sumber air</UiLabel>
                    <UiInput
                      type="text"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="PAM"
                      value={formData.waterSource}
                      onChange={(e) => updateField("waterSource", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Owner & Intermediary — Collapsed */}
          <div className="admin-collapse">
            <button
              type="button"
              className="admin-collapse-trigger"
              aria-expanded={ownerExpanded}
              onClick={() => setOwnerExpanded(!ownerExpanded)}
            >
              <span>Owner & perantara (opsional, bisa nanti)</span>
              <ChevronDown size={18} className="collapse-arrow" />
            </button>
            {ownerExpanded && (
              <div className="admin-collapse-content">
                <div className="admin-input-group">
                  <UiLabel style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>
                    Owner
                  </UiLabel>
                </div>
                <div className="admin-grid-2">
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Nama owner</UiLabel>
                    <UiInput
                      type="text"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="Nama pemilik"
                      value={formData.ownerName}
                      onChange={(e) => updateField("ownerName", e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">No. HP owner</UiLabel>
                    <UiInput
                      type="tel"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="08xxx"
                      value={formData.ownerPhone}
                      onChange={(e) => updateField("ownerPhone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="admin-input-group" style={{ marginTop: 8 }}>
                  <UiLabel style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>
                    Perantara
                  </UiLabel>
                </div>
                <div className="admin-grid-2">
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Nama perantara</UiLabel>
                    <UiInput
                      type="text"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="Nama broker/referral"
                      value={formData.intermediaryName}
                      onChange={(e) => updateField("intermediaryName", e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">No. HP perantara</UiLabel>
                    <UiInput
                      type="tel"
                      className="min-h-10 px-3 text-base md:text-sm"
                      placeholder="08xxx"
                      value={formData.intermediaryPhone}
                      onChange={(e) =>
                        updateField("intermediaryPhone", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Next Button */}
          <UiButton size="lg" variant="default"
            type="button"
            className="w-full admin-form-primary-action h-10 px-4"
            disabled={!canGoNext()}
            onClick={goNext}
            style={{ marginTop: 8, opacity: canGoNext() ? 1 : 0.4 }}
          >
            Lanjut ke foto <ArrowRight size={18} />
          </UiButton>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 2: Foto & Media */}
      {/* ================================================================= */}
      {currentStep === 1 && (
        <div className="animate-slide-up">
          {/* Dropzone */}
          <div
            className="admin-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("dragover");
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove("dragover")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("dragover");
              handleFileSelect(e.dataTransfer.files);
            }}
          >
            <Upload size={36} className="admin-dropzone-icon" />
            <div className="admin-dropzone-text">
              Drag foto ke sini atau ketuk untuk upload
            </div>
            <div className="admin-dropzone-hint">
              JPG, PNG, WebP • Max {20 - photos.length} foto lagi
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* Photo Grid */}
          {photos.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-admin-text-secondary)",
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                {photos.length}/20 foto • Ketuk ★ untuk set foto utama
              </div>
              <div className="admin-photo-grid">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className={`admin-photo-item ${photo.isPrimary ? "primary" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.preview} alt={photo.altText || `Foto ${index + 1}`} />

                    {photo.isPrimary && <Star size={18} className="admin-photo-star" fill="currentColor" />}

                    <div className="admin-photo-item-overlay">
                      {!photo.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryPhoto(index)}
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            background: "none",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            padding: 2,
                          }}
                          title="Set sebagai foto utama"
                        >
                          <Star size={18} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-photo-delete"
                        onClick={() => removePhoto(index)}
                        title="Hapus foto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Watermark setting — Collapsed */}
          <div className="admin-collapse" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="admin-collapse-trigger"
              aria-expanded={watermarkExpanded}
              onClick={() => setWatermarkExpanded(!watermarkExpanded)}
            >
              <span>Pengaturan foto (opsional)</span>
              <ChevronDown size={18} className="collapse-arrow" />
            </button>
            {watermarkExpanded && (
              <div className="admin-collapse-content">
                <div className="admin-input-hint">
                  Pengaturan watermark dan alt text per foto akan tersedia di halaman detail properti.
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="admin-form-actions" style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <UiButton size="lg" variant="ghost"
              type="button"
              className="h-10 px-4"
              onClick={goBack}
            >
              <ArrowLeft size={18} /> Kembali
            </UiButton>
            <UiButton size="lg" variant="default"
              type="button"
              className="h-10 px-4"
              onClick={goNext}
              style={{ flex: 1 }}
            >
              Lanjut ke detail <ArrowRight size={18} />
            </UiButton>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 3: Detail Listing & Harga */}
      {/* ================================================================= */}
      {currentStep === 2 && (
        <div className="animate-slide-up">
          {/* Title */}
          <div className="admin-input-group">
            <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Judul listing</UiLabel>
            <UiInput
              type="text"
              className="min-h-10 px-3 text-base md:text-sm"
              placeholder={autoTitle || "Judul listing..."}
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
            {!formData.title && autoTitle && (
              <div className="admin-input-hint">
                Auto-generate: &quot;{autoTitle}&quot;
              </div>
            )}
          </div>

          {/* Price */}
          <div className="admin-input-group">
            <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Harga (Rp) *</UiLabel>
            <UiInput
              type="text"
              inputMode="numeric"
              className="min-h-10 px-3 text-base md:text-sm"
              placeholder="8.500.000.000"
              value={formatPriceDisplay(formData.askingPrice)}
              onChange={(e) => handlePriceChange("askingPrice", e.target.value)}
              disabled={formData.priceOnRequest}
              style={{ opacity: formData.priceOnRequest ? 0.4 : 1 }}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                fontSize: 14,
                color: "var(--color-admin-text-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={formData.priceOnRequest}
                onChange={(e) => updateField("priceOnRequest", e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Harga on request (sembunyikan dari publik)
            </label>
          </div>

          {/* Description */}
          <div className="admin-input-group">
            <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Deskripsi publik</UiLabel>
            <UiTextarea
              className="min-h-24 text-base md:text-sm"
              placeholder="Deskripsi yang akan tampil di halaman publik..."
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
            />
          </div>

          {/* Amenities */}
          <div className="admin-input-group">
            <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Fasilitas</UiLabel>
            {Object.entries(amenitiesByCategory).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-admin-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  {category}
                </div>
                <div className="admin-pill-group">
                  {items.map((amenity) => (
                    <button
                      key={amenity.id}
                      type="button"
                      className={`admin-pill admin-pill-sm ${
                        formData.selectedAmenities.includes(amenity.id) ? "active" : ""
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          selectedAmenities: prev.selectedAmenities.includes(amenity.id)
                            ? prev.selectedAmenities.filter((id) => id !== amenity.id)
                            : [...prev.selectedAmenities, amenity.id],
                        }));
                      }}
                    >
                      {amenity.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Privacy settings — Collapsed */}
          <div className="admin-collapse">
            <button
              type="button"
              className="admin-collapse-trigger"
              aria-expanded={privacyExpanded}
              onClick={() => setPrivacyExpanded(!privacyExpanded)}
            >
              <span>Pengaturan privasi & tampilan</span>
              <ChevronDown size={18} className="collapse-arrow" />
            </button>
            {privacyExpanded && (
              <div className="admin-collapse-content">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    color: "var(--color-admin-text-secondary)",
                    cursor: "pointer",
                    marginBottom: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.showFullAddress}
                    onChange={(e) => updateField("showFullAddress", e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  Tampilkan alamat lengkap di publik
                </label>
                <div className="admin-input-group">
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan internal (tidak terlihat publik)</UiLabel>
                  <UiTextarea
                    className="min-h-24 text-base md:text-sm"
                    placeholder="Catatan untuk tim internal..."
                    value={formData.internalNotes}
                    onChange={(e) => updateField("internalNotes", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Commission — Collapsed */}
          <div className="admin-collapse">
            <button
              type="button"
              className="admin-collapse-trigger"
              aria-expanded={commissionExpanded}
              onClick={() => setCommissionExpanded(!commissionExpanded)}
            >
              <span>Harga minimum & komisi (internal)</span>
              <ChevronDown size={18} className="collapse-arrow" />
            </button>
            {commissionExpanded && (
              <div className="admin-collapse-content">
                <div className="admin-input-group">
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Harga minimum owner (Rp)</UiLabel>
                  <UiInput
                    type="text"
                    inputMode="numeric"
                    className="min-h-10 px-3 text-base md:text-sm"
                    placeholder="7.800.000.000"
                    value={formatPriceDisplay(formData.minimumPrice)}
                    onChange={(e) => handlePriceChange("minimumPrice", e.target.value)}
                  />
                </div>
                <div className="admin-input-group">
                  <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan komisi</UiLabel>
                  <UiTextarea
                    className="min-h-24 text-base md:text-sm"
                    placeholder="Catatan soal komisi perantara..."
                    value={formData.commissionNotes}
                    onChange={(e) => updateField("commissionNotes", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="admin-form-actions" style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <UiButton size="lg" variant="ghost"
              type="button"
              className="h-10 px-4"
              onClick={goBack}
            >
              <ArrowLeft size={18} /> Kembali
            </UiButton>
            <UiButton size="lg" variant="default"
              type="button"
              className="h-10 px-4"
              onClick={goNext}
              style={{ flex: 1, opacity: canGoNext() ? 1 : 0.4 }}
              disabled={!canGoNext()}
            >
              Lanjut ke review <ArrowRight size={18} />
            </UiButton>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 4: Review & Simpan */}
      {/* ================================================================= */}
      {currentStep === 3 && (
        <div className="animate-slide-up">
          {/* Summary Card */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 28 }}>
                {PROPERTY_TYPES.find((t) => t.value === formData.type)?.emoji}
              </span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {autoTitle || "Properti baru"}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-admin-text-secondary)" }}>
                  {getPropertyTypeLabel(formData.type)} • {formData.areaName}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "8px 16px",
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--color-admin-text-muted)" }}>📍 Alamat</span>
              <span>{formData.address}</span>

              {formData.kawasanId && (
                <>
                  <span style={{ color: "var(--color-admin-text-muted)" }}>🏙️ Kawasan</span>
                  <span>{kawasan.find((k) => k.id === formData.kawasanId)?.name}</span>
                </>
              )}

              <span style={{ color: "var(--color-admin-text-muted)" }}>📐 Luas</span>
              <span>
                {formData.landArea}
                {formData.buildingArea ? `/${formData.buildingArea}` : ""} m²
              </span>

              {formData.bedrooms && (
                <>
                  <span style={{ color: "var(--color-admin-text-muted)" }}>🛏️ Kamar</span>
                  <span>
                    {formData.bedrooms} KT • {formData.bathrooms || 0} KM
                  </span>
                </>
              )}

              <span style={{ color: "var(--color-admin-text-muted)" }}>💰 Harga</span>
              <span style={{ color: "var(--color-admin-accent)", fontWeight: 600 }}>
                {formData.priceOnRequest
                  ? "Harga on request"
                  : formData.askingPrice
                    ? `Rp ${formatPriceDisplay(formData.askingPrice)}`
                    : "Belum diisi"}
              </span>

              <span style={{ color: "var(--color-admin-text-muted)" }}>📷 Foto</span>
              <span>{photos.length} foto</span>

              {formData.selectedAmenities.length > 0 && (
                <>
                  <span style={{ color: "var(--color-admin-text-muted)" }}>🏷️ Fasilitas</span>
                  <span>{formData.selectedAmenities.length} dipilih</span>
                </>
              )}

              <span style={{ color: "var(--color-admin-text-muted)" }}>👤 Owner</span>
              <span>{formData.ownerName || "(belum diisi)"}</span>
            </div>
          </UiCard>

          {/* Warnings */}
          {!formData.ownerName && (
            <div className="admin-inline-warning" style={{ marginBottom: 16 }}>
              <AlertTriangle size={18} className="admin-inline-warning-icon" />
              <div className="admin-inline-warning-text">
                Owner belum diisi — wajib diisi sebelum listing bisa dipublish.
              </div>
            </div>
          )}

          {/* Status */}
          <div
            style={{
              fontSize: 14,
              color: "var(--color-admin-text-secondary)",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Status awal:{" "}
            <UiBadge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-transparent bg-muted text-muted-foreground">Draft</UiBadge>
          </div>

          {/* Action Buttons */}
          <div className="admin-form-actions" style={{ display: "flex", gap: 12 }}>
            <UiButton size="lg" variant="ghost"
              type="button"
              className="h-10 px-4"
              onClick={goBack}
            >
              <ArrowLeft size={18} /> Kembali
            </UiButton>
            <UiButton size="lg" variant="default"
              type="button"
              className="h-10 px-4"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              {isSubmitting ? (
                "Menyimpan..."
              ) : (
                <>
                  <Save size={18} /> Simpan sebagai draft
                </>
              )}
            </UiButton>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// Helper inside component scope
// =============================================================================

function getPropertyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    HOUSE: "Rumah",
    APARTMENT: "Apartemen",
    LAND: "Tanah",
    SHOPHOUSE: "Ruko",
  };
  return map[type] || type;
}
