import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser } from "@/lib/api-auth";
import { agreementErrorResponse, clientIpFrom } from "@/lib/agreement-api";
import { signAgreement } from "@/lib/agreement-service";
import { getStorage } from "@/lib/storage";

// =============================================================================
// POST /api/agreements/[id]/sign — slot tanda tangan BROKER (staff)
//
// Multipart/form-data:
//   method  = DRAWN | TYPED
//   consent = "true" (wajib — persetujuan dicentang)
//   signature = file PNG (wajib untuk DRAWN, abaikan untuk TYPED)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const agreement = await prisma.marketingAgreement.findUnique({
      where: { id },
      select: { brokerUserId: true },
    });
    if (!agreement) {
      return NextResponse.json({ error: "Perjanjian tidak ditemukan" }, { status: 404 });
    }

    // Hanya broker yang menerbitkan (atau Super Admin / Support) yang boleh
    // menandatangani slot BROKER.
    const isStaffRole = guard.actor.role === "SUPER_ADMIN" || guard.actor.role === "SUPPORT";
    if (agreement.brokerUserId !== guard.actor.userId && !isStaffRole) {
      return NextResponse.json(
        { error: "Hanya broker pada perjanjian ini yang bisa menandatangani." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const method = String(formData.get("method") || "");
    const consent = formData.get("consent") === "true";
    const file = formData.get("signature");

    if (method !== "DRAWN" && method !== "TYPED") {
      return NextResponse.json({ error: "Metode tanda tangan tidak valid" }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json(
        { error: "Persetujuan wajib dicentang sebelum menandatangani." },
        { status: 400 }
      );
    }

    // Nama penanda tangan diambil dari akun yang terautentikasi — bukan dari
    // input klien, agar bukti tanda tangan tidak bisa dipalsukan.
    const signer = await prisma.user.findUnique({
      where: { id: guard.actor.userId },
      select: { name: true, email: true },
    });

    let signatureImage: Buffer | null = null;
    let signatureImagePath: string | null = null;

    if (method === "DRAWN") {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Gambar tanda tangan wajib untuk metode gambar." },
          { status: 400 }
        );
      }
      if (file.type !== "image/png") {
        return NextResponse.json({ error: "Format gambar harus PNG" }, { status: 400 });
      }
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran gambar maksimal 2MB" }, { status: 400 });
      }

      signatureImage = Buffer.from(await file.arrayBuffer());
      const storage = getStorage();
      const upload = await storage.upload(
        signatureImage,
        `ttd-broker-${Date.now()}.png`,
        `agreements/${id}`,
        "image/png"
      );
      signatureImagePath = upload.filePath;
    }

    const result = await signAgreement(id, {
      signerRole: "BROKER",
      method,
      signatureImage,
      signatureImagePath,
      signerName: signer?.name ?? signer?.email ?? "Broker",
      signerIp: clientIpFrom(request),
      signerUa: request.headers.get("user-agent"),
      consentAt: new Date(),
    });

    return NextResponse.json({
      agreement: result.agreement,
      finalized: result.finalized,
    });
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
