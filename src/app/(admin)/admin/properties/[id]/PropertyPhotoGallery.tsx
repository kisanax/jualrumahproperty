"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ImageIcon,
  Camera,
  Plus,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  PlayCircle,
  ExternalLink,
} from "lucide-react";
import { getMediaUrl } from "@/lib/media-url";
import { Card as UiCard } from "@/components/ui/card";
import { Button as UiButton } from "@/components/ui/button";
import { ButtonLink } from "@/components/admin-ui/Button";


interface MediaItem {
  id: string;
  filePath: string;
  fileName: string;
  altText?: string | null;
  isPrimary: boolean;
  type: string;
}

interface PropertyPhotoGalleryProps {
  propertyId: string;
  media: MediaItem[];
  videoUrl?: string | null;
  videoPlatform?: string | null;
}

export default function PropertyPhotoGallery({
  propertyId,
  media,
  videoUrl,
  videoPlatform,
}: PropertyPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Touch swipe support for mobile phones
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

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
      // Swipe left -> foto berikutnya
      setLightboxIndex((prev) => (prev !== null ? (prev + 1) % media.length : 0));
    } else if (distance < -45) {
      // Swipe right -> foto sebelumnya
      setLightboxIndex((prev) => (prev !== null ? (prev - 1 + media.length) % media.length : 0));
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % media.length : 0));
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + media.length) % media.length : 0));
      }
    },
    [lightboxIndex, media.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (lightboxIndex !== null || showVideoModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, showVideoModal]);

  // Embed helper for YouTube
  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }
    return url;
  };

  return (
    <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
      {/* Header */}
      <UiCard
        className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}
      >
        <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ImageIcon size={16} /> Foto Properti ({media.length})
        </UiCard>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {videoUrl && (
            <UiButton size="sm" variant="outline"
              type="button"
              onClick={() => setShowVideoModal(true)}
              className="h-10 px-4"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                padding: "5px 10px",
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.06)",
                fontWeight: 600,
              }}
            >
              <PlayCircle size={14} /> Video Tour
            </UiButton>
          )}

          <ButtonLink variant="secondary"
            href={`/admin/properties/${propertyId}/edit`}
            className="h-10 px-4"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "5px 10px" }}
          >
            <Camera size={14} /> Kelola / Upload Foto
          </ButtonLink>
        </div>
      </UiCard>

      {/* Grid or Empty */}
      {media.length === 0 ? (
        <div className="admin-empty" style={{ padding: "28px 16px", textAlign: "center" }}>
          <ImageIcon size={36} style={{ color: "var(--color-admin-text-muted)", margin: "0 auto 10px", opacity: 0.5 }} />
          <div className="admin-empty-text" style={{ fontSize: 14, fontWeight: 500 }}>
            Belum ada foto yang diunggah
          </div>
          <p style={{ fontSize: 12, color: "var(--color-admin-text-secondary)", marginTop: 4, marginBottom: 14 }}>
            Unggah foto tampak depan, interior, dan lingkungan untuk memikat calon pembeli.
          </p>
          <ButtonLink variant="primary"
            href={`/admin/properties/${propertyId}/edit`}
            className="h-10 px-4"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 auto" }}
          >
            <Plus size={14} /> Upload Foto Sekarang
          </ButtonLink>
        </div>
      ) : (
        <div className="admin-photo-grid">
          {media.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`admin-photo-item ${item.isPrimary ? "primary" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                setLightboxIndex(idx);
              }}
              title="Ketuk untuk melihat foto ukuran penuh"
              style={{
                cursor: "pointer",
                position: "relative",
                touchAction: "manipulation",
                padding: 0,
                background: "none",
                display: "block",
                width: "100%",
                textAlign: "left",
                border: item.isPrimary ? "2px solid #10b981" : "2px solid transparent",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(item.filePath)}
                alt={item.altText || item.fileName}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  pointerEvents: "none",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              />

              {item.isPrimary && (
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
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                >
                  <Star size={10} fill="#fff" /> UTAMA
                </span>
              )}

              {/* Mobile and Desktop Zoom Badge */}
              <span
                style={{
                  position: "absolute",
                  bottom: 6,
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
                <Maximize2 size={12} />
              </span>

              {/* Hover Zoom Icon (desktop) */}
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
                <Maximize2 size={24} style={{ color: "#fff" }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal (Responsive Desktop & Mobile HP) */}
      {lightboxIndex !== null && media[lightboxIndex] && (
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
          {/* Top Bar Header */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.02em" }}>
                Foto {lightboxIndex + 1} / {media.length}
              </span>
              {media[lightboxIndex].isPrimary && (
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
                  }}
                >
                  <Star size={11} fill="#fff" /> Foto Utama
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(null);
              }}
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
                touchAction: "manipulation",
              }}
              title="Tutup Pratinjau (Esc)"
              aria-label="Tutup Pratinjau Foto"
            >
              <X size={22} style={{ pointerEvents: "none" }} />
            </button>
          </div>

          {/* Center Full Image with Touch Gestures & Navigation */}
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
            {media.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null ? (prev - 1 + media.length) % media.length : 0));
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
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
                title="Foto Sebelumnya (Geser Kanan)"
                aria-label="Foto Sebelumnya"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            {/* Main Picture */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMediaUrl(media[lightboxIndex].filePath)}
              alt={media[lightboxIndex].altText || media[lightboxIndex].fileName}
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
            {media.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null ? (prev + 1) % media.length : 0));
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
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
                title="Foto Selanjutnya (Geser Kiri)"
                aria-label="Foto Selanjutnya"
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {/* Swipe Hint for Mobile */}
          <div
            style={{
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.6)",
              textAlign: "center",
              paddingTop: 4,
              paddingBottom: 4,
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            💡 Geser layar (swipe) ke kiri / kanan untuk berganti foto
          </div>

          {/* Bottom Thumbnails Strip */}
          <div
            style={{
              width: "100%",
              maxWidth: 1080,
              display: "flex",
              justifyContent: media.length > 5 ? "flex-start" : "center",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              padding: "6px 8px",
              flexShrink: 0,
              WebkitOverflowScrolling: "touch",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {media.map((thumb, idx) => (
              <button
                key={thumb.id}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                style={{
                  width: 50,
                  height: 38,
                  borderRadius: 6,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: idx === lightboxIndex ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.3)",
                  opacity: idx === lightboxIndex ? 1 : 0.55,
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  padding: 0,
                  background: "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaUrl(thumb.filePath)}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Modal Player */}
      {showVideoModal && videoUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 800,
              background: "#000",
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
              aspectRatio: "16/9",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowVideoModal(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer",
                zIndex: 20,
              }}
            >
              <X size={18} />
            </button>

            {videoUrl.includes("youtube") || videoUrl.includes("youtu.be") ? (
              <iframe
                src={getEmbedUrl(videoUrl)}
                title="Property Video Tour"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  gap: 12,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <PlayCircle size={48} style={{ color: "#ef4444" }} />
                <div style={{ fontSize: 16, fontWeight: 600 }}>Tonton Video di {videoPlatform || "Platform Eksternal"}</div>
                <ButtonLink variant="primary"
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-4"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <ExternalLink size={16} /> Buka Tautan Video
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      )}
    </UiCard>
  );
}
