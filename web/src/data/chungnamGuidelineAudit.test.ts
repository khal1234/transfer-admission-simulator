import { describe, expect, it } from "vitest";
import { CHUNGNAM_GUIDELINE_AUDITS } from "./chungnamGuidelineAudit";

describe("CHUNGNAM_GUIDELINE_AUDITS", () => {
  it("links one local official PDF and an audit trail for each supported year", () => {
    expect(CHUNGNAM_GUIDELINE_AUDITS.map(({ year }) => year))
      .toEqual(["2026", "2025", "2024"]);

    for (const audit of CHUNGNAM_GUIDELINE_AUDITS) {
      expect(audit.pdfUrl).toMatch(/^\/guides\/chungnam\/.+\.pdf$/);
      expect(new URL(audit.officialPostUrl).hostname).toBe("ipsi.cnu.ac.kr");
      expect(audit.issues.length).toBeGreaterThan(0);
      for (const issue of audit.issues) {
        expect(issue.stored.trim()).not.toBe("");
        expect(issue.official.trim()).not.toBe("");
        expect(issue.resolution.trim()).not.toBe("");
      }
    }
  });
});
