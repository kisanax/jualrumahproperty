import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agreementErrorResponse, clientIpFrom } from "@/lib/agreement-api";
import { hashAccessToken } from "@/lib/agreement-hash";
import { signAgreement } from "@/lib/agreement-service";
import { getStorage } from "@/lib/storage";

// =============================================================================
// POST /api/agreements/public/[token]/sign — slot tanda tangan OWNER (publik)
//
// Multipart/form-data:
//   method    = DRAWN | TYPED
//   consent   = "true" (wajib)
//   signerName = nama lengkap (harus cocok dengan nama owner — konfirmasi)
//   signature  = file PNG (wajib untuk DRAWN)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const slot = await prisma.agreementSignature.findUnique({
      where: { accessTokenHash: hashAccessToken(token) },
      include: { agreement: true },
    });

    if (!slot || slot.signerRole !== "OWNER" || !slot.agreement) {
      return NextResponse.json({ error: "Tautan tanda tangan tidak valid" }, { status: 404 });
    }
    if (slot.tokenUsedAt || slot.status === "SIGNED") {
      return NextResponse.json(
        { error: "Tautan ini sudah dipakai untuk menandatangani." },
        { status: 409 }
      );
    }
    if (slot.tokenExpiresAt && slot.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Tautan tanda tangan sudah kedaluwarsa. Hubungi broker Anda." },
        { status: 410 }
      );
    }

    const formData = await request.formData();
    const method = String(formData.get("method") || "");
    const consent = formData.get("consent") === "true";
    const signerName = String(formData.get("signerName") || "").trim();
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
    // Nama wajib cocok persis dengan data pemilik — itu pemeriksaan yang
    // sesungguhnya; tidak perlu syarat panjang minimum (nama sah bisa pendek).
    if (!signerName) {
      return NextResponse.json({ error: "Nama lengkap wajib diisi" }, { status: 400 });
    }
    if (
      slot.signerName &&
      signerName.toLowerCase() !== slot.signerName.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Nama tidak cocok dengan data pemilik pada perjanjian." },
        { status: 400 }
      );
    }

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
        `ttd-owner-${Date.now()}.png`,
        `agreements/${slot.agreementId}`,
        "image/png"
      );
      signatureImagePath = upload.filePath;
    }

    const result = await signAgreement(slot.agreementId, {
      signerRole: "OWNER",
      method,
      signatureImage,
      signatureImagePath,
      signerName,
      signerIp: clientIpFrom(request),
      signerUa: request.headers.get("user-agent"),
      consentAt: new Date(),
    });

    return NextResponse.json({
      finalized: result.finalized,
      status: result.agreement.status,
      finalHash: result.agreement.finalHash,
    });
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
