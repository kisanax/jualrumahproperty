import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/permissions";
import TemplateEditorClient from "./TemplateEditorClient";

export const dynamic = "force-dynamic";

// =============================================================================
// /admin/agreements/templates — editor Template Surat Perjanjian Pemasaran.
// Khusus Super Admin. Menyimpan perubahan SELALU membuat versi baru; versi
// lama tidak pernah diedit agar surat terbit lama tetap bisa direproduksi.
// =============================================================================

export default async function AgreementTemplatesPage() {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.platformRole)) notFound();

  const templates = await prisma.agreementTemplate.findMany({
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <p className="text-sm uppercase tracking-wide text-gray-500">Pengaturan</p>
        <h1 className="text-2xl font-bold">Template Surat Perjanjian</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pasal-pasal di sini menjadi isi surat saat perjanjian diterbitkan. Menyimpan
          perubahan selalu membuat <strong>versi baru</strong> — surat yang sudah diterbitkan
          tidak terpengaruh.
        </p>
      </header>

      <TemplateEditorClient
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          version: t.version,
          isActive: t.isActive,
          headerTitle: t.headerTitle,
          opening: t.opening,
          body: t.body as { title: string; paragraphs: string[] }[],
          closing: t.closing,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
