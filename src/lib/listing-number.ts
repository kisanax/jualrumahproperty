/** Keep the ADR-002 separator visible; do not strip a valid check digit separator. */
export function displayListingNumber(value: string | null | undefined): string {
  return value?.trim() || "—";
}
