import type { AgreementSnapshot } from "@/lib/agreement-service";

// =============================================================================
// AGREEMENT LETTER VIEW — render isi surat dari snapshot yang sudah di-freeze.
// Dipakai bersama oleh halaman publik (owner) dan halaman staf.
// Komponen ini TIDAK boleh mengubah teks — yang ditampilkan persis snapshot.
// =============================================================================

export type LetterSignatureInfo = {
  role: "BROKER" | "OWNER";
  signerName: string;
  status: string;
  method?: string | null;
  signedAt?: string | null;
};

export function AgreementLetter({
  headerTitle,
  opening,
  body,
  closing,
  signatureInfo,
}: {
  headerTitle: string;
  opening: string;
  body: { title: string; paragraphs: string[] }[];
  closing: string;
  signatureInfo?: LetterSignatureInfo[];
}) {
  const signed = (role: "BROKER" | "OWNER") =>
    signatureInfo?.find((s) => s.role === role && s.status === "SIGNED");

  return (
    <article
      id="surat-perjanjian"
      className="agreement-letter mx-auto max-w-3xl bg-white p-8 text-gray-900 shadow-sm ring-1 ring-gray-200 print:shadow-none print:ring-0"
    >
      <h1 className="text-center text-lg font-bold uppercase tracking-wide">
        {headerTitle}
      </h1>
      <p className="mt-6 leading-relaxed">{opening}</p>

      {body.map((passage, i) => (
        <section key={i} className="mt-5">
          {passage.title ? (
            <h2 className="text-sm font-bold uppercase">{passage.title}</h2>
          ) : null}
          {passage.paragraphs.map((p, j) => (
            <p key={j} className="mt-2 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}

      <p className="mt-5 leading-relaxed">{closing}</p>

      {/* Blok tanda tangan — dua kolom: PIHAK PERTAMA (owner) & PIHAK KEDUA (broker) */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p>PIHAK PERTAMA</p>
          <div className="mt-14 border-t border-gray-800 pt-1">
            <p className="font-semibold">{signed("OWNER")?.signerName ?? "(belum ditandatangani)"}</p>
            {signed("OWNER") ? (
              <p className="text-xs text-gray-500">
                Ditandatangani elektronik
                {signed("OWNER")!.signedAt
                  ? ` · ${new Date(signed("OWNER")!.signedAt!).toLocaleString("id-ID")}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
        <div>
          <p className="text-right">PIHAK KEDUA</p>
          <div className="mt-14 border-t border-gray-800 pt-1 text-right">
            <p className="font-semibold">{signed("BROKER")?.signerName ?? "(belum ditandatangani)"}</p>
            {signed("BROKER") ? (
              <p className="text-xs text-gray-500">
                Ditandatangani elektronik
                {signed("BROKER")!.signedAt
                  ? ` · ${new Date(signed("BROKER")!.signedAt!).toLocaleString("id-ID")}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Bangun props AgreementLetter dari snapshot + info tanda tangan. */
export function letterPropsFromSnapshot(
  snapshot: AgreementSnapshot,
  signatureInfo?: LetterSignatureInfo[]
) {
  return {
    headerTitle: snapshot.letter.headerTitle,
    opening: snapshot.letter.opening,
    body: snapshot.letter.body,
    closing: snapshot.letter.closing,
    signatureInfo,
  };
}
