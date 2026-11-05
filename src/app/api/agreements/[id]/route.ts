import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperationalUser } from "@/lib/api-auth";
import { agreementErrorResponse } from "@/lib/agreement-api";
import { agreementInclude } from "@/lib/agreement-service";

// =============================================================================
// GET /api/agreements/[id] — detail satu perjanjian (staff)
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const agreement = await prisma.marketingAgreement.findUnique({
      where: { id },
      include: agreementInclude,
    });

    if (!agreement) {
      return NextResponse.json({ error: "Perjanjian tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ agreement });
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
