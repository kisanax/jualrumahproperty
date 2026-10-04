"use client";

import { useState } from "react";

/**
 * Form langganan kabar footer — kirim via fetch tanpa reload halaman.
 */
export default function PortalFooterNews() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <form className="portal-footer-news" onSubmit={onSubmit}>
      {state === "done" ? (
        <p className="portal-footer-news-done">
          Terima kasih! Kabar properti terbaru akan dikirim ke email Anda.
        </p>
      ) : (
        <>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Alamat email"
            aria-label="Alamat email"
          />
          <button type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Mengirim…" : "Dapatkan kabar terbaru"}
          </button>
          {state === "error" && (
            <small className="portal-footer-news-error">
              Terjadi kesalahan, coba lagi nanti.
            </small>
          )}
          <small>
            Dengan berlangganan Anda menyetujui <a href="/#">ketentuan</a> kami.
            Berhenti kapan saja.
          </small>
        </>
      )}
    </form>
  );
}
