import { describe, expect, it } from "vitest";
import { TRANSFER_ADMISSION_LINKS } from "./admissionLinks";

describe("TRANSFER_ADMISSION_LINKS", () => {
  it("contains one official HTTPS link for each of the nine universities", () => {
    expect(TRANSFER_ADMISSION_LINKS).toHaveLength(9);
    expect(new Set(TRANSFER_ADMISSION_LINKS.map(({ university }) => university)).size).toBe(9);

    for (const { url } of TRANSFER_ADMISSION_LINKS) {
      expect(new URL(url).protocol).toBe("https:");
    }
  });
});
