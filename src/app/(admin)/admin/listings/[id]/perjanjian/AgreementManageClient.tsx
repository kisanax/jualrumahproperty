"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgreementLetter, type LetterSignatureInfo } from "@/components/agreements/AgreementLetter";
import { Card as UiCard } from "@/components/ui/card";


// =============================================================================
// PANEL KELOLA PERJANJIAN (staf)
// State: belum ada → form terbitkan; ada → status, ttd broker, batal, surat.
// =============================================================================

type AgreementData = {
  id: string;
  agreementNumber: string;
  status: string;
  exclusive: boolean;
  commissionPercent: number | null;
  commissionAmount: number | null;
  commissionNotes: string | null;
  startDate: string;
  endDate: string;
  signedPlace: string | null;
  issuedAt: string | null;
  signedAt: string | null;
  contentHash: string | null;
  finalHash: string | null;
  cancelReason: string | null;
  snapshot: {
    letter: { headerTitle: string; opening: string; body: { title: string; paragraphs: string[] }[]; closing: string };
  } | null;
  signatures: LetterSignatureInfo[];
};

export default function AgreementManageClient({
  listingId,
  listingNumber,
  askingPrice,
  minimumPrice,
  owners,
  agreement,
}: {
  listingId: string;
  listingNumber: string;
  askingPrice: number | null;
  minimumPrice: number | null;
  owners: { id: string; name: string; isPrimary: boolean }[];
  agreement: AgreementData | null;
}) {
  const router = useRouter();

  // ---- form terbitkan ----
  // Tanggal default dihitung SEKALI di lazy initializer (bukan saat render)
  // agar render tetap murni/idempoten.
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)
  );
  const [exclusive, setExclusive] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionNotes, setCommissionNotes] = useState("");
  const [signedPlace, setSignedPlace] = useState("Jakarta Selatan");

  // ---- ttd broker ----
  const [showSignForm, setShowSignForm] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);

  // ---- umum ----
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [ownerLink, setOwnerLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ============================ terbitkan ============================
  async function handleIssue() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          ownerId: ownerId || null,
          startDate: new Date(startDate + "T00:00:00+07:00").toISOString(),
          endDate: new Date(endDate + "T23:59:59+07:00").toISOString(),
          exclusive,
          commissionPercent: commissionPercent ? Number(commissionPercent) : null,
          commissionAmount: commissionAmount ? Number(commissionAmount) : null,
          commissionNotes: commissionNotes || null,
          signedPlace: signedPlace || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menerbitkan perjanjian.");
        return;
      }
      // Token owner hanya dikembalikan SEKALI — tampilkan sekarang.
      setOwnerLink(data.ownerSigningUrl);
      router.refresh();
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  // ============================ ttd broker ============================
  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  async function handleBrokerSign() {
    setError(null);
    if (!dirtyRef.current) {
      setError("Gambar tanda tangan Anda terlebih dahulu.");
      return;
    }
    const blob: Blob | null = await new Promise((resolve) =>
      canvasRef.current!.toBlob(resolve, "image/png")
    );
    if (!blob) {
      setError("Gagal memproses gambar tanda tangan.");
      return;
    }
    const formData = new FormData();
    formData.set("method", "DRAWN");
    formData.set("consent", "true");
    formData.set("signature", new File([blob], "ttd.png", { type: "image/png" }));

    setBusy(true);
    try {
      const res = await fetch(`/api/agreements/${agreement!.id}/sign`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menandatangani.");
        return;
      }
      setShowSignForm(false);
      router.refresh();
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  // ============================ batalkan ============================
  async function handleCancel() {
    setError(null);
    if (cancelReason.trim().length < 5) {
      setError("Tulis alasan pembatalan (minimal 5 karakter).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/agreements/${agreement!.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membatalkan.");
        return;
      }
      setShowCancel(false);
      router.refresh();
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  // ============================ render ============================
  const statusLabel: Record<string, string> = {
    DRAFT: "Draf",
    ISSUED: "Diterbitkan — menunggu tanda tangan",
    PARTIALLY_SIGNED: "Sebagian ditandatangani",
    SIGNED: "Ditandatangani lengkap",
    CANCELLED: "Dibatalkan",
    EXPIRED: "Kedaluwarsa",
  };

  const brokerSigned = agreement?.signatures.find((s) => s.role === "BROKER");
  const ownerSigned = agreement?.signatures.find((s) => s.role === "OWNER");

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Link tanda tangan owner — tampil sekali setelah terbitkan */}
      {ownerLink ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">Tautan tanda tangan pemilik (tampil sekali):</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="block flex-1 overflow-x-auto rounded bg-white px-2 py-1 text-xs">
              {typeof window !== "undefined" ? window.location.origin : ""}{ownerLink}
            </code>
            <button
              type="button"
              className="rounded bg-emerald-600 px-3 py-1 text-white"
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + ownerLink);
                setCopied(true);
              }}
            >
              {copied ? "Tersalin!" : "Salin"}
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            Kirimkan ke pemilik via WhatsApp/email. Tautan berlaku 14 hari dan hanya bisa dipakai sekali.
          </p>
        </div>
      ) : null}

      {/* Belum ada perjanjian → form terbitkan */}
      {!agreement ? (
        <UiCard className="p-6 gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
          <h2 className="text-lg font-bold">Terbitkan Surat Perjanjian</h2>
          <p className="mt-1 text-sm text-gray-500">
            Listing: <span className="font-medium">{listingNumber}</span>
            {askingPrice !== null ? ` · Harga tawar Rp ${askingPrice.toLocaleString("id-ID")}` : ""}
            {minimumPrice !== null ? ` · Harga minimum Rp ${minimumPrice.toLocaleString("id-ID")}` : ""}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              Pemilik (PIHAK PERTAMA)
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">— Owner utama properti —</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.isPrimary ? " (utama)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Kota penandatanganan
              <input
                type="text"
                value={signedPlace}
                onChange={(e) => setSignedPlace(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Mulai berlaku
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Berakhir
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Komisi (%)
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                placeholder="mis. 2.5"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Komisi (nominal Rp)
              <input
                type="number"
                min="0"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
                placeholder="mis. 50000000"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={exclusive} onChange={(e) => setExclusive(e.target.checked)} />
              Perjanjian eksklusif
            </label>
            <label className="text-sm md:col-span-2">
              Catatan komisi
              <textarea
                value={commissionNotes}
                onChange={(e) => setCommissionNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleIssue}
            disabled={busy}
            className="mt-4 rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Menerbitkan…" : "Terbitkan Surat"}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Setelah diterbitkan, isi surat dikunci (di-freeze) dan tidak bisa diubah —
            perubahan syarat berarti menerbitkan surat baru.
          </p>
        </UiCard>
      ) : (
        <>
          {/* Status & aksi */}
          <UiCard className="p-6 gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-gray-500">{agreement.agreementNumber}</p>
                <p className="text-lg font-bold">{statusLabel[agreement.status] ?? agreement.status}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {agreement.exclusive ? "Eksklusif" : "Non-eksklusif"} ·{" "}
                  {new Date(agreement.startDate).toLocaleDateString("id-ID")} s/d{" "}
                  {new Date(agreement.endDate).toLocaleDateString("id-ID")}
                  {agreement.commissionPercent !== null
                    ? ` · Komisi ${agreement.commissionPercent}%`
                    : agreement.commissionAmount !== null
                      ? ` · Komisi Rp ${agreement.commissionAmount.toLocaleString("id-ID")}`
                      : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {agreement.status !== "SIGNED" &&
                agreement.status !== "CANCELLED" &&
                agreement.status !== "EXPIRED" ? (
                  <>
                    {!brokerSigned || brokerSigned.status !== "SIGNED" ? (
                      <button
                        type="button"
                        onClick={() => setShowSignForm((v) => !v)}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Tandatangani (Broker)
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setShowCancel((v) => !v)}
                      className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Batalkan
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {agreement.cancelReason ? (
              <p className="mt-3 text-sm text-red-600">Alasan pembatalan: {agreement.cancelReason}</p>
            ) : null}

            {/* Slot tanda tangan */}
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded border border-gray-200 p-3">
                <p className="font-semibold">Broker</p>
                <p>{brokerSigned?.signerName ?? "—"}</p>
                <p className={brokerSigned?.status === "SIGNED" ? "text-emerald-600" : "text-gray-500"}>
                  {brokerSigned?.status === "SIGNED"
                    ? `✓ Ditandatangani ${brokerSigned.signedAt ? new Date(brokerSigned.signedAt).toLocaleString("id-ID") : ""}`
                    : "Belum menandatangani"}
                </p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="font-semibold">Pemilik</p>
                <p>{ownerSigned?.signerName ?? "—"}</p>
                <p className={ownerSigned?.status === "SIGNED" ? "text-emerald-600" : "text-gray-500"}>
                  {ownerSigned?.status === "SIGNED"
                    ? `✓ Ditandatangani ${ownerSigned.signedAt ? new Date(ownerSigned.signedAt).toLocaleString("id-ID") : ""}`
                    : "Belum menandatangani"}
                </p>
              </div>
            </div>

            {/* Hash integritas */}
            {agreement.contentHash ? (
              <p className="mt-3 break-all font-mono text-xs text-gray-400">
                Sidik jari isi surat: {agreement.contentHash}
                {agreement.finalHash ? ` · Final: ${agreement.finalHash}` : ""}
              </p>
            ) : null}

            {/* Form ttd broker */}
            {showSignForm ? (
              <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold">Gambar tanda tangan Anda:</p>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  className="mt-2 w-full max-w-xl touch-none rounded border border-dashed border-gray-400 bg-white"
                  onPointerDown={(e) => {
                    const ctx = canvasRef.current!.getContext("2d")!;
                    const { x, y } = pointerPos(e);
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = "round";
                    ctx.strokeStyle = "#111827";
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    drawingRef.current = true;
                    dirtyRef.current = true;
                  }}
                  onPointerMove={(e) => {
                    if (!drawingRef.current) return;
                    const ctx = canvasRef.current!.getContext("2d")!;
                    const { x, y } = pointerPos(e);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                  }}
                  onPointerUp={() => (drawingRef.current = false)}
                  onPointerLeave={() => (drawingRef.current = false)}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="text-sm text-blue-600 underline"
                    onClick={() => {
                      const canvas = canvasRef.current;
                      canvas?.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
                      dirtyRef.current = false;
                    }}
                  >
                    Bersihkan
                  </button>
                  <button
                    type="button"
                    onClick={handleBrokerSign}
                    disabled={busy}
                    className="ml-auto rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Menyimpan…" : "Simpan Tanda Tangan"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Form batal */}
            {showCancel ? (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
                <label className="text-sm font-semibold">
                  Alasan pembatalan
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busy}
                  className="mt-2 rounded bg-red-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Memproses…" : "Batalkan Perjanjian"}
                </button>
                <p className="mt-1 text-xs text-red-700">
                  Nomor surat yang dibatalkan tidak dipakai ulang — surat baru akan mendapat nomor berikutnya.
                </p>
              </div>
            ) : null}
          </UiCard>

          {/* Surat dari snapshot */}
          {agreement.snapshot ? (
            <UiCard className="p-6 gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Isi Surat (snapshot terkunci)</h2>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-sm text-blue-600 underline"
                >
                  Cetak / simpan PDF
                </button>
              </div>
              <AgreementLetter
                headerTitle={agreement.snapshot.letter.headerTitle}
                opening={agreement.snapshot.letter.opening}
                body={agreement.snapshot.letter.body}
                closing={agreement.snapshot.letter.closing}
                signatureInfo={agreement.signatures}
              />
            </UiCard>
          ) : null}
        </>
      )}
    </div>
  );
}
