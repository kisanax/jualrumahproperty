import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser } from "@/lib/api-auth";
import { agreementErrorResponse } from "@/lib/agreement-api";
import {
  agreementInclude,
  issueAgreement,
  findLiveAgreementForListing,
} from "@/lib/agreement-service";

// =============================================================================
// GET /api/agreements — daftar perjanjian (opsional ?listingId=)
// =============================================================================

export async function GET(request: NextRequest) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  const listingId = request.nextUrl.searchParams.get("listingId");

  const agreements = await prisma.marketingAgreement.findMany({
    where: listingId ? { listingId } : undefined,
    include: agreementInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Sertakan info live-agreement agar UI bisa menandai perjanjian yang masih
  // menghalangi penerbitan yang baru.
  const liveAgreement = listingId ? await findLiveAgreementForListing(listingId) : null;

  return NextResponse.json({ agreements, liveAgreementId: liveAgreement?.id ?? null });
}

// =============================================================================
// POST /api/agreements — terbitkan surat perjanjian baru
// =============================================================================

const issueSchema = z.object({
  listingId: z.string().uuid(),
  ownerId: z.string().uuid().nullish(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  exclusive: z.boolean(),
  commissionPercent: z.number().min(0).max(100).nullish(),
  commissionAmount: z.number().min(0).nullish(),
  commissionNotes: z.string().max(2000).nullish(),
  signedPlace: z.string().max(150).nullish(),
  templateId: z.string().uuid().nullish(),
});

export async function POST(request: NextRequest) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const parsed = issueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const { agreement, ownerSigningToken } = await issueAgreement({
      listingId: input.listingId,
      ownerId: input.ownerId ?? null,
      brokerUserId: guard.actor.userId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      exclusive: input.exclusive,
      commissionPercent: input.commissionPercent ?? null,
      commissionAmount: input.commissionAmount ?? null,
      commissionNotes: input.commissionNotes ?? null,
      signedPlace: input.signedPlace ?? null,
      templateId: input.templateId ?? null,
    });

    // Token owner dikirim SEKALI di sini — UI harus langsung menampilkannya
    // sebagai link tanda tangan (kanal publik, tanpa akun).
    return NextResponse.json(
      {
        agreement,
        ownerSigningUrl: `/perjanjian/${ownerSigningToken}`,
      },
      { status: 201 }
    );
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
