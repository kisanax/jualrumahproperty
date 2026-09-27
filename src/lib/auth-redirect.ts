const PUBLIC_RETURN_PATHS = ["/akun", "/favorit", "/jual", "/properti", "/agents", "/daftar-broker"] as const;

export function safeReturnTo(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;

  try {
    const url = new URL(value, "https://jualrumahproperty.local");
    if (url.origin !== "https://jualrumahproperty.local") return null;
    const allowed = PUBLIC_RETURN_PATHS.some(
      (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
    );
    return allowed ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}
