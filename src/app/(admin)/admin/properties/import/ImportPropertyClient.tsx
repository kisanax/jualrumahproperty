"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { parseCSV, generatePropertyImportTemplate, PropertyImportRow } from "@/lib/csv-parser";
import { Button as UiButton } from "@/components/ui/button";
import { Card as UiCard } from "@/components/ui/card";
import { Table as UiTable, TableHeader as UiTableHeader, TableRow as UiTableRow, TableHead as UiTableHead, TableBody as UiTableBody, TableCell as UiTableCell } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/admin-ui/Button";

interface AreaOption {
  id: number;
  name: string;
}

interface KawasanOption {
  id: string;
  name: string;
}

interface ImportPropertyClientProps {
  areas: AreaOption[];
  kawasanList: KawasanOption[];
}

interface ImportResult {
  total: number;
  successCount: number;
  failedCount: number;
  createdProperties: { id: string; code: string; address: string }[];
  errors: { row: number; error: string; code?: string }[];
}

export default function ImportPropertyClient({
  areas,
  kawasanList,
}: ImportPropertyClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<PropertyImportRow[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<"DRAFT" | "ACTIVE">("DRAFT");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Download template handler
  const handleDownloadTemplate = () => {
    const csvContent = generatePropertyImportTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template-import-properti-jaksel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Template CSV berhasil diunduh.");
  };

  // Handle file select or drop
  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Format file harus berupa .csv");
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("File kosong atau tidak dapat dibaca.");
        return;
      }

      try {
        const rawRecords = parseCSV(text);
        if (rawRecords.length === 0) {
          toast.error("Tidak ada data ditemukan di dalam file CSV.");
          return;
        }

        const rows: PropertyImportRow[] = rawRecords.map((r) => ({
          kode: r.kode || undefined,
          tipe: r.tipe || undefined,
          kecamatan: r.kecamatan || "",
          kawasan: r.kawasan || undefined,
          alamat: r.alamat || "",
          luas_tanah: r.luas_tanah || undefined,
          luas_bangunan: r.luas_bangunan || undefined,
          kamar_tidur: r.kamar_tidur || undefined,
          kamar_mandi: r.kamar_mandi || undefined,
          lantai: r.lantai || undefined,
          sertifikat: r.sertifikat || undefined,
          daya_listrik: r.daya_listrik || undefined,
          arah_hadap: r.arah_hadap || undefined,
          harga_penawaran: r.harga_penawaran || undefined,
          nama_owner: r.nama_owner || undefined,
          telepon_owner: r.telepon_owner || undefined,
          catatan_internal: r.catatan_internal || undefined,
        }));

        setParsedRows(rows);
        toast.success(`Berhasil membaca ${rows.length} baris data properti.`);
      } catch (err: unknown) {
        console.error("Parse CSV error:", err);
        toast.error("Gagal mem-parsing format CSV.");
      }
    };
    reader.readAsText(selectedFile);
  };

  // Validation helper for preview table
  const validateRow = (row: PropertyImportRow) => {
    const issues: string[] = [];
    if (!row.alamat?.trim()) issues.push("Alamat kosong");
    if (!row.kecamatan?.trim()) {
      issues.push("Kecamatan kosong");
    } else {
      const match = areas.some(
        (a) =>
          a.name.toLowerCase().includes(row.kecamatan.trim().toLowerCase()) ||
          row.kecamatan.trim().toLowerCase().includes(a.name.toLowerCase())
      );
      if (!match) issues.push(`Kecamatan "${row.kecamatan}" tidak dikenali`);
    }
    if (row.kawasan?.trim()) {
      const matchK = kawasanList.some((k) =>
        k.name.toLowerCase().includes(row.kawasan!.trim().toLowerCase())
      );
      if (!matchK) issues.push(`Kawasan "${row.kawasan}" tidak terdaftar`);
    }
    return issues;
  };

  const validRowsCount = parsedRows.filter(
    (row) => validateRow(row).length === 0
  ).length;

  // Process Import Submission
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/properties/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parsedRows,
          defaultStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses import");

      setResult(data);
      toast.success(
        `Import selesai: ${data.successCount} properti berhasil ditambahkan!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan import";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setResult(null);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1040, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin/properties"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--color-admin-text-secondary)",
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={16} /> Kembali ke daftar properti
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              Import Data Properti
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-admin-text-secondary)",
                marginTop: 4,
              }}
            >
              Upload file CSV untuk menambahkan stok properti & listing secara massal.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <ButtonLink variant="secondary"
              href="/admin/properties/smart-import"
              className="h-10 px-4"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderColor: "rgba(16, 185, 129, 0.4)",
                background: "rgba(16, 185, 129, 0.08)",
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              <Sparkles size={16} /> Smart Paste WA
            </ButtonLink>
            <UiButton variant="outline"
              type="button"
              onClick={handleDownloadTemplate}
              className="h-10 px-4"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Download size={16} /> Unduh Template CSV
            </UiButton>
          </div>
        </div>
      </div>

      {/* RESULT VIEW */}
      {result ? (
        <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <CheckCircle2 size={32} style={{ color: "#10b981" }} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                Hasil Proses Import Properti
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-admin-text-secondary)",
                  margin: "4px 0 0",
                }}
              >
                {result.successCount} dari {result.total} properti berhasil disimpan ke database.
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: "var(--color-admin-bg)",
                border: "1px solid var(--color-admin-border)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Total Baris</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{result.total}</div>
            </div>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: "var(--color-admin-bg)",
                border: "1px solid #10b981",
              }}
            >
              <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Berhasil Disimpan</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981", marginTop: 4 }}>
                {result.successCount}
              </div>
            </div>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: "var(--color-admin-bg)",
                border: `1px solid ${result.failedCount > 0 ? "#ef4444" : "var(--color-admin-border)"}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: result.failedCount > 0 ? "#ef4444" : "var(--color-admin-text-muted)",
                  fontWeight: 600,
                }}
              >
                Gagal / Dilewati
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: result.failedCount > 0 ? "#ef4444" : "inherit",
                  marginTop: 4,
                }}
              >
                {result.failedCount}
              </div>
            </div>
          </div>

          {/* Success List */}
          {result.createdProperties.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
                Properti yang Berhasil Dibuat:
              </h3>
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--color-admin-border)",
                  borderRadius: 8,
                }}
              >
                <UiTable className="w-full text-sm">
                  <UiTableHeader>
                    <UiTableRow>
                      <UiTableHead>Kode Properti</UiTableHead>
                      <UiTableHead>Alamat</UiTableHead>
                      <UiTableHead>Aksi</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody>
                    {result.createdProperties.map((p) => (
                      <UiTableRow key={p.id}>
                        <UiTableCell style={{ fontWeight: 600, color: "var(--color-admin-accent)" }}>
                          {p.code}
                        </UiTableCell>
                        <UiTableCell>{p.address}</UiTableCell>
                        <UiTableCell>
                          <ButtonLink variant="secondary"
                            href={`/admin/properties/${p.id}`}
                            className="h-10 px-4"
                            style={{ padding: "4px 8px", fontSize: 12, textDecoration: "none" }}
                          >
                            Buka Detail ↗
                          </ButtonLink>
                        </UiTableCell>
                      </UiTableRow>
                    ))}
                  </UiTableBody>
                </UiTable>
              </div>
            </div>
          )}

          {/* Error List */}
          {result.errors.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#ef4444", marginBottom: 10 }}>
                Rincian Baris yang Gagal / Dilewati:
              </h3>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid #ef4444",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.05)",
                }}
              >
                <UiTable className="w-full text-sm">
                  <UiTableHeader>
                    <UiTableRow>
                      <UiTableHead>Baris ke-</UiTableHead>
                      <UiTableHead>Kode</UiTableHead>
                      <UiTableHead>Keterangan Error</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody>
                    {result.errors.map((e, idx) => (
                      <UiTableRow key={idx}>
                        <UiTableCell style={{ fontWeight: 600 }}>Baris #{e.row}</UiTableCell>
                        <UiTableCell>{e.code || "—"}</UiTableCell>
                        <UiTableCell style={{ color: "#ef4444" }}>{e.error}</UiTableCell>
                      </UiTableRow>
                    ))}
                  </UiTableBody>
                </UiTable>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <UiButton variant="outline" onClick={handleReset} className="h-10 px-4">
              <RefreshCw size={16} /> Import File Lain
            </UiButton>
            <ButtonLink variant="primary" href="/admin/properties" className="h-10 px-4">
              Selesai & Ke Daftar Properti
            </ButtonLink>
          </div>
        </UiCard>
      ) : (
        /* UPLOAD & PREVIEW VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Dropzone Card */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 24 }}>
            <div
              style={{
                border: "2px dashed var(--color-admin-border)",
                borderRadius: 12,
                padding: "36px 20px",
                textAlign: "center",
                backgroundColor: "var(--color-admin-bg)",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) handleFileChange(droppedFile);
              }}
              onClick={() => document.getElementById("csv-file-input")?.click()}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                }}
              />
              <UploadCloud
                size={48}
                style={{ color: "var(--color-admin-accent)", margin: "0 auto 12px" }}
              />
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-admin-text)" }}>
                {file ? file.name : "Klik untuk memilih file CSV atau seret ke sini"}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-admin-text-secondary)",
                  margin: "6px auto 0",
                  maxWidth: 420,
                }}
              >
                Gunakan template standar agar nama kolom sesuai. Format pemisah koma (`,`) atau titik koma (`;`) didukung otomatis.
              </p>
              {file && (
                <div
                  style={{
                    marginTop: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "var(--color-admin-card)",
                    border: "1px solid var(--color-admin-border)",
                    fontSize: 13,
                  }}
                >
                  <FileSpreadsheet size={16} />
                  <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </UiCard>

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    Tinjauan Data ({parsedRows.length} baris)
                  </h3>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-admin-text-secondary)",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <span>
                      Siap import: <strong>{validRowsCount}</strong>
                    </span>
                    {parsedRows.length - validRowsCount > 0 && (
                      <span style={{ color: "#ef4444" }}>
                        Kendala: <strong>{parsedRows.length - validRowsCount}</strong> baris
                      </span>
                    )}
                  </div>
                </div>

                {/* Listing status option */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 13, color: "var(--color-admin-text-secondary)" }}>
                    Status Listing Awal:
                  </label>
                  <select
                    className="admin-input"
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value as "DRAFT" | "ACTIVE")}
                    style={{ width: 140, padding: "6px 10px", fontSize: 13 }}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Aktif (Tayang)</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div
                style={{
                  maxHeight: 380,
                  overflow: "auto",
                  WebkitOverflowScrolling: "touch",
                  border: "1px solid var(--color-admin-border)",
                  borderRadius: 8,
                }}
              >
                <UiTable className="w-full text-sm">
                  <UiTableHeader>
                    <UiTableRow>
                      <UiTableHead>#</UiTableHead>
                      <UiTableHead>Kode</UiTableHead>
                      <UiTableHead>Tipe</UiTableHead>
                      <UiTableHead>Kecamatan / Kawasan</UiTableHead>
                      <UiTableHead>Alamat</UiTableHead>
                      <UiTableHead>LT / LB</UiTableHead>
                      <UiTableHead>Harga Penawaran</UiTableHead>
                      <UiTableHead>Owner</UiTableHead>
                      <UiTableHead>Validasi</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody>
                    {parsedRows.map((row, idx) => {
                      const issues = validateRow(row);
                      const isValid = issues.length === 0;

                      return (
                        <UiTableRow key={idx}>
                          <UiTableCell style={{ color: "var(--color-admin-text-muted)" }}>{idx + 1}</UiTableCell>
                          <UiTableCell style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                            {row.kode || <span style={{ color: "var(--color-admin-text-muted)" }}>Auto</span>}
                          </UiTableCell>
                          <UiTableCell>{row.tipe || "Rumah"}</UiTableCell>
                          <UiTableCell>
                            <div>{row.kecamatan || "—"}</div>
                            {row.kawasan && (
                              <div style={{ fontSize: 11, color: "var(--color-admin-accent)" }}>
                                ⭐ {row.kawasan}
                              </div>
                            )}
                          </UiTableCell>
                          <UiTableCell style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.alamat || "—"}
                          </UiTableCell>
                          <UiTableCell style={{ whiteSpace: "nowrap" }}>
                            {row.luas_tanah || "—"} / {row.luas_bangunan || "—"} m²
                          </UiTableCell>
                          <UiTableCell style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                            {row.harga_penawaran ? `Rp ${Number(row.harga_penawaran).toLocaleString("id-ID")}` : "—"}
                          </UiTableCell>
                          <UiTableCell style={{ whiteSpace: "nowrap" }}>
                            <div>{row.nama_owner || "—"}</div>
                            {row.telepon_owner && (
                              <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>
                                {row.telepon_owner}
                              </div>
                            )}
                          </UiTableCell>
                          <UiTableCell style={{ whiteSpace: "nowrap" }}>
                            {isValid ? (
                              <UiBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-transparent bg-muted text-muted-foreground" style={{ fontSize: 11 }}>
                                Valid
                              </UiBadge>
                            ) : (
                              <UiBadge
                                className="bg-red-500/10 text-red-700 dark:text-red-300 border-transparent bg-muted text-muted-foreground"
                                style={{ fontSize: 11 }}
                                title={issues.join(", ")}
                              >
                                {issues[0]}
                              </UiBadge>
                            )}
                          </UiTableCell>
                        </UiTableRow>
                      );
                    })}
                  </UiTableBody>
                </UiTable>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <UiButton variant="outline"
                  type="button"
                  onClick={handleReset}
                  className="h-10 px-4"
                  disabled={isProcessing}
                >
                  <Trash2 size={16} /> Bersihkan Data
                </UiButton>

                <UiButton variant="default"
                  type="button"
                  onClick={handleExecuteImport}
                  className="h-10 px-4"
                  disabled={isProcessing || parsedRows.length === 0}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px" }}
                >
                  <UploadCloud size={16} />
                  {isProcessing
                    ? "Sedang Memproses Import..."
                    : `Proses Import ${parsedRows.length} Properti`}
                </UiButton>
              </div>
            </UiCard>
          )}
        </div>
      )}
    </div>
  );
}
