import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { agreementErrorResponse } from "@/lib/agreement-api";

// =============================================================================
// PATCH /api/agreements/templates/[id] — aktifkan satu versi template
// (versi lain dengan nama yang sama otomatis dinonaktifkan)
// =============================================================================

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;

    const updated = await prisma.$transaction(async (tx) => {
      const template = await tx.agreementTemplate.findUnique({ where: { id } });
      if (!template) return null;

      await tx.agreementTemplate.updateMany({
        where: { name: template.name, isActive: true },
        data: { isActive: false },
      });

      return tx.agreementTemplate.update({
        where: { id },
        data: { isActive: true },
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ template: updated });
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
