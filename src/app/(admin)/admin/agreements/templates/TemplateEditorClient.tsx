"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgreementLetter } from "@/components/agreements/AgreementLetter";
import {
  AGREEMENT_PLACEHOLDERS,
  buildAgreementVars,
  renderPassages,
  renderText,
} from "@/lib/agreement-template";
import { Card as UiCard } from "@/components/ui/card";


// =============================================================================
// EDITOR TEMPLATE PERJANJIAN (Super Admin)
// - Muat versi lama sebagai dasar → simpan SELALU membuat versi baru.
// - Panel placeholder: klik untuk menyalin {{key}}.
// - Preview langsung memakai data contoh agar hasil render terlihat nyata.
// =============================================================================

type TemplateRow = {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  headerTitle: string;
  opening: string;
  body: { title: string; paragraphs: string[] }[];
  closing: string;
  createdAt: string;
};

type Draft = Omit<TemplateRow, "id" | "version" | "isActive" | "createdAt">;

/** Data contoh untuk preview render — bukan data nyata. */
function sampleVars() {
  return buildAgreementVars({
    agreementNumber: "001/JRP-AGR/X/2026",
    issuedAt: new Date(),
    startDate: new Date(),
    endDate: new Date(Date.now() + 180 * 86_400_000),
    signedPlace: "Jakarta Selatan",
    exclusive: true,
    commissionPercent: 2.5,
    commissionAmount: null,
    commissionNotes: "Dibayarkan setelah AJB.",
    brokerName: "Contoh Broker",
    brokerCompany: "CV Contoh Properti",
    brokerType: "INDEPENDENT",
    brokerPhone: "081200000000",
    brokerEmail: "broker@contoh.id",
    brokerCity: "Jakarta Selatan",
    brokerLicense: "-",
    ownerName: "Contoh Pemilik",
    ownerPhone: "081211111111",
    ownerEmail: null,
    ownerAddress: "Jl. Contoh No. 1, Jakarta Selatan",
    ownerIdNumber: "3175000000000000",
    listingNumber: "L-500001",
    askingPrice: 1_500_000_000,
    minimumPrice: 1_400_000_000,
    propertyCode: "JSP-000001",
    propertyNumber: null,
    propertyType: "HOUSE",
    propertyAddress: "Jl. Contoh No. 1",
    village: "Kebayoran Baru",
    district: "Kebayoran Baru",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    landArea: 120,
    buildingArea: 90,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 2015,
    certificateType: "SHM",
    certificateNo: "-",
  });
}

const emptyDraft: Draft = {
  name: "",
  headerTitle: "",
  opening: "",
  body: [{ title: "", paragraphs: [""] }],
  closing: "",
};

export default function TemplateEditorClient({ templates }: { templates: TemplateRow[] }) {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingFrom, setEditingFrom] = useState<TemplateRow | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const placeholdersByGroup = useMemo(() => {
    const groups = new Map<string, typeof AGREEMENT_PLACEHOLDERS>();
    for (const p of AGREEMENT_PLACEHOLDERS) {
      const list = groups.get(p.group) ?? [];
      list.push(p);
      groups.set(p.group, list);
    }
    return [...groups.entries()];
  }, []);

  const previewVars = useMemo(() => sampleVars(), []);

  function loadTemplate(t: TemplateRow) {
    setEditingFrom(t);
    setDraft({ name: t.name, headerTitle: t.headerTitle, opening: t.opening, body: JSON.parse(JSON.stringify(t.body)), closing: t.closing });
    setError(null);
  }

  function patchBody(updater: (body: Draft["body"]) => Draft["body"]) {
    setDraft((d) => ({ ...d, body: updater(d.body) }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/agreements/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan template.");
        return;
      }
      router.refresh();
      setEditingFrom(null);
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/agreements/templates/${id}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Gagal mengaktifkan versi.");
        return;
      }
      router.refresh();
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    }
  }

  function copyPlaceholder(key: string) {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  // Preview: render draf dengan data contoh.
  const preview = useMemo(() => {
    try {
      return {
        headerTitle: renderText(draft.headerTitle, previewVars).text,
        opening: renderText(draft.opening, previewVars).text,
        body: renderPassages(draft.body, previewVars).passages,
        closing: renderText(draft.closing, previewVars).text,
      };
    } catch {
      return null;
    }
  }, [draft, previewVars]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_320px]">
      {/* ============================ DAFTAR VERSI ============================ */}
      <aside className="admin-card p-4">
        <h2 className="mb-3 font-bold">Versi Template</h2>
        <button
          type="button"
          onClick={() => {
            setEditingFrom(null);
            setDraft(emptyDraft);
          }}
          className="mb-3 w-full rounded border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          + Draf baru
        </button>
        <ul className="space-y-2 text-sm">
          {templates.map((t) => (
            <li
              key={t.id}
              className={`rounded border p-2 ${
                t.isActive ? "border-emerald-400 bg-emerald-50" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={() => loadTemplate(t)}
                className="block w-full text-left"
              >
                <span className="font-semibold">{t.name}</span>
                <span className="text-gray-500"> v{t.version}</span>
                {t.isActive ? (
                  <span className="ml-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    AKTIF
                  </span>
                ) : null}
              </button>
              {!t.isActive ? (
                <button
                  type="button"
                  onClick={() => handleActivate(t.id)}
                  className="mt-1 text-xs text-blue-600 underline"
                >
                  Aktifkan versi ini
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </aside>

      {/* ============================ EDITOR ============================ */}
      <UiCard className="p-6 gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
        {editingFrom ? (
          <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">
            Menyunting dari <strong>{editingFrom.name} v{editingFrom.version}</strong>. Simpan akan
            membuat versi baru — versi lama tidak berubah.
          </p>
        ) : null}

        {error ? (
          <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <label className="block text-sm">
            Nama template
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Perjanjian Pemasaran Properti — Standar"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            Judul surat
            <input
              type="text"
              value={draft.headerTitle}
              onChange={(e) => setDraft((d) => ({ ...d, headerTitle: e.target.value }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-semibold"
            />
          </label>

          <label className="block text-sm">
            Pembuka (identitas para pihak)
            <textarea
              value={draft.opening}
              onChange={(e) => setDraft((d) => ({ ...d, opening: e.target.value }))}
              rows={5}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>

          {/* Pasal-pasal */}
          <div>
            <p className="text-sm font-semibold">Pasal-pasal</p>
            {draft.body.map((passage, i) => (
              <div key={i} className="mt-3 rounded border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={passage.title}
                    onChange={(e) =>
                      patchBody((b) =>
                        b.map((p, j) => (j === i ? { ...p, title: e.target.value } : p))
                      )
                    }
                    placeholder="PASAL 1 — OBJEK PERJANJIAN"
                    className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold"
                  />
                  <button
                    type="button"
                    title="Naikkan pasal"
                    onClick={() =>
                      patchBody((b) => {
                        if (i === 0) return b;
                        const copy = [...b];
                        [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                        return copy;
                      })
                    }
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Turunkan pasal"
                    onClick={() =>
                      patchBody((b) => {
                        if (i === b.length - 1) return b;
                        const copy = [...b];
                        [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
                        return copy;
                      })
                    }
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    title="Hapus pasal"
                    onClick={() => patchBody((b) => b.filter((_, j) => j !== i))}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>

                {passage.paragraphs.map((para, k) => (
                  <div key={k} className="mt-2 flex items-start gap-2">
                    <textarea
                      value={para}
                      onChange={(e) =>
                        patchBody((b) =>
                          b.map((p, j) =>
                            j === i
                              ? {
                                  ...p,
                                  paragraphs: p.paragraphs.map((q, m) =>
                                    m === k ? e.target.value : q
                                  ),
                                }
                              : p
                          )
                        )
                      }
                      rows={3}
                      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      title="Hapus paragraf"
                      onClick={() =>
                        patchBody((b) =>
                          b.map((p, j) =>
                            j === i
                              ? { ...p, paragraphs: p.paragraphs.filter((_, m) => m !== k) }
                              : p
                          )
                        )
                      }
                      className="mt-1 text-xs text-red-500 underline"
                    >
                      hapus
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    patchBody((b) =>
                      b.map((p, j) => (j === i ? { ...p, paragraphs: [...p.paragraphs, ""] } : p))
                    )
                  }
                  className="mt-2 text-xs text-blue-600 underline"
                >
                  + paragraf
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => patchBody((b) => [...b, { title: "", paragraphs: [""] }])}
              className="mt-3 rounded border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              + Tambah pasal
            </button>
          </div>

          <label className="block text-sm">
            Penutup (sebelum tanda tangan)
            <textarea
              value={draft.closing}
              onChange={(e) => setDraft((d) => ({ ...d, closing: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>

          <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan sebagai versi baru"}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
              />
              Preview langsung
            </label>
          </div>
        </div>

        {/* ============================ PREVIEW ============================ */}
        {showPreview && preview ? (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-gray-400">
              Preview dengan data contoh — bukan surat sah
            </p>
            <AgreementLetter
              headerTitle={preview.headerTitle}
              opening={preview.opening}
              body={preview.body}
              closing={preview.closing}
            />
          </div>
        ) : null}
      </UiCard>

      {/* ============================ PANEL PLACEHOLDER ============================ */}
      <aside className="admin-card max-h-[80vh] overflow-y-auto p-4">
        <h2 className="mb-1 font-bold">Placeholder</h2>
        <p className="mb-3 text-xs text-gray-500">
          Klik untuk menyalin, lalu tempel ke teks pasal. Diisi otomatis saat surat diterbitkan.
        </p>
        {placeholdersByGroup.map(([group, items]) => (
          <div key={group} className="mb-4">
            <p className="mb-1 text-xs font-bold uppercase text-gray-400">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => copyPlaceholder(p.key)}
                  title={p.label}
                  className={`rounded border px-2 py-1 font-mono text-xs ${
                    copiedKey === p.key
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  {copiedKey === p.key ? "✓ tersalin" : `{{${p.key}}}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
