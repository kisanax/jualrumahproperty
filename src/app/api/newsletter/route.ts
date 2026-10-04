import { NextResponse } from "next/server";

/**
 * Penerima langganan kabar footer.
 * Untuk saat ini hanya memvalidasi email; penyimpanan bisa disambungkan
 * ke tabel/layar email nanti.
 */
export async function POST(request: Request) {
  let email: string | undefined;
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim() : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  // TODO: simpan ke tabel subscriber / kirim ke layanan email.
  console.log(`[newsletter] subscribe: ${email}`);
  return NextResponse.json({ ok: true });
}
