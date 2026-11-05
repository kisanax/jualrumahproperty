import { NextResponse } from "next/server";
import { AgreementError } from "./agreement-service";

// =============================================================================
// MAPPING ERROR → HTTP UNTUK API PERJANJIAN
// Kode error dari AgreementError dipetakan ke status HTTP yang tepat agar
// klien bisa membedakan "salah request" vs "konflik state" vs "token mati".
// =============================================================================

const STATUS_BY_CODE: Record<NonNullable<AgreementError["code"]>, number> = {
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  ALREADY_SIGNED: 409,
  TOKEN_INVALID: 403,
  TOKEN_EXPIRED: 410,
  MISSING_OWNER: 400,
  DUPLICATE_ACTIVE: 409,
};

/** Ubah error apa pun menjadi NextResponse yang aman untuk dikirim ke klien. */
export function agreementErrorResponse(error: unknown): NextResponse {
  if (error instanceof AgreementError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: STATUS_BY_CODE[error.code] ?? 400 }
    );
  }
  console.error("Agreement API error:", error);
  return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
}

/** Ambil IP klien dari header proxy (Vercel/Cloudflare) dengan fallback. */
export function clientIpFrom(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
