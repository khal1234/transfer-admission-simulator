import { describe, expect, it } from "vitest";
import { formatCompetitionRatio, getCompetitionRatio } from "./competition";

describe("competition ratio", () => {
  it("keeps zero applicants as a valid 0:1 ratio", () => {
    const record = { 모집인원: 5, 지원인원: 0 };

    expect(getCompetitionRatio(record)).toBe(0);
    expect(formatCompetitionRatio(record)).toBe("0:1");
  });

  it("returns unavailable when a required count is missing or invalid", () => {
    expect(getCompetitionRatio({ 모집인원: null, 지원인원: 5 })).toBeNull();
    expect(getCompetitionRatio({ 모집인원: 0, 지원인원: 5 })).toBeNull();
    expect(getCompetitionRatio({ 모집인원: 5, 지원인원: null })).toBeNull();
    expect(getCompetitionRatio({ 모집인원: 5, 지원인원: -1 })).toBeNull();
  });

  it("rounds the computed ratio consistently for display", () => {
    const record = { 모집인원: 3, 지원인원: 10 };

    expect(getCompetitionRatio(record)).toBe(3.33);
    expect(formatCompetitionRatio(record)).toBe("3.3:1");
  });
});
