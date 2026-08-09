import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import {
  countDecisionCategories,
  getDataConfidence,
  type DecisionCandidate,
} from "./decisionSupport";

function record(overrides: Partial<DepartmentRecord> = {}): DepartmentRecord {
  return {
    대학명: "부산대학교",
    연도: "2026",
    학과: "기계공학부",
    학과_원본명: "기계공학부",
    모집인원: 5,
    지원인원: 25,
    합격인원: 5,
    최종합격_토익환산점수: 80,
    최종합격_토익원점수: 850,
    최종합격_학점환산점수: 18,
    최종합격_학점원점수_100점만점: 90,
    합격자기준: "최종",
    ...overrides,
  };
}

function candidate(
  diff: number | null,
  status: DecisionCandidate["score"]["status"] = "safe",
): DecisionCandidate {
  const referenceRecord = record();
  return {
    key: `${diff}`,
    target: { univ: referenceRecord.대학명, dept: `${diff}` },
    referenceRecord,
    score: {
      englishConv: 80,
      gpaConv: 18,
      myIndexSum: 98,
      acceptedIndexSum: diff === null ? null : 98 - diff,
      diff,
      status,
    },
    comparableYearCount: 3,
    dataConfidence: getDataConfidence(referenceRecord),
  };
}

describe("decision support", () => {
  it("counts every decision category", () => {
    expect(countDecisionCategories([
      candidate(1, "safe"),
      candidate(-1, "borderline"),
      candidate(-8, "risk"),
      candidate(null, "unknown"),
    ])).toEqual({ safe: 1, borderline: 1, risk: 1, unknown: 1 });
  });

  it("explains when an otherwise verified record still needs confirmation", () => {
    const confidence = getDataConfidence(record({ 합격자기준: "확인불가" }));

    expect(confidence.level).toBe("medium");
    expect(confidence.reasons.join(" ")).toContain("어느 평균인지");
  });

  it("marks records without a comparable accepted average as low confidence", () => {
    const confidence = getDataConfidence(record({
      합격인원: 0,
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
    }));

    expect(confidence.level).toBe("low");
    expect(confidence.reasons.join(" ")).toContain("합격 평균");
  });
});
