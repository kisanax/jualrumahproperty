import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agreementErrorResponse } from "@/lib/agreement-api";
import { hashAccessToken } from "@/lib/agreement-hash";
import { agreementInclude, parseSnapshot } from "@/lib/agreement-service";

// =============================================================================
// GET /api/agreements/public/[token] — kanal publik owner (tanpa akun)
//
// Token akses hanya disimpan sebagai hash di DB; lookup dilakukan dengan
// meng-hash token dari URL. Token single-use & kedaluwarsa 14 hari.
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const slot = await prisma.agreementSignature.findUnique({
      where: { accessTokenHash: hashAccessToken(token) },
      include: { agreement: { include: agreementInclude } },
    });

    if (!slot || slot.signerRole !== "OWNER") {
      return NextResponse.json({ error: "Tautan tanda tangan tidak valid" }, { status: 404 });
    }
    if (slot.tokenUsedAt) {
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

    const agreement = slot.agreement;
    if (!agreement) {
      return NextResponse.json({ error: "Perjanjian tidak ditemukan" }, { status: 404 });
    }
    if (agreement.status === "CANCELLED" || agreement.status === "EXPIRED") {
      return NextResponse.json(
        { error: `Perjanjian sudah ${agreement.status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    const snapshot = parseSnapshot(agreement.snapshot);
    if (!snapshot) {
      return NextResponse.json(
        { error: "Isi surat belum tersedia — perjanjian belum diterbitkan." },
        { status: 409 }
      );
    }

    // Respons publik: hanya data yang dibutuhkan untuk membaca & menandatangani.
    return NextResponse.json({
      agreementNumber: agreement.agreementNumber,
      issuedAt: agreement.issuedAt?.toISOString() ?? null,
      status: agreement.status,
      expiresAt: slot.tokenExpiresAt?.toISOString() ?? null,
      letter: snapshot.letter,
      period: snapshot.period,
      commercial: snapshot.commercial,
      parties: snapshot.parties,
      ownerSlot: {
        signerName: slot.signerName,
        status: slot.status,
      },
      brokerSlot: agreement.signatures.find((s) => s.signerRole === "BROKER")
        ? {
            signerName: agreement.signatures.find((s) => s.signerRole === "BROKER")!.signerName,
            status: agreement.signatures.find((s) => s.signerRole === "BROKER")!.status,
          }
        : null,
    });
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
