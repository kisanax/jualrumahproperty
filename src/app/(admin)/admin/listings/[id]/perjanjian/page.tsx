import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentOperationalActor } from "@/lib/api-auth";
import { combineListingFilters } from "@/lib/services/property-listing-access";
import {
  agreementInclude,
  findLiveAgreementForListing,
  parseSnapshot,
} from "@/lib/agreement-service";
import AgreementManageClient from "./AgreementManageClient";

export const dynamic = "force-dynamic";

// =============================================================================
// /admin/listings/[id]/perjanjian — kelola Surat Perjanjian Pemasaran untuk
// satu listing: terbitkan, tandatangani (slot broker), batalkan, lihat surat.
// =============================================================================

export default async function AgreementManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const operational = await getCurrentOperationalActor();
  if (!operational) notFound();
  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: combineListingFilters(operational.actor, { id }),
    include: {
      property: {
        include: {
          propertyOwners: { include: { owner: true }, orderBy: { isPrimary: "desc" } },
        },
      },
    },
  });
  if (!listing) notFound();

  const live = await findLiveAgreementForListing(listing.id);
  const agreement = live
    ? await prisma.marketingAgreement.findUnique({
        where: { id: live.id },
        include: agreementInclude,
      })
    : null;

  const snapshot = agreement ? parseSnapshot(agreement.snapshot) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Surat Perjanjian Pemasaran</p>
          <h1 className="text-2xl font-bold">
            {listing.title ?? listing.property.address}
          </h1>
        </div>
        <Link
          href={`/admin/listings/${listing.id}`}
          className="text-sm text-blue-600 underline"
        >
          ← Kembali ke listing
        </Link>
      </div>

      <AgreementManageClient
        listingId={listing.id}
        listingNumber={listing.listingNumber ?? "—"}
        askingPrice={listing.askingPrice === null ? null : Number(listing.askingPrice)}
        minimumPrice={listing.minimumPrice === null ? null : Number(listing.minimumPrice)}
        owners={listing.property.propertyOwners.map((po) => ({
          id: po.ownerId,
          name: po.owner.name,
          isPrimary: po.isPrimary,
        }))}
        agreement={
          agreement
            ? {
                id: agreement.id,
                agreementNumber: agreement.agreementNumber,
                status: agreement.status,
                exclusive: agreement.exclusive,
                commissionPercent:
                  agreement.commissionPercent === null
                    ? null
                    : Number(agreement.commissionPercent),
                commissionAmount:
                  agreement.commissionAmount === null
                    ? null
                    : Number(agreement.commissionAmount),
                commissionNotes: agreement.commissionNotes,
                startDate: agreement.startDate.toISOString(),
                endDate: agreement.endDate.toISOString(),
                signedPlace: agreement.signedPlace,
                issuedAt: agreement.issuedAt ? agreement.issuedAt.toISOString() : null,
                signedAt: agreement.signedAt ? agreement.signedAt.toISOString() : null,
                contentHash: agreement.contentHash,
                finalHash: agreement.finalHash,
                cancelReason: agreement.cancelReason,
                snapshot: snapshot ? JSON.parse(JSON.stringify(snapshot)) : null,
                signatures: agreement.signatures.map((s) => ({
                  role: s.signerRole,
                  signerName: s.signerName,
                  status: s.status,
                  method: s.method,
                  signedAt: s.signedAt ? s.signedAt.toISOString() : null,
                })),
              }
            : null
        }
      />
    </div>
  );
}
