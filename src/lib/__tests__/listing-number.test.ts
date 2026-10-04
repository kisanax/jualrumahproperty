import { describe, expect, it } from "vitest";
import { displayListingNumber } from "../listing-number";

describe("displayListingNumber", () => {
  it("preserves the ADR-002 check-digit separator", () => {
    expect(displayListingNumber("500001-3")).toBe("500001-3");
  });

  it("keeps legacy unformatted values readable", () => {
    expect(displayListingNumber("500001")).toBe("500001");
  });

  it("uses a placeholder for empty values", () => {
    expect(displayListingNumber(null)).toBe("—");
    expect(displayListingNumber("  ")).toBe("—");
  });
});
