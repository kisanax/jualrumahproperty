"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Smartphone,
  Monitor,
  X,
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Building,
  FileText,
  Share2,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  MessageCircle,
} from "lucide-react";
import { getMediaUrl } from "@/lib/media-url";

interface PropertyPublicPreviewModalProps {
  property: {
    id: string;
    code: string;
    type: string;
    address: string;
    landArea?: number | null;
    buildingArea?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    floors?: number | null;
    garages?: number | null;
    carports?: number | null;
    certificateType?: string | null;
    electricity?: number | null;
    waterSource?: string | null;
    facing?: string | null;
  };
  areaName?: string;
  listing?: {
    title?: string | null;
    description?: string | null;
    askingPrice?: number | string | null;
    videoUrl?: string | null;
    videoPlatform?: string | null;
    status?: string;
  } | null;
  media: Array<{
    id: string;
    filePath: string;
    isPrimary: boolean;
    altText?: string | null;
  }>;
  amenities: Array<{
    amenity: {
      name: string;
      icon?: string | null;
    };
  }>;
  buttonText?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
}

export default function PropertyPublicPreviewModal({
  property,
  areaName,
  listing,
  media,
  amenities,
  buttonText = "Preview Listing (HP)",
  buttonClassName = "admin-btn admin-btn-secondary",
  buttonStyle,
}: PropertyPublicPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"MOBILE" | "DESKTOP">("MOBILE");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRealMobile, setIsRealMobile] = useState(false);

  // Touch swipe support for photo slider
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    const checkScreen = () => {
      setIsRealMobile(window.innerWidth <= 640);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Body scroll lock & Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
    if (distance > 40) {
      nextSlide();
    } else if (distance < -40) {
      prevSlide();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const formatPrice = (price?: unknown) => {
    if (!price) return "Harga Menghubungi Agen";
    const num = Number(price);
    if (isNaN(num) || num <= 0) return "Harga Menghubungi Agen";
    if (num >= 1_000_000_000) {
      const b = (num / 1_000_000_000).toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      });
      return `Rp ${b} Miliar`;
    }
    if (num >= 1_000_000) {
      const m = (num / 1_000_000).toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      });
      return `Rp ${m} Juta`;
    }
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const nextSlide = () => {
    if (media.length > 0) setCurrentSlide((prev) => (prev + 1) % media.length);
  };

  const prevSlide = () => {
    if (media.length > 0) setCurrentSlide((prev) => (prev - 1 + media.length) % media.length);
  };

  const sortedMedia = [...media].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={buttonClassName}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 600,
          background: "rgba(16, 185, 129, 0.08)",
          borderColor: "rgba(16, 185, 129, 0.4)",
          color: "#10b981",
          cursor: "pointer",
          touchAction: "manipulation",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          ...buttonStyle,
        }}
        title="Pratinjau tampilan listing untuk calon pembeli di HP / Web"
      >
        <Eye size={15} style={{ pointerEvents: "none" }} />
        <span style={{ pointerEvents: "none" }}>{buttonText}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: isRealMobile
              ? 0
              : "max(10px, env(safe-area-inset-top)) 12px max(10px, env(safe-area-inset-bottom)) 12px",
            height: "100vh",
            maxHeight: "100dvh",
            boxSizing: "border-box",
          }}
          onClick={() => setIsOpen(false)}
        >
          {/* Header Controller Modal (Shown on Desktop) */}
          {!isRealMobile && (
            <div
              style={{
                width: "100%",
                maxWidth: previewDevice === "MOBILE" ? 420 : 860,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                color: "#fff",
                flexShrink: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Device Switcher */}
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(255,255,255,0.12)",
                  padding: "3px 4px",
                  borderRadius: 20,
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDevice("MOBILE")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 16,
                    border: "none",
                    cursor: "pointer",
                    background: previewDevice === "MOBILE" ? "#10b981" : "transparent",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  <Smartphone size={13} /> HP (Mobile)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("DESKTOP")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 16,
                    border: "none",
                    cursor: "pointer",
                    background: previewDevice === "DESKTOP" ? "#10b981" : "transparent",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  <Monitor size={13} /> Desktop
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Pratinjau Publik Buyer</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                  title="Tutup (Esc)"
                  aria-label="Tutup"
                >
                  <X size={18} style={{ pointerEvents: "none" }} />
                </button>
              </div>
            </div>
          )}

          {/* Top Bar on Real Mobile Phone */}
          {isRealMobile && (
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "max(10px, env(safe-area-inset-top)) 14px 10px 14px",
                background: "#0f172a",
                color: "#fff",
                flexShrink: 0,
                zIndex: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>
                  Pratinjau Pembeli ({property.code})
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
                title="Tutup"
                aria-label="Tutup"
              >
                <X size={18} style={{ pointerEvents: "none" }} />
              </button>
            </div>
          )}

          {/* Device Mockup Shell */}
          <div
            style={{
              width: "100%",
              maxWidth: isRealMobile ? "100%" : previewDevice === "MOBILE" ? 390 : 860,
              height: isRealMobile ? "100%" : "calc(100vh - 75px)",
              maxHeight: isRealMobile ? "100%" : 800,
              flex: isRealMobile ? 1 : "0 1 auto",
              minHeight: 0,
              background: "#fff",
              color: "#111827",
              borderRadius: isRealMobile ? 0 : previewDevice === "MOBILE" ? 28 : 16,
              boxShadow: isRealMobile ? "none" : "0 25px 60px rgba(0,0,0,0.5)",
              overflowY: "auto",
              position: "relative",
              border: isRealMobile ? "none" : previewDevice === "MOBILE" ? "8px solid #1f2937" : "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Phone Notch (Desktop previewing mobile only) */}
            {!isRealMobile && previewDevice === "MOBILE" && (
              <div
                style={{
                  height: 24,
                  background: "#1f2937",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 12,
                    background: "#000",
                    borderRadius: "0 0 10px 10px",
                  }}
                />
              </div>
            )}

            {/* Public Header Bar Mockup */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fff",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  J
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                  JAKSEL<span style={{ color: "#10b981" }}>PROPERTI</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#10b981",
                    background: "rgba(16, 185, 129, 0.1)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {property.code}
                </span>
                {isRealMobile && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: "50%",
                      width: 26,
                      height: 26,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4b5563",
                      cursor: "pointer",
                      marginLeft: 4,
                    }}
                    title="Tutup"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Photo Slider with Touch Swipe */}
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                position: "relative",
                aspectRatio: "16/10",
                background: "#000",
                overflow: "hidden",
                flexShrink: 0,
                touchAction: "pan-y",
                userSelect: "none",
              }}
            >
              {sortedMedia.length > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMediaUrl(sortedMedia[currentSlide].filePath)}
                    alt={sortedMedia[currentSlide].altText || `Foto ${currentSlide + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />

                  {/* Photo Counter */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 12,
                      background: "rgba(0,0,0,0.7)",
                      backdropFilter: "blur(2px)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 12,
                    }}
                  >
                    {currentSlide + 1} / {sortedMedia.length} Foto
                  </div>

                  {/* Nav Arrows */}
                  {sortedMedia.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevSlide}
                        style={{
                          position: "absolute",
                          left: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "rgba(0,0,0,0.55)",
                          border: "none",
                          borderRadius: "50%",
                          width: 32,
                          height: 32,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={nextSlide}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "rgba(0,0,0,0.55)",
                          border: "none",
                          borderRadius: "50%",
                          width: 32,
                          height: 32,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  Belum ada foto properti
                </div>
              )}

              {/* Tag Status */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 12,
                  background: "#10b981",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 4,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                PROPERTI PILIHAN
              </div>
            </div>

            {/* Content Body */}
            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                paddingBottom: "max(24px, env(safe-area-inset-bottom))",
              }}
            >
              {/* Price & Title */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>
                  {formatPrice(listing?.askingPrice)}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginLeft: 6 }}>
                    (Nego)
                  </span>
                </div>
                <h1 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 4, lineHeight: 1.3 }}>
                  {listing?.title || `${property.type} Mewah Siap Huni di ${areaName || "Jakarta Selatan"}`}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  <MapPin size={13} style={{ color: "#10b981", flexShrink: 0 }} />
                  <span>{areaName ? `${areaName}, Jakarta Selatan` : "Jakarta Selatan"}</span>
                </div>
              </div>

              {/* Key Specs Pills */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  background: "#f9fafb",
                  padding: "12px 10px",
                  borderRadius: 12,
                  textAlign: "center",
                  border: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "center", color: "#10b981", marginBottom: 2 }}>
                    <BedDouble size={16} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {property.bedrooms || "-"}
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>K. Tidur</div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "center", color: "#10b981", marginBottom: 2 }}>
                    <Bath size={16} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {property.bathrooms || "-"}
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>K. Mandi</div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "center", color: "#10b981", marginBottom: 2 }}>
                    <Ruler size={16} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {property.landArea || "-"} m²
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>L. Tanah</div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "center", color: "#10b981", marginBottom: 2 }}>
                    <Building size={16} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {property.buildingArea || "-"} m²
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>L. Bangunan</div>
                </div>
              </div>

              {/* Video Walkthrough Callout */}
              {listing?.videoUrl && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03))",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PlayCircle size={20} style={{ color: "#ef4444" }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>Video Walkthrough Tersedia</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Tonton video tur {listing.videoPlatform || "YouTube"}
                      </div>
                    </div>
                  </div>
                  <a
                    href={listing.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#ef4444",
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: 6,
                      textDecoration: "none",
                    }}
                  >
                    Putar Video
                  </a>
                </div>
              )}

              {/* Detail Specifications */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#111827" }}>
                  Spesifikasi Lengkap
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px 12px",
                    fontSize: 12,
                    background: "#f9fafb",
                    padding: "10px 12px",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Sertifikat:</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{property.certificateType || "-"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Lantai:</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{property.floors || 1} Lantai</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Daya Listrik:</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {property.electricity ? `${property.electricity} VA` : "-"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Sumber Air:</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{property.waterSource || "-"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Arah Hadap:</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{property.facing || "-"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Garasi / Carport:</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {(property.garages || 0) + (property.carports || 0)} Mobil
                    </span>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#111827" }}>
                    Fasilitas Properti
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {amenities.map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          background: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #bbf7d0",
                          padding: "4px 8px",
                          borderRadius: 6,
                        }}
                      >
                        ✓ {item.amenity.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {listing?.description && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                    Deskripsi Properti
                  </div>
                  <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                    {listing.description}
                  </div>
                </div>
              )}

              {/* WhatsApp Lead CTA Button Mockup */}
              <div style={{ marginTop: 10 }}>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Halo Admin Jual Rumah Property, saya tertarik dengan listing properti ${property.code} (${listing?.title || "Rumah"}) di ${areaName || "Jakarta Selatan"}. Mohon info jadwal survey.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "#25D366",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "12px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
                    touchAction: "manipulation",
                  }}
                >
                  <MessageCircle size={18} />
                  Hubungi Agen via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
