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

// 2026-11-15 사용자 지적: 충남대·충북대는 모든 학과에 «주의»가 붙었다. 판정은 대학이 공개한
// 환산점수끼리 견주므로, 원점수를 거꾸로 구했다는 것만으로는 판정의 믿음을 낮추지 않는다.
describe("근거 딱지는 판정을 흔드는 것만 센다", () => {
  it("합격 평균의 원점수를 환산표에서 거꾸로 구한 대학도 걸리는 것이 없으면 «근거 높음»이다", () => {
    const confidence = getDataConfidence(record({
      대학명: "충북대학교",
      학과: "경영학부",
      학과_원본명: "경영학부",
      최종합격_토익환산점수: 58.09,
      최종합격_토익원점수: 911.1,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
      합격자기준: "최초",
    }));

    expect(confidence.level).toBe("high");
    expect(confidence.reasons.join(" ")).not.toContain("역산");
  });

  it("요강 원문을 다시 대조하지 못한 해는 그대로 «확인 필요»다", () => {
    const confidence = getDataConfidence(record({ 연도: "2024" }));

    expect(confidence.level).toBe("medium");
    expect(confidence.reasons.join(" ")).toContain("모집요강 원문");
  });
});
