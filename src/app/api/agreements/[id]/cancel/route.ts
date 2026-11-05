import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOperationalUser } from "@/lib/api-auth";
import { agreementErrorResponse } from "@/lib/agreement-api";
import { cancelAgreement } from "@/lib/agreement-service";

// =============================================================================
// POST /api/agreements/[id]/cancel — batalkan perjanjian (staff)
// =============================================================================

const cancelSchema = z.object({
  reason: z.string().min(5, "Alasan minimal 5 karakter").max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Alasan pembatalan wajib diisi", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const agreement = await cancelAgreement(id, parsed.data.reason);
    return NextResponse.json({ agreement });
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
