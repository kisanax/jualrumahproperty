"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label as UiLabel } from "@/components/ui/label";
import { ButtonLink } from "@/components/admin-ui/Button";

interface PropertyDetailActionsProps {
  propertyId: string;
  propertyCode: string;
}

export default function PropertyDetailActions({
  propertyId,
  propertyCode,
}: PropertyDetailActionsProps) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmCode.trim() !== propertyCode) {
      toast.error(`Ketik kode properti "${propertyCode}" dengan tepat untuk konfirmasi.`);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus properti");

      toast.success(`Properti ${propertyCode} berhasil dihapus`);
      setTimeout(() => {
        router.push("/admin/properties");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus properti";
      toast.error(msg);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="admin-detail-action-subgroup">
        <ButtonLink variant="secondary"
          href={`/admin/properties/${propertyId}/edit`}
          className="h-10 px-4"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
        >
          <Edit2 size={14} /> Edit Properti
        </ButtonLink>
        <UiButton variant="outline"
          type="button"
          onClick={() => {
            setConfirmCode("");
            setDeleteModalOpen(true);
          }}
          className="h-10 px-4"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#ef4444",
          }}
        >
          <Trash2 size={14} /> Hapus
        </UiButton>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-admin-text)" }}>
              <AlertTriangle size={20} style={{ color: "#ef4444" }} />
              Hapus Properti {propertyCode}?
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDelete}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "var(--color-admin-text-secondary)", lineHeight: 1.5, margin: 0 }}>
                Tindakan ini permanen. Semua data terkait properti ini (termasuk riwayat listing, foto, riwayat harga, dokumen, dan lead) akan ikut dihapus.
              </p>

              <div>
                <UiLabel htmlFor="delete-confirm-code" className="mb-[5px] text-[13px] font-medium text-[var(--color-admin-text-secondary)]">
                  Ketik <strong>{propertyCode}</strong> untuk konfirmasi:
                </UiLabel>
                <UiInput
                  id="delete-confirm-code"
                  type="text"
                  className="min-h-10 px-3 text-base md:text-sm"
                  placeholder={propertyCode}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <UiButton variant="outline"
                type="button"
                className="h-10 px-4"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Batal
              </UiButton>
              <UiButton variant="default"
                type="submit"
                className="h-10 px-4"
                disabled={isDeleting || confirmCode.trim() !== propertyCode}
                style={{
                  backgroundColor: "#ef4444",
                  borderColor: "#ef4444",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Trash2 size={14} />
                {isDeleting ? "Menghapus..." : "Ya, Hapus Properti"}
              </UiButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
