"use client";

import { useState } from "react";
import { useSyncExternalStore } from "react";

interface PropertyShareProps {
  title: string;
  code: string;
}

const noopSubscribe = () => () => {};

export function PropertyShare({ title, code }: PropertyShareProps) {
  const [copied, setCopied] = useState(false);

  /* URL browser hanya dibaca setelah mount via useSyncExternalStore —
     server & client render pertama memakai fallback identik, sehingga
     tidak ada hydration mismatch (href server vs client sebelumnya beda). */
  const currentUrl = useSyncExternalStore(
    noopSubscribe,
    () => window.location.href,
    () => `https://jualrumahproperty.com/properti/${code}`
  );

  const getShareUrl = () => currentUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const shareText = encodeURIComponent(`${title} — Jual Rumah Property`);
  const encodedUrl = encodeURIComponent(getShareUrl());

  return (
    <div className="raveis-share-row">
      <span className="raveis-share-label">Share property</span>
      <div className="raveis-share-inline-icons">
        {/* Email */}
        <a
          href={`mailto:?subject=${shareText}&body=${encodedUrl}`}
          className="raveis-share-icon"
          aria-label="Email property"
          title="Kirim via Email"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6.5L2 7" />
          </svg>
        </a>

        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="raveis-share-icon"
          aria-label="Share on Facebook"
          title="Bagikan ke Facebook"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>

        {/* WhatsApp */}
        <a
          href={`https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="raveis-share-icon"
          aria-label="Share on WhatsApp"
          title="Bagikan ke WhatsApp"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-5a8.4 8.4 0 1 1 16.1-3.8Z" />
            <path d="M8.1 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .3 0 .5.5l.7 1.7c.1.2 0 .4-.1.6l-.6.7c-.2.2-.1.4 0 .6.5 1 1.3 1.8 2.2 2.3.3.2.5.2.7 0l.8-1c.2-.2.4-.2.6-.1l1.8.8c.3.2.5.2.5.4 0 .2-.1 1.2-.8 1.8-.6.6-1.5.8-2.5.5-1.1-.3-2.6-.9-4.3-2.4-1.4-1.3-2.4-2.9-2.7-4-.3-1.1 0-1.9.4-2.5Z" />
          </svg>
        </a>

        {/* X / Twitter */}
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="raveis-share-icon"
          aria-label="Share on X"
          title="Bagikan ke X"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4l11.7 16h4.3L8.3 4H4zm1.5 1.5h2.6l10.4 14.2h-2.6L5.5 5.5z" />
          </svg>
        </a>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopy}
          className="raveis-share-icon"
          aria-label="Salin tautan"
          title={copied ? "Tersalin!" : "Salin tautan"}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ color: "#16a34a" }}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
        </button>
      </div>
      {copied && <span className="raveis-copied-toast">Tersalin!</span>}
    </div>
  );
}
