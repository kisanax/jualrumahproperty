import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { agreementErrorResponse } from "@/lib/agreement-api";
import { AGREEMENT_PLACEHOLDERS } from "@/lib/agreement-template";

// =============================================================================
// GET  /api/agreements/templates — semua versi template (Super Admin)
// POST /api/agreements/templates — simpan draf sebagai VERSI BARU
//
// Prinsip: versi lama TIDAK pernah diedit. Menyimpan perubahan selalu
// membuat versi baru (version = max+1) dan mengaktifkannya, sehingga surat
// yang sudah diterbitkan tetap bisa direproduksi dari versi lamanya.
// =============================================================================

const passageSchema = z.object({
  title: z.string().max(255),
  paragraphs: z.array(z.string().max(5000)).min(1, "Pasal minimal punya satu paragraf"),
});

const saveSchema = z.object({
  name: z.string().min(3).max(150),
  headerTitle: z.string().min(3).max(255),
  opening: z.string().min(10).max(10000),
  body: z.array(passageSchema).min(1, "Minimal satu pasal"),
  closing: z.string().min(10).max(10000),
});

/** Ambil semua key placeholder {{...}} dari teks template. */
function extractPlaceholderKeys(text: string): string[] {
  const keys: string[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) keys.push(match[1]);
  return keys;
}

export async function GET() {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  const templates = await prisma.agreementTemplate.findMany({
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });

  return NextResponse.json({ templates, placeholders: AGREEMENT_PLACEHOLDERS });
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (guard.error) return guard.error;

  try {
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data template tidak valid", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Validasi placeholder: semua {{key}} harus ada di katalog agar surat
    // yang diterbitkan tidak pernah bolong karena salah ketik.
    const known = new Set(AGREEMENT_PLACEHOLDERS.map((p) => p.key));
    const texts = [
      input.headerTitle,
      input.opening,
      input.closing,
      ...input.body.flatMap((p) => p.paragraphs),
    ];
    const unknown = [...new Set(texts.flatMap(extractPlaceholderKeys))].filter(
      (k) => !known.has(k)
    );
    if (unknown.length > 0) {
      return NextResponse.json(
        {
          error: `Placeholder tidak dikenal: ${unknown.map((k) => `{{${k}}}`).join(", ")}`,
          unknown,
        },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const latest = await tx.agreementTemplate.findFirst({
        where: { name: input.name },
        orderBy: { version: "desc" },
      });

      // Nonaktifkan semua versi lama dengan nama yang sama.
      await tx.agreementTemplate.updateMany({
        where: { name: input.name, isActive: true },
        data: { isActive: false },
      });

      return tx.agreementTemplate.create({
        data: {
          name: input.name,
          version: (latest?.version ?? 0) + 1,
          isActive: true,
          headerTitle: input.headerTitle,
          opening: input.opening,
          body: input.body,
          closing: input.closing,
          placeholders: AGREEMENT_PLACEHOLDERS,
        },
      });
    });

    return NextResponse.json({ template: created }, { status: 201 });
  } catch (error) {
    return agreementErrorResponse(error);
  }
}
