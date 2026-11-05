"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button as UiButton } from "@/components/ui/button";


interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. In development mode: proactively unregister any service workers & clean caches
    // This prevents stale Next.js chunk caching and broken React hydration on phones
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
            console.log("[PWA Dev] Unregistered service worker:", registration.scope);
          }
        });
        if ("caches" in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
        return;
      }

      // Production: Register Service Worker
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("Service Worker registration failed:", error);
          });
      });
    }


    // 2. Listen for BeforeInstallPromptEvent
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Check if user dismissed recently
      const dismissed = localStorage.getItem("pwa-dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-dismissed", "true");
  };

  if (!showBanner || !installPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "76px",
        left: "12px",
        right: "12px",
        maxWidth: "420px",
        margin: "0 auto",
        zIndex: 50,
        backgroundColor: "var(--color-admin-surface)",
        border: "1px solid var(--color-admin-border)",
        borderRadius: "12px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "var(--color-admin-dropdown-shadow)",
      }}
      className="animate-slide-up"
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: "var(--color-admin-accent-light)",
          color: "var(--color-admin-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Download size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-admin-text)" }}>
          Pasang Jaksel Admin
        </div>
        <div style={{ fontSize: 11, color: "var(--color-admin-text-secondary)" }}>
          Akses cepat via home screen HP Anda
        </div>
      </div>
      <UiButton size="sm" variant="default"
        onClick={handleInstallClick}
        className="h-10 px-4"
        style={{ whiteSpace: "nowrap" }}
      >
        Pasang
      </UiButton>
      <button
        onClick={handleDismiss}
        aria-label="Tutup pemberitahuan"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-admin-text-muted)",
          cursor: "pointer",
          padding: 4,
          display: "flex",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
