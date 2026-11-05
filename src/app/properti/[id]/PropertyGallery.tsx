"use client";

import { useState, useEffect, useCallback } from "react";
import { getMediaUrl } from "@/lib/media-url";

type PhotoItem = {
  id: string;
  filePath: string;
  altText: string | null;
  caption: string | null;
  isPrimary?: boolean;
};

interface PropertyGalleryProps {
  photos: PhotoItem[];
  title: string;
}

export function PropertyGallery({ photos, title }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const totalPhotos = photos.length;
  const currentPhoto = photos[activeIndex] || photos[0];

  const nextPhoto = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalPhotos);
  }, [totalPhotos]);

  const prevPhoto = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
  }, [totalPhotos]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, nextPhoto, prevPhoto]);

  if (totalPhotos === 0) {
    return (
      <section className="pd-gallery-empty-wrap" aria-label="Galeri Foto">
        <div className="pd-gallery-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 11 9-7 9 7v9H3v-9Z" />
            <path d="M9 20v-6h6v6" />
          </svg>
          <span>Foto belum tersedia untuk properti ini</span>
        </div>
      </section>
    );
  }

  // Thumbnails to show in the 2x2 side grid (up to 4 thumbnails)
  const sidePhotos = photos.slice(1, 5);
  const remainingCount = totalPhotos > 5 ? totalPhotos - 5 : 0;

  return (
    <>
      <section className="pd-gallery-wrapper" aria-label={`Galeri Foto ${title}`}>
        {/* Main large hero photo (left ~54%) */}
        <div
          className="pd-gallery-main"
          onClick={() => setLightboxOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Klik untuk memperbesar foto"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setLightboxOpen(true);
          }}
        >
          <img
            src={getMediaUrl(currentPhoto.filePath)}
            alt={currentPhoto.altText || `${title} — Foto ${activeIndex + 1}`}
            loading="eager"
          />

          {/* Hover Navigation Arrows (Subtle, sleek, no obstruction) */}
          {totalPhotos > 1 && (
            <div className="gallery-hover-arrows">
              <button
                type="button"
                className="gallery-arrow-btn gallery-arrow-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                aria-label="Foto sebelumnya"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="gallery-arrow-btn gallery-arrow-next"
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                aria-label="Foto berikutnya"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}

          {/* Photo Counter Badge (Bottom Left) */}
          <div className="gallery-counter-tag">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>
              {activeIndex + 1} / {totalPhotos}
            </span>
          </div>

          {/* Expand Fullscreen Button (Bottom Right) */}
          <button
            type="button"
            className="gallery-view-all-btn"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Semua Foto ({totalPhotos})</span>
          </button>
        </div>

        {/* 2x2 grid of 4 photos on the right (~46%) */}
        {sidePhotos.length > 0 && (
          <div className="pd-gallery-grid">
            {sidePhotos.map((photo, idx) => {
              const photoIndex = idx + 1;
              const isLastItem = idx === 3;

              return (
                <div
                  key={photo.id}
                  className={`pd-gallery-thumb ${
                    activeIndex === photoIndex ? "active-thumb" : ""
                  }`}
                  onClick={() => {
                    setActiveIndex(photoIndex);
                    setLightboxOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Pilih foto ${photoIndex + 1}`}
                >
                  <img
                    src={getMediaUrl(photo.filePath)}
                    alt={photo.altText || `${title} — Foto ${photoIndex + 1}`}
                    loading="lazy"
                  />

                  {/* If 4th item has extra photos, show subtle overlay */}
                  {isLastItem && remainingCount > 0 ? (
                    <div className="pd-more-overlay">
                      <span>+{remainingCount + 1} Foto</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  ) : (
                    /* Subtle chevron arrow on the 4th photo matching JRP */
                    isLastItem && (
                      <div className="pd-thumb-chevron">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxOpen && (
        <div
          className="pd-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ukuran penuh — ${title}`}
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="pd-lightbox-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pd-lightbox-header">
              <div className="pd-lightbox-heading">
                <strong>{title}</strong>
                <span>
                  Foto {activeIndex + 1} dari {totalPhotos}
                </span>
              </div>
              <button
                type="button"
                className="pd-lightbox-exit"
                onClick={() => setLightboxOpen(false)}
                aria-label="Tutup foto"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stage */}
            <div className="pd-lightbox-stage">
              <button
                type="button"
                className="pd-lightbox-arrow arrow-left"
                onClick={prevPhoto}
                aria-label="Foto sebelumnya"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <div className="pd-lightbox-photo-box">
                <img
                  src={getMediaUrl(currentPhoto.filePath)}
                  alt={
                    currentPhoto.altText ||
                    `${title} — Foto ${activeIndex + 1}`
                  }
                />
              </div>

              <button
                type="button"
                className="pd-lightbox-arrow arrow-right"
                onClick={nextPhoto}
                aria-label="Foto berikutnya"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Thumbnail Strip */}
            <div className="pd-lightbox-strip">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pd-strip-thumb ${
                    i === activeIndex ? "active" : ""
                  }`}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Lihat foto ${i + 1}`}
                >
                  <img src={getMediaUrl(p.filePath)} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
