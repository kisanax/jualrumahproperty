"use client";

import { useState } from "react";
import {
  Phone,
  Clock,
  ArrowRight,
  Filter,
  Eye,
  History,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { LeadStage } from "@prisma/client";
import { Card as UiCard } from "@/components/ui/card";
import { Button as UiButton } from "@/components/ui/button";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label as UiLabel } from "@/components/ui/label";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface PropertySummary {
  code: string;
  type: string;
  area: { name: string };
  kawasan: { name: string } | null;
}

interface ListingSummary {
  id: string;
  askingPrice: number | string | { toNumber?: () => number };
  priceOnRequest: boolean;
  property: PropertySummary;
}

interface Activity {
  id: string;
  type: string;
  fromStage: string | null;
  toStage: string | null;
  summary: string | null;
  createdAt: string | Date;
}

export interface KanbanLead {
  id: string;
  customerId: string;
  listingId: string;
  currentStage: LeadStage;
  source: string;
  message: string | null;
  notes: string | null;
  priority: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  customer: Customer;
  listing: ListingSummary;
  activities: Activity[];
  _count: {
    viewingSchedules: number;
    offers: number;
  };
}

interface KanbanBoardProps {
  initialLeads: KanbanLead[];
  listings: { id: string; code: string; title: string | null }[];
}

const COLUMNS: { stage: LeadStage; label: string; color: string; badgeCls: string }[] = [
  { stage: "NEW", label: "Baru", color: "var(--color-status-pending)", badgeCls: "admin-badge-pending" },
  { stage: "QUALIFIED", label: "Kualifikasi", color: "var(--color-status-ready)", badgeCls: "admin-badge-ready" },
  { stage: "VIEWING", label: "Survei", color: "var(--color-status-active)", badgeCls: "admin-badge-active" },
  { stage: "NEGOTIATING", label: "Negosiasi", color: "var(--color-status-negotiation)", badgeCls: "admin-badge-negotiation" },
  { stage: "WON", label: "Closing (Menang)", color: "var(--color-status-sold)", badgeCls: "admin-badge-sold" },
  { stage: "LOST", label: "Closing (Hilang)", color: "var(--color-status-suspended)", badgeCls: "admin-badge-suspended" },
];

function formatRupiah(amount: number | string | { toNumber?: () => number } | undefined): string {
  if (amount === undefined || amount === null) return "";
  let num: number;
  if (typeof amount === "object" && "toNumber" in amount && amount.toNumber) num = amount.toNumber();
  else num = Number(amount);
  if (isNaN(num)) return "";
  if (num >= 1e9) return `Rp ${(num / 1e9).toFixed(1).replace(/\.0$/, "")} M`;
  if (num >= 1e6) return `Rp ${(num / 1e6).toFixed(0)} Jt`;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function timeAgo(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffInHours < 1) return "Baru saja";
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} hari di stage ini`;
}

export default function KanbanBoard({ initialLeads, listings }: KanbanBoardProps) {
  const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
  const [selectedListingFilter, setSelectedListingFilter] = useState<string>("");
  const [activeLeadModal, setActiveLeadModal] = useState<KanbanLead | null>(null);
  const [movingLead, setMovingLead] = useState<{ lead: KanbanLead; targetStage: LeadStage } | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [activeMobileStage, setActiveMobileStage] = useState<LeadStage>("NEW");

  // Drag and Drop States
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const filteredLeads = selectedListingFilter
    ? leads.filter((l) => l.listingId === selectedListingFilter)
    : leads;

  // Direct Drag & Drop Handler with Optimistic UI Update
  const handleDirectStageDrop = async (leadId: string, targetStage: LeadStage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.currentStage === targetStage) return;

    const previousStage = lead.currentStage;
    const targetCol = COLUMNS.find((c) => c.stage === targetStage);

    // 1. Optimistic Update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, currentStage: targetStage, updatedAt: new Date() } : l
      )
    );

    toast.info(`Memindahkan ${lead.customer.name} ke ${targetCol?.label || targetStage}...`);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStage: targetStage,
          activityNote: `Drag & drop ke stage ${targetCol?.label || targetStage}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal update stage di server");
      }

      toast.success(
        `Lead ${lead.customer.name} berhasil dipindahkan ke "${targetCol?.label || targetStage}"`
      );
    } catch {
      // Revert optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, currentStage: previousStage } : l))
      );
      toast.error("Gagal memindahkan stage lead. Perubahan dibatalkan.");
    }
  };

  const handleStageMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingLead) return;

    setIsSubmittingMove(true);
    try {
      const res = await fetch(`/api/leads/${movingLead.lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStage: movingLead.targetStage,
          activityNote: transitionNote || undefined,
        }),
      });

      if (!res.ok) throw new Error("Gagal memindahkan stage lead");

      await res.json();

      setLeads((prev) =>
        prev.map((l) => (l.id === movingLead.lead.id ? { ...l, currentStage: movingLead.targetStage } : l))
      );
      setActiveMobileStage(movingLead.targetStage);

      toast.success(
        `Lead ${movingLead.lead.customer.name} dipindahkan ke "${
          COLUMNS.find((c) => c.stage === movingLead.targetStage)?.label
        }"`
      );

      setMovingLead(null);
      setTransitionNote("");
    } catch {
      toast.error("Gagal memperbarui stage lead");
    } finally {
      setIsSubmittingMove(false);
    }
  };

  const getCleanPhone = (phone: string) => {
    const p = phone.replace(/\D/g, "");
    if (p.startsWith("0")) return `62${p.substring(1)}`;
    return p;
  };

  return (
    <div>

      {/* Filter & Toolbar */}
      <UiCard
        className="admin-kanban-toolbar gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 18px",
          marginBottom: 20,
        }}
      >
        <div className="admin-kanban-filter-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Filter size={18} style={{ color: "var(--color-admin-accent)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filter Listing:</span>
          <select
            className="admin-input admin-kanban-filter-select"
            style={{ width: 280, padding: "6px 12px", fontSize: 13 }}
            value={selectedListingFilter}
            onChange={(e) => setSelectedListingFilter(e.target.value)}
          >
            <option value="">Semua Listing ({leads.length} Leads)</option>
            {listings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} {item.title ? `— ${item.title.substring(0, 30)}...` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 13, color: "var(--color-admin-text-secondary)" }}>
          Menampilkan <strong style={{ color: "var(--color-admin-text)" }}>{filteredLeads.length}</strong> calon pembeli
        </div>
      </UiCard>

      <div className="admin-kanban-stage-tabs" role="tablist" aria-label="Tahap lead">
        {COLUMNS.map((col) => {
          const count = filteredLeads.filter((lead) => lead.currentStage === col.stage).length;
          return (
            <button
              key={col.stage}
              type="button"
              role="tab"
              aria-selected={activeMobileStage === col.stage}
              className={`admin-kanban-stage-tab ${activeMobileStage === col.stage ? "active" : ""}`}
              onClick={() => setActiveMobileStage(col.stage)}
            >
              <span className="admin-kanban-stage-dot" style={{ backgroundColor: col.color }} />
              {col.label}
              <span className="admin-kanban-stage-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns Grid — Horizontal scrolling pipeline */}
      <div
        className="admin-kanban-board"
        style={{
          display: "flex",
          gap: 16,
          alignItems: "start",
          overflowX: "auto",
          paddingBottom: 24,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {COLUMNS.map((col) => {
          const columnLeads = filteredLeads.filter((l) => l.currentStage === col.stage);
          const isDragOver = dragOverStage === col.stage;

          return (
            <div
              key={col.stage}
              className={`admin-kanban-column ${activeMobileStage === col.stage ? "mobile-active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverStage !== col.stage) {
                  setDragOverStage(col.stage);
                }
              }}
              onDragLeave={(e) => {
                // Only clear if left this column container
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStage((current) => (current === col.stage ? null : current));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;
                if (leadId) {
                  handleDirectStageDrop(leadId, col.stage);
                }
              }}
              style={{
                flex: "0 0 300px",
                minWidth: 280,
                backgroundColor: isDragOver
                  ? "rgba(234, 88, 12, 0.04)"
                  : "var(--color-admin-surface)",
                borderRadius: 12,
                border: isDragOver
                  ? "2px dashed var(--color-admin-accent)"
                  : "1px solid var(--color-admin-border)",
                display: "flex",
                flexDirection: "column",
                minHeight: 480,
                transition: "background-color 0.15s ease, border-color 0.15s ease",
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--color-admin-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: col.color,
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{col.label}</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    backgroundColor: "var(--color-admin-bg)",
                    color: "var(--color-admin-text-secondary)",
                  }}
                >
                  {columnLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  flex: 1,
                }}
              >
                {/* Drop placeholder indicator when dragged over */}
                {isDragOver && draggedLeadId && (
                  <div
                    style={{
                      border: "2px dashed var(--color-admin-accent)",
                      borderRadius: 10,
                      padding: "14px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--color-admin-accent)",
                      fontWeight: 600,
                      backgroundColor: "rgba(234, 88, 12, 0.08)",
                      animation: "pulse 1.5s infinite",
                    }}
                  >
                    + Lepaskan untuk pindah ke {col.label}
                  </div>
                )}

                {columnLeads.length === 0 && !isDragOver ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "36px 12px",
                      color: "var(--color-admin-text-muted)",
                      fontSize: 13,
                    }}
                  >
                    Tidak ada lead
                  </div>
                ) : (
                  columnLeads.map((lead) => {
                    const isBeingDragged = draggedLeadId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", lead.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedLeadId(lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggedLeadId(null);
                          setDragOverStage(null);
                        }}
                        style={{
                          backgroundColor: "var(--color-admin-bg)",
                          border: isBeingDragged
                            ? "1px dashed var(--color-admin-accent)"
                            : "1px solid var(--color-admin-border)",
                          borderRadius: 10,
                          padding: 14,
                          boxShadow: isBeingDragged
                            ? "none"
                            : "0 2px 4px rgba(0,0,0,0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          cursor: isBeingDragged ? "grabbing" : "grab",
                          opacity: isBeingDragged ? 0.35 : 1,
                          transform: isBeingDragged ? "scale(0.97)" : "none",
                          transition: "opacity 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
                        }}
                      >
                        {/* Customer Name & Actions */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <div
                              title="Tarik untuk memindahkan stage"
                              style={{
                                color: "var(--color-admin-text-muted)",
                                marginTop: 2,
                                flexShrink: 0,
                              }}
                            >
                              <GripVertical size={15} />
                            </div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 700 }}>
                                {lead.customer.name}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontSize: 12,
                                  color: "var(--color-admin-text-secondary)",
                                  marginTop: 2,
                                }}
                              >
                                <Phone size={12} />
                                <a
                                  href={`https://wa.me/${getCleanPhone(lead.customer.phone)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: "var(--color-admin-accent)",
                                    textDecoration: "none",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {lead.customer.phone}
                                </a>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveLeadModal(lead)}
                            title="Lihat riwayat lead"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--color-admin-text-secondary)",
                              cursor: "pointer",
                              padding: 4,
                            }}
                          >
                            <Eye size={16} />
                          </button>
                        </div>

                        {/* Listing Badge & Price */}
                        <div
                          style={{
                            fontSize: 12,
                            backgroundColor: "var(--color-admin-surface)",
                            padding: "6px 8px",
                            borderRadius: 6,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Link
                            href={`/admin/properties/${lead.listing.property.code}`}
                            style={{
                              color: "var(--color-admin-accent)",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.listing.property.code}
                          </Link>
                          <span style={{ color: "var(--color-admin-text-muted)" }}>
                            {lead.listing.property.kawasan?.name || lead.listing.property.area.name}
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {lead.listing.priceOnRequest ? "On Request" : formatRupiah(lead.listing.askingPrice)}
                          </span>
                        </div>

                        {/* Message excerpt if exists */}
                        {lead.message && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-admin-text-secondary)",
                              fontStyle: "italic",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            &ldquo;{lead.message}&rdquo;
                          </div>
                        )}

                        {/* Time in Stage & Quick Stage Selector */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: "var(--color-admin-text-muted)",
                            paddingTop: 4,
                            borderTop: "1px dashed var(--color-admin-border)",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} /> {timeAgo(lead.updatedAt)}
                          </span>

                          {/* Accessible Move Stage Dropdown */}
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span style={{ fontSize: 11 }}>Pindah:</span>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setMovingLead({
                                    lead,
                                    targetStage: e.target.value as LeadStage,
                                  });
                                }
                              }}
                              style={{
                                background: "var(--color-admin-surface)",
                                color: "var(--color-admin-text)",
                                border: "1px solid var(--color-admin-border)",
                                borderRadius: 4,
                                fontSize: 11,
                                padding: "2px 4px",
                                cursor: "pointer",
                              }}
                            >
                              <option value="">&rarr;</option>
                              {COLUMNS.filter((c) => c.stage !== lead.currentStage).map((c) => (
                                <option key={c.stage} value={c.stage}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Pindah Stage dengan Catatan Aktivitas (Section 15.4) */}
      <Dialog open={!!movingLead} onOpenChange={(o) => { if (!o) setMovingLead(null); }}>
        <DialogContent className="sm:max-w-md">
          {movingLead && (
            <>
              <DialogHeader>
                <DialogTitle>Pindahkan Stage Lead</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleStageMoveSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontSize: 14, color: "var(--color-admin-text-secondary)" }}>
                    Pindahkan lead <strong>{movingLead.lead.customer.name}</strong> dari{" "}
                    <UiBadge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-transparent bg-muted text-muted-foreground">{movingLead.lead.currentStage}</UiBadge>{" "}
                    menuju{" "}
                    <UiBadge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-transparent bg-muted text-muted-foreground">{movingLead.targetStage}</UiBadge>
                  </p>

                  <div className="admin-input-group">
                    <UiLabel htmlFor="lead-transition-note" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">Catatan Aktivitas / Alasan (Opsional)</UiLabel>
                    <UiTextarea
                      id="lead-transition-note"
                      className="min-h-24 text-base md:text-sm"
                      placeholder="Contoh: Pembeli sudah dikontak, tertarik viewing hari Sabtu..."
                      value={transitionNote}
                      onChange={(e) => setTransitionNote(e.target.value)}
                      rows={3}
                    />
                    <div className="admin-input-hint" style={{ fontSize: 11, marginTop: 4 }}>
                      Catatan ini akan otomatis masuk ke timeline riwayat LeadActivity
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <UiButton
                    variant="outline"
                    type="button"
                    onClick={() => setMovingLead(null)}
                    className="h-10 px-4"
                    disabled={isSubmittingMove}
                  >
                    Batal
                  </UiButton>
                  <UiButton
                    variant="default"
                    type="submit"
                    disabled={isSubmittingMove}
                    className="h-10 px-4"
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <ArrowRight size={16} />
                    {isSubmittingMove ? "Menyimpan..." : "Konfirmasi Pindah"}
                  </UiButton>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Detail & Timeline Aktivitas */}
      <Dialog open={!!activeLeadModal} onOpenChange={(o) => { if (!o) setActiveLeadModal(null); }}>
        <DialogContent className="sm:max-w-xl">
          {activeLeadModal && (
            <>
              <DialogHeader>
                <DialogTitle>{activeLeadModal.customer.name}</DialogTitle>
                <DialogDescription>
                  {activeLeadModal.customer.phone}{" "}
                  {activeLeadModal.customer.email ? `• ${activeLeadModal.customer.email}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Info Listing */}
              <div
                style={{
                  backgroundColor: "var(--color-admin-bg)",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <strong>Listing:</strong> {activeLeadModal.listing.property.code} —{" "}
                  {activeLeadModal.listing.property.kawasan?.name ||
                    activeLeadModal.listing.property.area.name}
                </div>
                {activeLeadModal.message && (
                  <div
                    style={{
                      marginTop: 6,
                      fontStyle: "italic",
                      color: "var(--color-admin-text-secondary)",
                    }}
                  >
                    &ldquo;{activeLeadModal.message}&rdquo;
                  </div>
                )}
              </div>

              {/* Timeline Aktivitas */}
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <History size={16} /> Riwayat & Timeline Aktivitas
                </div>

                {activeLeadModal.activities.length === 0 ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-admin-text-muted)",
                      padding: "12px 0",
                      fontStyle: "italic",
                    }}
                  >
                    Belum ada log aktivitas tercatat
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activeLeadModal.activities.map((act) => (
                      <div
                        key={act.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--color-admin-border)",
                          backgroundColor: "var(--color-admin-bg)",
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 12,
                              color: "var(--color-admin-accent)",
                            }}
                          >
                            {act.type}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--color-admin-text-muted)",
                            }}
                          >
                            {new Date(act.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {act.fromStage && act.toStage && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-admin-text-secondary)",
                              marginBottom: 4,
                            }}
                          >
                            Stage: {act.fromStage} &rarr; <strong>{act.toStage}</strong>
                          </div>
                        )}
                        {act.summary && <div>{act.summary}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <UiButton
                variant="outline"
                type="button"
                onClick={() => setActiveLeadModal(null)}
                className="h-10 px-4"
              >
                Tutup
              </UiButton>
            </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
