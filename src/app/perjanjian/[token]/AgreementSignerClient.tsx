"use client";

import { useRef, useState } from "react";
import { AgreementLetter } from "@/components/agreements/AgreementLetter";

// =============================================================================
// FORM TANDA TANGAN OWNER (kanal publik)
// Dua metode: DRAWN (gambar di canvas) dan TYPED (ketik nama).
// Persetujuan wajib dicentang — waktu persetujuan menjadi bagian bukti.
// =============================================================================

type Snapshot = {
  letter: { headerTitle: string; opening: string; body: { title: string; paragraphs: string[] }[]; closing: string };
};

export function AgreementSignerClient({
  token,
  status,
  slotStatus,
  tokenUsed,
  tokenExpiresAt,
  expectedSignerName,
  snapshot,
  brokerSignature,
}: {
  token: string;
  status: string;
  slotStatus: string;
  tokenUsed: boolean;
  tokenExpiresAt: string | null;
  expectedSignerName: string;
  snapshot: Snapshot | null;
  brokerSignature: { signerName: string; status: string; signedAt: string | null } | null;
}) {
  const [method, setMethod] = useState<"DRAWN" | "TYPED">("DRAWN");
  const [consent, setConsent] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ finalized: boolean; finalHash: string | null } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);

  const blocked = tokenUsed || slotStatus === "SIGNED" || status === "CANCELLED" || status === "EXPIRED";

  // ---------- canvas helpers ----------
  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
    dirtyRef.current = true;
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    dirtyRef.current = false;
  }

  // ---------- submit ----------
  async function handleSubmit() {
    setError(null);

    if (!consent) {
      setError("Centang persetujuan terlebih dahulu.");
      return;
    }
    if (signerName.trim().length < 3) {
      setError("Isi nama lengkap Anda sesuai data pemilik.");
      return;
    }
    if (method === "DRAWN" && !dirtyRef.current) {
      setError("Gambar tanda tangan Anda di kotak yang tersedia.");
      return;
    }

    const formData = new FormData();
    formData.set("method", method);
    formData.set("consent", "true");
    formData.set("signerName", signerName.trim());

    if (method === "DRAWN") {
      const blob: Blob | null = await new Promise((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/png")
      );
      if (!blob) {
        setError("Gagal memproses gambar tanda tangan.");
        return;
      }
      formData.set("signature", new File([blob], "ttd.png", { type: "image/png" }));
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/agreements/public/${token}/sign`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan tanda tangan.");
        return;
      }
      setDone({ finalized: data.finalized, finalHash: data.finalHash });
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- tampilan setelah tanda tangan ----------
  if (done) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6">
        <h2 className="text-lg font-bold text-emerald-800">Tanda tangan tercatat</h2>
        <p className="mt-2 text-sm text-emerald-900">
          Terima kasih. Tanda tangan Anda telah dicatat dengan bukti elektronik
          (waktu, perangkat, dan sidik jari dokumen).
        </p>
        {done.finalized ? (
          <p className="mt-2 text-sm font-semibold text-emerald-900">
            Perjanjian ini telah ditandatangani lengkap oleh kedua pihak dan sah berlaku.
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-900">
            Perjanjian akan final setelah broker juga menandatanganinya.
          </p>
        )}
        {done.finalHash ? (
          <p className="mt-3 break-all font-mono text-xs text-emerald-800">
            Sidik jari surat final: {done.finalHash}
          </p>
        ) : null}
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
        {tokenUsed || slotStatus === "SIGNED"
          ? "Tautan ini sudah dipakai untuk menandatangani. Surat sudah Anda tanda tangani."
          : `Perjanjian sudah ${status.toLowerCase()} dan tidak bisa ditandatangani lagi.`}
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-900">
        Isi surat belum tersedia. Hubungi broker Anda.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status slot tanda tangan */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span
          className={`rounded-full px-3 py-1 ${
            brokerSignature?.status === "SIGNED"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          Broker: {brokerSignature?.status === "SIGNED" ? `ditandatangani oleh ${brokerSignature.signerName}` : "belum menandatangani"}
        </span>
        <span
          className={`rounded-full px-3 py-1 ${
            slotStatus === "SIGNED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
          }`}
        >
          Anda ({expectedSignerName}): {slotStatus === "SIGNED" ? "sudah menandatangani" : "belum menandatangani"}
        </span>
        {tokenExpiresAt ? (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
            Tautan berlaku s/d {new Date(tokenExpiresAt).toLocaleDateString("id-ID")}
          </span>
        ) : null}
      </div>

      {/* Surat */}
      <AgreementLetter
        headerTitle={snapshot.letter.headerTitle}
        opening={snapshot.letter.opening}
        body={snapshot.letter.body}
        closing={snapshot.letter.closing}
        signatureInfo={[
          ...(brokerSignature
            ? [{ role: "BROKER" as const, ...brokerSignature, status: brokerSignature.status }]
            : []),
          { role: "OWNER" as const, signerName: expectedSignerName, status: slotStatus },
        ]}
      />

      {/* Form tanda tangan */}
      <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Tandatangani sebagai pemilik</h2>

        <div className="mt-4 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="method"
              checked={method === "DRAWN"}
              onChange={() => setMethod("DRAWN")}
            />
            Gambar tanda tangan
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="method"
              checked={method === "TYPED"}
              onChange={() => setMethod("TYPED")}
            />
            Ketik nama (font tanda tangan)
          </label>
        </div>

        {method === "DRAWN" ? (
          <div className="mt-4">
            <canvas
              ref={canvasRef}
              width={600}
              height={180}
              className="w-full max-w-xl touch-none rounded border border-dashed border-gray-400 bg-gray-50"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            <button
              type="button"
              onClick={clearCanvas}
              className="mt-2 text-sm text-blue-600 underline"
            >
              Bersihkan
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Tulis nama lengkap"
              className="w-full max-w-xl rounded border border-gray-300 px-3 py-2"
              style={{ fontFamily: "cursive", fontSize: "1.25rem" }}
            />
          </div>
        )}

        <div className="mt-4">
          <label className="text-sm">
            Nama lengkap (sesuai data pemilik){" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span>
            Saya, <strong>{expectedSignerName}</strong>, menyatakan setuju dengan seluruh isi
            surat perjanjian di atas dan menandatanganinya secara elektronik. Persetujuan ini
            dicatat beserta waktu dan perangkat yang saya gunakan.
          </span>
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-4 rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Menyimpan…" : "Tandatangani"}
        </button>
      </div>
    </div>
  );
}
