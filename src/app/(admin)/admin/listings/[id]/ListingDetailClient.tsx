"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Tag,
  TrendingUp,
  History,
  Edit2,
  CheckCircle,
  Save,
  DollarSign,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/media-url";
import { DetailHeader } from "@/components/admin-ui/DetailHeader";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Card as UiCard } from "@/components/ui/card";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { Input as UiInput } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label as UiLabel } from "@/components/ui/label";

interface ListingDetailProps {
  listing: {
    id: string;
    propertyId: string;
    title: string | null;
    description: string | null;
    status: string;
    askingPrice: number;
    minimumPrice: number | null;
    priceOnRequest: boolean;
    showFullAddress: boolean;
    publishedAt: string | null;
    archivedAt: string | null;
    internalNotes: string | null;
    createdAt: string;
    updatedAt: string;
    property: {
      id: string;
      code: string;
      type: string;
      address: string;
      landArea: number | null;
      buildingArea: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      certificateType: string | null;
      area: {
        name: string;
      };
      propertyMedia: {
        id: string;
        url?: string;
        filePath?: string;
        isPrimary: boolean;
      }[];
    };
    statusHistory: {
      id: string;
      fromStatus: string | null;
      toStatus: string;
      reason: string | null;
      createdAt: string;
      user: {
        name: string | null;
      } | null;
    }[];
    priceHistory: {
      id: string;
      oldPrice: number;
      newPrice: number;
      reason: string | null;
      createdAt: string;
      user: {
        name: string | null;
      } | null;
    }[];
    listingIntermediaries: {
      id: string;
      chainPosition: number;
      intermediary: {
        id: string;
        name: string;
        phone: string | null;
        company: string | null;
        trustLevel: string;
      };
    }[];
  };
  validTransitions: string[];
}

function getStatusBadgeClass(s: string) {
  const m: Record<string, string> = {
    DRAFT: "admin-badge-draft",
    PENDING_VERIFICATION: "admin-badge-pending",
    READY_TO_PUBLISH: "admin-badge-ready",
    ACTIVE: "admin-badge-active",
    IN_NEGOTIATION: "admin-badge-negotiation",
    SOLD: "admin-badge-sold",
    SUSPENDED: "admin-badge-suspended",
    WITHDRAWN: "admin-badge-withdrawn",
    EXPIRED: "admin-badge-expired",
    ARCHIVED: "admin-badge-archived",
  };
  return m[s] || "admin-badge-draft";
}

function getStatusLabel(s: string) {
  const m: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_VERIFICATION: "Verifikasi",
    READY_TO_PUBLISH: "Siap Publish",
    ACTIVE: "Aktif (Tayang)",
    IN_NEGOTIATION: "Dalam Negosiasi",
    SOLD: "Terjual",
    SUSPENDED: "Ditunda",
    WITHDRAWN: "Ditarik",
    EXPIRED: "Kedaluwarsa",
    ARCHIVED: "Diarsipkan",
  };
  return m[s] || s;
}

function formatRupiah(num: number): string {
  if (num >= 1e9) return `Rp ${(num / 1e9).toFixed(2).replace(/\.00$/, "")} Miliar`;
  if (num >= 1e6) return `Rp ${(num / 1e6).toFixed(0)} Juta`;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function ListingDetailClient({
  listing: initialListing,
  validTransitions: initialTransitions,
}: ListingDetailProps) {
  const [listing, setListing] = useState(initialListing);
  const [validTransitions, setValidTransitions] = useState(initialTransitions);

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusErrors, setStatusErrors] = useState<string[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Price Change Modal
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [newAskingPrice, setNewAskingPrice] = useState(listing.askingPrice.toString());
  const [newMinimumPrice, setNewMinimumPrice] = useState(
    listing.minimumPrice ? listing.minimumPrice.toString() : ""
  );
  const [priceReason, setPriceReason] = useState("");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Listing Details Edit Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [title, setTitle] = useState(listing.title || "");
  const [description, setDescription] = useState(listing.description || "");
  const [internalNotes, setInternalNotes] = useState(listing.internalNotes || "");
  const [priceOnRequest, setPriceOnRequest] = useState(listing.priceOnRequest);
  const [showFullAddress, setShowFullAddress] = useState(listing.showFullAddress);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  // Open Status Modal
  const handleOpenStatusModal = (nextStatus: string) => {
    setSelectedNewStatus(nextStatus);
    setStatusReason("");
    setStatusErrors([]);
    setStatusModalOpen(true);
  };

  // Submit Status Change
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewStatus) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedNewStatus,
          statusReason: statusReason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const details = Array.isArray(data.details)
          ? data.details.filter((item: unknown): item is string => typeof item === "string")
          : [];
        setStatusErrors(details);
        toast.error(data.error || "Gagal mengubah status", {
          description: details.length > 0 ? details.join(" • ") : undefined,
          duration: 7000,
        });
        return;
      }

      toast.success(`Status listing berhasil diubah ke ${getStatusLabel(selectedNewStatus)}`);
      // Refetch detail
      const getRes = await fetch(`/api/listings/${listing.id}`);
      const getData = await getRes.json();
      if (getRes.ok && getData.listing) {
        setListing({
          ...getData.listing,
          askingPrice: Number(getData.listing.askingPrice),
          minimumPrice: getData.listing.minimumPrice ? Number(getData.listing.minimumPrice) : null,
          statusHistory: getData.listing.statusHistory.map((s: { createdAt: string | Date }) => ({
            ...s,
            createdAt: new Date(s.createdAt).toISOString(),
          })),
          priceHistory: getData.listing.priceHistory.map((p: { oldPrice: number | string; newPrice: number | string; createdAt: string | Date }) => ({
            ...p,
            oldPrice: Number(p.oldPrice),
            newPrice: Number(p.newPrice),
            createdAt: new Date(p.createdAt).toISOString(),
          })),
        });
        setValidTransitions(getData.validTransitions || []);
      }
      setStatusModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status";
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit Price Change
  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(newAskingPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Harga penawaran harus berupa angka valid");
      return;
    }

    setIsUpdatingPrice(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          askingPrice: priceNum,
          minimumPrice: newMinimumPrice ? Number(newMinimumPrice) : null,
          priceChangeReason: priceReason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah harga");

      toast.success("Harga listing berhasil diperbarui");
      // Refetch detail
      const getRes = await fetch(`/api/listings/${listing.id}`);
      const getData = await getRes.json();
      if (getRes.ok && getData.listing) {
        setListing({
          ...getData.listing,
          askingPrice: Number(getData.listing.askingPrice),
          minimumPrice: getData.listing.minimumPrice ? Number(getData.listing.minimumPrice) : null,
          statusHistory: getData.listing.statusHistory.map((s: { createdAt: string | Date }) => ({
            ...s,
            createdAt: new Date(s.createdAt).toISOString(),
          })),
          priceHistory: getData.listing.priceHistory.map((p: { oldPrice: number | string; newPrice: number | string; createdAt: string | Date }) => ({
            ...p,
            oldPrice: Number(p.oldPrice),
            newPrice: Number(p.newPrice),
            createdAt: new Date(p.createdAt).toISOString(),
          })),
        });
      }
      setPriceModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah harga";
      toast.error(msg);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Submit Details Edit
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingDetails(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          description: description.trim() || null,
          internalNotes: internalNotes.trim() || null,
          priceOnRequest,
          showFullAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update detail");

      setListing((prev) => ({
        ...prev,
        title: data.listing.title,
        description: data.listing.description,
        internalNotes: data.listing.internalNotes,
        priceOnRequest: data.listing.priceOnRequest,
        showFullAddress: data.listing.showFullAddress,
      }));
      toast.success("Detail listing berhasil diperbarui");
      setDetailModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal update detail";
      toast.error(msg);
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <DetailHeader
        crumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Listing", href: "/admin/listings" },
          { label: listing.title || `Listing ${listing.property.code}` },
        ]}
        title={listing.title || `Listing ${listing.property.code}`}
        badge={
          <span className={`admin-badge ${getStatusBadgeClass(listing.status)}`}>
            {getStatusLabel(listing.status)}
          </span>
        }
        description={
          <>
            Kode Properti:{" "}
            <Link
              href={`/admin/properties/${listing.property.id}`}
              style={{
                color: "var(--workspace-primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {listing.property.code} ↗
            </Link>{" "}
            • {listing.property.area.name}
          </>
        }
        meta={
          <>
            <span>Dibuat {formatDate(listing.createdAt)}</span>
            <span>Diubah {formatDate(listing.updatedAt)}</span>
            {listing.publishedAt && <span>Dipublikasikan {formatDate(listing.publishedAt)}</span>}
          </>
        }
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <UiButton variant="outline"
              onClick={() => {
                setTitle(listing.title || "");
                setDescription(listing.description || "");
                setInternalNotes(listing.internalNotes || "");
                setPriceOnRequest(listing.priceOnRequest);
                setShowFullAddress(listing.showFullAddress);
                setDetailModalOpen(true);
              }}
              className="h-10 px-4"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Edit2 size={14} /> Edit Detail
            </UiButton>
            <UiButton variant="outline"
              onClick={() => {
                setNewAskingPrice(listing.askingPrice.toString());
                setNewMinimumPrice(
                  listing.minimumPrice ? listing.minimumPrice.toString() : ""
                );
                setPriceReason("");
                setPriceModalOpen(true);
              }}
              className="h-10 px-4"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <DollarSign size={14} /> Ubah Harga
            </UiButton>
          </div>
        }
      />

      {/* Workflow Status Action Bar */}
      <UiCard
        className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"
        style={{
          background: "var(--color-admin-bg)",
          borderColor: "var(--color-admin-border)",
          marginBottom: 24,
          padding: "16px 20px",
        }}
      >
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
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-admin-text-muted)", textTransform: "uppercase" }}>
              Aksi Status Alur Kerja (Workflow)
            </div>
            <div style={{ fontSize: 14, color: "var(--color-admin-text-secondary)", marginTop: 2 }}>
              Status saat ini: <strong>{getStatusLabel(listing.status)}</strong>. Pilih langkah berikutnya:
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {validTransitions.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--color-admin-text-muted)" }}>
                Listing ini berada pada status akhir ({getStatusLabel(listing.status)}).
              </span>
            ) : (
              validTransitions.map((next) => (
                <UiButton variant="outline"
                  key={next}
                  onClick={() => handleOpenStatusModal(next)}
                  className={` ${
 next === "ACTIVE"
 ? " "
 : next === "SOLD"
 ? " "
 : " "
 } h-10 px-4`}
                  style={{
                    fontSize: 13,
                    padding: "6px 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle size={14} /> Pindah ke: {getStatusLabel(next)}
                </UiButton>
              ))
            )}
          </div>
        </div>
      </UiCard>

      {/* Main 2-column Grid */}
      <div className="admin-detail-layout">
        {/* Left Column: Details & Histories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Pricing & Privacy Card */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
                <Tag size={16} style={{ display: "inline", marginRight: 6 }} />
                Informasi Harga & Privasi
              </UiCard>
            </UiCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Harga Penawaran (Asking Price)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-admin-accent)", marginTop: 4 }}>
                  {listing.priceOnRequest ? (
                    <span style={{ fontStyle: "italic", fontSize: 16, color: "var(--color-admin-text-secondary)" }}>
                      Price on Request
                    </span>
                  ) : (
                    formatRupiah(listing.askingPrice)
                  )}
                </div>
                {!listing.priceOnRequest && (
                  <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                    Nominal asli: Rp {listing.askingPrice.toLocaleString("id-ID")}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>Batas Minimum (Owner Nett/Bottom)</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                  {listing.minimumPrice ? formatRupiah(listing.minimumPrice) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                  Hanya terlihat oleh tim internal admin
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--color-admin-border)",
                display: "flex",
                gap: 24,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {listing.priceOnRequest ? <EyeOff size={16} style={{ color: "#eab308" }} /> : <Eye size={16} style={{ color: "#10b981" }} />}
                <span>
                  Price on Request: <strong>{listing.priceOnRequest ? "Aktif (Harga Disembunyikan)" : "Tidak (Harga Ditampilkan)"}</strong>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {listing.showFullAddress ? <Eye size={16} style={{ color: "#10b981" }} /> : <EyeOff size={16} style={{ color: "#eab308" }} />}
                <span>
                  Alamat Lengkap Publik: <strong>{listing.showFullAddress ? "Ditampilkan" : "Disamarkan"}</strong>
                </span>
              </div>
            </div>
          </UiCard>

          {/* Description & Internal Notes */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">Deskripsi & Catatan Listing</UiCard>
            </UiCard>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-admin-text)", whiteSpace: "pre-wrap" }}>
              {listing.description || "Belum ada deskripsi pemasaran publik."}
            </div>

            {listing.internalNotes && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "var(--color-admin-bg)",
                  borderLeft: "4px solid var(--color-admin-accent)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--color-admin-text)" }}>
                  Catatan Internal / Strategi Negosiasi:
                </div>
                <div style={{ color: "var(--color-admin-text-secondary)", whiteSpace: "pre-wrap" }}>
                  {listing.internalNotes}
                </div>
              </div>
            )}
          </UiCard>

          {/* Price Change History */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
                <TrendingUp size={16} style={{ display: "inline", marginRight: 6 }} />
                Riwayat Perubahan Harga ({listing.priceHistory.length})
              </UiCard>
            </UiCard>
            {listing.priceHistory.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)", padding: "12px 0" }}>
                Belum ada penyesuaian harga sejak listing dibuat.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {listing.priceHistory.map((ph) => {
                  const diff = ph.newPrice - ph.oldPrice;
                  const pct = ph.oldPrice > 0 ? ((diff / ph.oldPrice) * 100).toFixed(1) : "0";
                  const isDrop = diff < 0;

                  return (
                    <div
                      key={ph.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--color-admin-border)",
                        background: "var(--color-admin-bg)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {formatRupiah(ph.oldPrice)} → {formatRupiah(ph.newPrice)}
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              color: isDrop ? "#10b981" : "#ef4444",
                            }}
                          >
                            {diff > 0 ? `+${pct}%` : `${pct}%`}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>
                          {formatDate(ph.createdAt)}
                        </div>
                      </div>
                      {ph.reason && (
                        <div style={{ fontSize: 12, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
                          Alasan: {ph.reason}
                        </div>
                      )}
                      {ph.user?.name && (
                        <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                          Oleh: {ph.user.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </UiCard>

          {/* Status Change History */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
                <History size={16} style={{ display: "inline", marginRight: 6 }} />
                Riwayat Transisi Status ({listing.statusHistory.length})
              </UiCard>
            </UiCard>
            {listing.statusHistory.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)", padding: "12px 0" }}>
                Belum ada perubahan status tercatat.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {listing.statusHistory.map((sh) => (
                  <div
                    key={sh.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "var(--color-admin-bg)",
                      border: "1px solid var(--color-admin-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        <UiBadge className={` ${getStatusBadgeClass(sh.fromStatus || "DRAFT")} border-transparent bg-muted text-muted-foreground`} style={{ padding: "2px 6px", fontSize: 11 }}>
                          {sh.fromStatus ? getStatusLabel(sh.fromStatus) : "Awal (Pembuatan)"}
                        </UiBadge>
                        {" → "}
                        <UiBadge className={` ${getStatusBadgeClass(sh.toStatus)} border-transparent bg-muted text-muted-foreground`} style={{ padding: "2px 6px", fontSize: 11 }}>
                          {getStatusLabel(sh.toStatus)}
                        </UiBadge>
                      </div>
                      {sh.reason && (
                        <div style={{ fontSize: 12, color: "var(--color-admin-text-secondary)", marginTop: 4 }}>
                          Catatan: {sh.reason}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-admin-text-muted)", textAlign: "right" }}>
                      <div>{formatDate(sh.createdAt)}</div>
                      {sh.user?.name && <div>{sh.user.name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </UiCard>
        </div>

        {/* Right Column: Property & Intermediaries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Quick Property Summary */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
                <Building2 size={16} style={{ display: "inline", marginRight: 6 }} />
                Spesifikasi Properti
              </UiCard>
            </UiCard>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-admin-text-muted)" }}>Kode</span>
                <Link
                  href={`/admin/properties/${listing.property.id}`}
                  style={{ color: "var(--color-admin-accent)", fontWeight: 600, textDecoration: "none" }}
                >
                  {listing.property.code} ↗
                </Link>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-admin-text-muted)" }}>Wilayah</span>
                <span style={{ fontWeight: 500 }}>{listing.property.area.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-admin-text-muted)" }}>Luas Tanah / Bangunan</span>
                <span style={{ fontWeight: 500 }}>
                  {listing.property.landArea} m² {listing.property.buildingArea ? `/ ${listing.property.buildingArea} m²` : ""}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-admin-text-muted)" }}>Kamar Tidur / Mandi</span>
                <span style={{ fontWeight: 500 }}>
                  {listing.property.bedrooms ?? "—"} KT / {listing.property.bathrooms ?? "—"} KM
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-admin-text-muted)" }}>Sertifikat</span>
                <span style={{ fontWeight: 500 }}>{listing.property.certificateType}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-admin-text-muted)" }}>Alamat</span>
                <span style={{ fontWeight: 500, maxWidth: 200, textAlign: "right" }}>{listing.property.address}</span>
              </div>
            </div>

            {/* Photos preview */}
            {listing.property.propertyMedia.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-admin-border)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-admin-text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                  Foto ({listing.property.propertyMedia.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {listing.property.propertyMedia.slice(0, 3).map((m) => {
                    const photoUrl = getMediaUrl(m.url || m.filePath || "");

                    return (
                      <div
                        key={m.id}
                        style={{
                          position: "relative",
                          aspectRatio: "4/3",
                          borderRadius: 4,
                          overflow: "hidden",
                          backgroundColor: "#eee",
                        }}
                      >
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt="Property preview"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: "var(--color-admin-text-muted)", fontSize: 11 }}>
                            Foto belum tersedia
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </UiCard>

          {/* Intermediaries Chain */}
          <UiCard className="gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
            <UiCard className="-header gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
              <UiCard className="-title gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]">
                <UserCheck size={16} style={{ display: "inline", marginRight: 6 }} />
                Rantai Perantara ({listing.listingIntermediaries.length})
              </UiCard>
            </UiCard>
            {listing.listingIntermediaries.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-admin-text-muted)" }}>
                Listing langsung (Direct Owner, tanpa mediator).
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {listing.listingIntermediaries.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: "var(--color-admin-bg)",
                      border: "1px solid var(--color-admin-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {item.chainPosition}. {item.intermediary.name}
                      </div>
                      <UiBadge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-transparent bg-muted text-muted-foreground" style={{ fontSize: 11 }}>
                        {item.intermediary.trustLevel}
                      </UiBadge>
                    </div>
                    {item.intermediary.company && (
                      <div style={{ fontSize: 12, color: "var(--color-admin-text-secondary)", marginTop: 2 }}>
                        {item.intermediary.company}
                      </div>
                    )}
                    {item.intermediary.phone && (
                      <div style={{ fontSize: 12, color: "var(--color-admin-accent)", marginTop: 2 }}>
                        WA: {item.intermediary.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </UiCard>
        </div>
      </div>

      {/* Modal Change Status */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Ubah Status Listing</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleStatusSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <UiLabel className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Status Baru</UiLabel>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-admin-accent)" }}>
                  {getStatusLabel(selectedNewStatus)}
                </div>
              </div>

              {statusErrors.length > 0 && (
                <div
                  role="alert"
                  style={{
                    border: "1px solid rgba(220, 38, 38, 0.28)",
                    borderRadius: 8,
                    background: "rgba(254, 226, 226, 0.58)",
                    padding: "12px 14px",
                    color: "#991b1b",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Lengkapi data berikut sebelum dipublikasikan:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                    {statusErrors.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <UiLabel htmlFor="status-reason" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan / Alasan Perubahan Status</UiLabel>
                <UiTextarea
                  id="status-reason"
                  className="min-h-24 text-base md:text-sm"
                  rows={3}
                  placeholder="Misal: Sudah ditinjau dan dokumen lengkap, siap tayang..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <UiButton variant="outline"
                type="button"
                className="h-10 px-4"
                onClick={() => setStatusModalOpen(false)}
                disabled={isUpdatingStatus}
              >
                Batal
              </UiButton>
              <UiButton variant="default"
                type="submit"
                className="h-10 px-4"
                disabled={isUpdatingStatus}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Save size={16} /> {isUpdatingStatus ? "Menyimpan..." : "Konfirmasi Ubah Status"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Change Price */}
      <Dialog open={priceModalOpen} onOpenChange={setPriceModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Ubah Harga Listing</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePriceSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <UiLabel htmlFor="new-asking-price" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Harga Penawaran Baru (Rp) <span style={{ color: "#ef4444" }}>*</span></UiLabel>
                <UiInput
                  id="new-asking-price"
                  type="number"
                  className="min-h-10 px-3 text-base md:text-sm"
                  value={newAskingPrice}
                  onChange={(e) => setNewAskingPrice(e.target.value)}
                  required
                />
              </div>

              <div>
                <UiLabel htmlFor="new-minimum-price" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Batas Harga Minimum (Rp)</UiLabel>
                <UiInput
                  id="new-minimum-price"
                  type="number"
                  className="min-h-10 px-3 text-base md:text-sm"
                  placeholder="Opsional (Hanya internal)"
                  value={newMinimumPrice}
                  onChange={(e) => setNewMinimumPrice(e.target.value)}
                />
              </div>

              <div>
                <UiLabel htmlFor="price-reason" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Alasan Penyesuaian Harga</UiLabel>
                <UiInput
                  id="price-reason"
                  type="text"
                  className="min-h-10 px-3 text-base md:text-sm"
                  placeholder="Misal: Negosiasi dari owner turun Rp 500 jt..."
                  value={priceReason}
                  onChange={(e) => setPriceReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <UiButton variant="outline"
                type="button"
                className="h-10 px-4"
                onClick={() => setPriceModalOpen(false)}
                disabled={isUpdatingPrice}
              >
                Batal
              </UiButton>
              <UiButton variant="default"
                type="submit"
                className="h-10 px-4"
                disabled={isUpdatingPrice}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Save size={16} /> {isUpdatingPrice ? "Menyimpan..." : "Simpan Harga Baru"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Details */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Edit Detail & Pengaturan Listing</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDetailsSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <UiLabel htmlFor="listing-title" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Judul Listing</UiLabel>
                <UiInput
                  id="listing-title"
                  type="text"
                  className="min-h-10 px-3 text-base md:text-sm"
                  placeholder="Judul menarik untuk pembeli..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <UiLabel htmlFor="listing-description" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Deskripsi Pemasaran</UiLabel>
                <UiTextarea
                  id="listing-description"
                  className="min-h-24 text-base md:text-sm"
                  rows={4}
                  placeholder="Tulis selling points, lingkungan, akses jalan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <UiLabel htmlFor="listing-internal-notes" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan Internal Admin</UiLabel>
                <UiTextarea
                  id="listing-internal-notes"
                  className="min-h-24 text-base md:text-sm"
                  rows={2}
                  placeholder="Catatan rahasia tim..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={priceOnRequest}
                    onChange={(e) => setPriceOnRequest(e.target.checked)}
                  />
                  <span><strong>Price on Request:</strong> Sembunyikan harga nominal pada halaman publik.</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={showFullAddress}
                    onChange={(e) => setShowFullAddress(e.target.checked)}
                  />
                  <span><strong>Tampilkan Alamat Lengkap:</strong> Munculkan jalan dan nomor rumah di portal publik.</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <UiButton variant="outline"
                type="button"
                className="h-10 px-4"
                onClick={() => setDetailModalOpen(false)}
                disabled={isUpdatingDetails}
              >
                Batal
              </UiButton>
              <UiButton variant="default"
                type="submit"
                className="h-10 px-4"
                disabled={isUpdatingDetails}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Save size={16} /> {isUpdatingDetails ? "Menyimpan..." : "Simpan Perubahan"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
