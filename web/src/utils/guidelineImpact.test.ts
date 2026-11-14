import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import {
  getChungbuk2027EnglishScore,
  getChungbuk2027ToeicConverted,
  getGuidelineImpact,
} from "./guidelineImpact";

function chungbuk(overrides: Partial<DepartmentRecord> = {}): DepartmentRecord {
  return {
    대학명: "충북대학교",
    연도: "2026",
    학과: "경영학부",
    학과_원본명: "경영학부",
    모집인원: 15,
    지원인원: 60,
    합격인원: 15,
    최종합격_토익환산점수: 58.09,
    최종합격_토익원점수: 911.1,
    최종합격_학점환산점수: null,
    최종합격_학점원점수_100점만점: null,
    합격자기준: "최초",
    ...overrides,
  };
}

// 근거: 2027학년도 충북대 편입학전형 기본계획 14쪽(파일 쪽수) 환산표에서 읽은 값.
describe("충북대 2027학년도 TOEIC 환산", () => {
  it("환산표의 줄을 그대로 낸다", () => {
    const table: [number, number][] = [
      [990, 100], [985, 99], [900, 82], [850, 72], [800, 62], [795, 61],
      [790, 60], [780, 60], [775, 59], [765, 59], [630, 50], [505, 41], [495, 41],
      [490, 40], [380, 40], [375, 0], [0, 0],
    ];

    table.forEach(([toeic, converted]) => {
      expect(getChungbuk2027ToeicConverted(toeic), `TOEIC ${toeic}`).toBe(converted);
    });
  });

  it("영어 반영점수는 30 + 환산점수 × 0.3 이다", () => {
    expect(getChungbuk2027EnglishScore(990)).toBeCloseTo(60, 5);
    expect(getChungbuk2027EnglishScore(850)).toBeCloseTo(51.6, 5);
  });
});

// 2026-11-15 사용자 지적: «주의»가 무엇이 바뀌었는지만 말하고, 내 점수에 유리한지 불리한지를 말하지 않았다.
describe("점수 계산이 바뀌는 학과의 유불리", () => {
  it("합격 평균보다 TOEIC이 낮으면 불리해진다고 말한다", () => {
    const impact = getGuidelineImpact("충북대학교", "경영학부", 850, chungbuk());

    expect(impact?.tone).toBe("worse");
    expect(impact?.headline).toContain("불리해집니다");
    expect(impact?.headline).toContain("-1.59점 → 약 -3.6점");
    expect(impact?.detail).toContain("56.5점 → 51.6점");
  });

  it("합격 평균보다 TOEIC이 높으면 유리해진다고 말한다", () => {
    const impact = getGuidelineImpact("충북대학교", "경영학부", 970, chungbuk());

    expect(impact?.tone).toBe("better");
    expect(impact?.headline).toContain("유리해집니다");
  });

  it("TOEIC을 받지 않게 된 학과는 유불리 대신 지원할 수 없다는 것을 말한다", () => {
    const impact = getGuidelineImpact("충북대학교", "약학과", 990, chungbuk({ 학과: "약학과" }));

    expect(impact?.tone).toBe("blocked");
    expect(impact?.headline).toContain("지원할 수 없습니다");
  });

  it("합격 평균이 없으면 유불리를 지어내지 않는다", () => {
    const impact = getGuidelineImpact("충북대학교", "독일언어문화학과", 850, chungbuk({
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
    }));

    expect(impact?.tone).toBe("unknown");
    expect(impact?.headline).toContain("56.5점 → 51.6점");
  });

  it("식이 바뀌지 않은 대학에는 아무것도 내지 않는다", () => {
    expect(getGuidelineImpact("부산대학교", "기계공학부", 850, null)).toBeNull();
  });
});
