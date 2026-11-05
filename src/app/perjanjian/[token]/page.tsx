import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashAccessToken } from "@/lib/agreement-hash";
import { agreementInclude, parseSnapshot } from "@/lib/agreement-service";
import { AgreementSignerClient } from "./AgreementSignerClient";

export const dynamic = "force-dynamic";

// =============================================================================
// /perjanjian/[token] — kanal publik owner tanpa akun.
// Server component: validasi token, render surat + form tanda tangan.
// =============================================================================

export default async function PublicAgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const slot = await prisma.agreementSignature.findUnique({
    where: { accessTokenHash: hashAccessToken(token) },
    include: { agreement: { include: agreementInclude } },
  });

  const invalid = !slot || slot.signerRole !== "OWNER" || !slot.agreement;
  if (invalid) notFound();

  const agreement = slot.agreement;
  const snapshot = parseSnapshot(agreement.snapshot);

  const brokerSlot = agreement.signatures.find((s) => s.signerRole === "BROKER") ?? null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <p className="text-sm uppercase tracking-wide text-gray-500">
          Surat Perjanjian Pemasaran Properti
        </p>
        <h1 className="text-2xl font-bold">{agreement.agreementNumber}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ditandatangani oleh <span className="font-semibold">{slot.signerName}</span> selaku
          pemilik properti.
        </p>
      </header>

      <AgreementSignerClient
        token={token}
        status={agreement.status}
        slotStatus={slot.status}
        tokenUsed={Boolean(slot.tokenUsedAt)}
        tokenExpiresAt={slot.tokenExpiresAt ? slot.tokenExpiresAt.toISOString() : null}
        expectedSignerName={slot.signerName}
        snapshot={snapshot ? JSON.parse(JSON.stringify(snapshot)) : null}
        brokerSignature={
          brokerSlot
            ? {
                signerName: brokerSlot.signerName,
                status: brokerSlot.status,
                signedAt: brokerSlot.signedAt ? brokerSlot.signedAt.toISOString() : null,
              }
            : null
        }
      />
    </main>
  );
}
