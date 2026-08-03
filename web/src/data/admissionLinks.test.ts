import { describe, expect, it } from "vitest";
import {
  CHUNGBUK_GUIDELINE_AUDITS,
  TRANSFER_ADMISSION_LINKS,
} from "./admissionLinks";

describe("TRANSFER_ADMISSION_LINKS", () => {
  it("contains one official HTTPS link for each of the nine universities", () => {
    expect(TRANSFER_ADMISSION_LINKS).toHaveLength(9);
    expect(new Set(TRANSFER_ADMISSION_LINKS.map(({ university }) => university)).size).toBe(9);

    for (const { url } of TRANSFER_ADMISSION_LINKS) {
      expect(new URL(url).protocol).toBe("https:");
    }
  });

  it("links every audited Chungbuk year to an official PDF preview", () => {
    expect(CHUNGBUK_GUIDELINE_AUDITS.map(({ year }) => year)).toEqual([
      "2024",
      "2025",
      "2026",
    ]);

    for (const audit of CHUNGBUK_GUIDELINE_AUDITS) {
      const url = new URL(audit.pdfUrl);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("ipsi.chungbuk.ac.kr");
      expect(audit.sourcePages).not.toBe("");
      expect(audit.corrections.length).toBeGreaterThan(0);
    }
  });
});
