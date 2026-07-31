import { describe, expect, it } from "vitest";
import {
  analyzeScoreDeficit,
  calculateScore,
  calculateScoreDeficit,
  convertGpaTo100Scale,
  convertRawToConv,
} from "./converter";

const maxScoreCases = [
  ["강원대학교", "2024", 100, 75, 175],
  ["강원대학교", "2025", 100, 75, 175],
  ["강원대학교", "2026", 150, null, 150],
  ["경북대학교", "2024", 100, 50, 150],
  ["경북대학교", "2025", 100, 50, 150],
  ["경북대학교", "2026", 100, 50, 150],
  ["부경대학교", "2024", 200, 100, 300],
  ["부경대학교", "2025", 200, 100, 300],
  ["부경대학교", "2026", 200, 100, 300],
  ["부산대학교", "2024", 30, 30, 60],
  ["부산대학교", "2025", 30, 30, 60],
  ["부산대학교", "2026", 30, 30, 60],
  ["인천대학교", "2024", 120, null, 120],
  ["인천대학교", "2025", 120, null, 120],
  ["인천대학교", "2026", 120, null, 120],
  ["전남대학교", "2024", 400, 200, 600],
  ["전남대학교", "2025", 400, 200, 600],
  ["전남대학교", "2026", 400, 200, 600],
  ["전북대학교", "2024", 80, 60, 140],
  ["전북대학교", "2025", 80, 60, 140],
  ["전북대학교", "2026", 80, 60, 140],
  ["충남대학교", "2024", 50, 10, 60],
  ["충남대학교", "2025", 60, null, 60],
  ["충남대학교", "2026", 60, null, 60],
  ["충북대학교", "2024", 30, 30, 60],
  ["충북대학교", "2025", 30, 30, 60],
  ["충북대학교", "2026", 60, null, 60],
] as const;

const midpointScoreCases = [
  ["강원대학교", "2024", 495, 50, 50, 37.5, 87.5],
  ["강원대학교", "2026", 495, 50, 75, null, 75],
  ["경북대학교", "2026", 495, 50, 50, 40, 90],
  ["부경대학교", "2026", 495, 50, 100, 50, 150],
  ["부산대학교", "2026", 495, 50, 15, 15, 30],
  ["인천대학교", "2026", 495, 50, 90, null, 90],
  ["전남대학교", "2026", 495, 50, 200, 100, 300],
  ["전북대학교", "2026", 495, 50, 40, 30, 70],
  ["충남대학교", "2024", 685, 50, 35, 5, 40],
  ["충남대학교", "2026", 840, 50, 42, null, 42],
  ["충북대학교", "2025", 587.5, 50, 20, 20, 40],
  ["충북대학교", "2026", 587.5, 50, 50, null, 50],
] as const;

const lookupLowerBoundaryCases = [
  ["충남대학교", "2024", 20, 0, 20],
  ["충남대학교", "2025", 24, null, 24],
  ["충북대학교", "2024", 10, 10, 20],
  ["충북대학교", "2026", 40, null, 40],
] as const;

describe("convertRawToConv university-year characteristics", () => {
  it.each(maxScoreCases)(
    "%s %s preserves the current maximum-score conversion",
    (university, year, englishConv, gpaConv, indexSum) => {
      expect(convertRawToConv(university, year, 990, 100)).toEqual({
        englishConv,
        gpaConv,
        indexSum,
      });
    }
  );

  it.each(midpointScoreCases)(
    "%s %s preserves representative midpoint conversion",
    (university, year, toeic, gpa, englishConv, gpaConv, indexSum) => {
      expect(convertRawToConv(university, year, toeic, gpa)).toEqual({
        englishConv,
        gpaConv,
        indexSum,
      });
    }
  );

  it.each(lookupLowerBoundaryCases)(
    "%s %s clamps lookup conversion at its lower boundary",
    (university, year, englishConv, gpaConv, indexSum) => {
      expect(convertRawToConv(university, year, 100, 0)).toEqual({
        englishConv,
        gpaConv,
        indexSum,
      });
    }
  );

  it("clamps out-of-range raw inputs before conversion", () => {
    expect(convertRawToConv("부산대학교", "2026", 0, -10)).toEqual({
      englishConv: 3.03,
      gpaConv: 0,
      indexSum: 3.03,
    });
    expect(convertRawToConv("부산대학교", "2026", 1200, 110)).toEqual({
      englishConv: 30,
      gpaConv: 30,
      indexSum: 60,
    });
  });

  it("returns an unavailable result for an unsupported university", () => {
    expect(convertRawToConv("지원하지 않는 대학교", "2026", 990, 100)).toEqual({
      englishConv: null,
      gpaConv: null,
      indexSum: null,
    });
  });

  it("requires GPA when the university formula includes GPA", () => {
    expect(convertRawToConv("부산대학교", "2026", 850, null)).toEqual({
      englishConv: 25.76,
      gpaConv: null,
      indexSum: null,
    });
  });

  it("keeps English-only formulas usable without GPA", () => {
    expect(convertRawToConv("인천대학교", "2026", 850, null)).toEqual({
      englishConv: 111.52,
      gpaConv: null,
      indexSum: 111.52,
    });
  });

  it.each(["2023", "2027", "", "invalid"])(
    "does not reuse another formula for unsupported year %j",
    (year) => {
      expect(convertRawToConv("부산대학교", year, 990, 100)).toEqual({
        englishConv: null,
        gpaConv: null,
        indexSum: null,
      });
    }
  );
});

describe("calculateScoreDeficit", () => {
  it("keeps an unavailable comparison unavailable", () => {
    expect(calculateScoreDeficit(null)).toBeNull();
  });

  it("returns the positive gap when the score is below average", () => {
    expect(calculateScoreDeficit(-4.25)).toBe(4.25);
  });

  it("returns zero when the score meets or exceeds the average", () => {
    expect(calculateScoreDeficit(0)).toBe(0);
    expect(calculateScoreDeficit(2.5)).toBe(0);
  });
});

describe("calculateScore", () => {
  it("returns an unavailable comparison when no accepted record is usable", () => {
    const result = calculateScore("부산대학교", "2026", 850, 90, null);

    expect(result.myIndexSum).not.toBeNull();
    expect(result.acceptedIndexSum).toBeNull();
    expect(result.diff).toBeNull();
    expect(result.status).toBe("unknown");
  });

  it("does not compare a partial user score when required GPA is missing", () => {
    const acceptedRecord = {
      대학명: "부산대학교",
      연도: "2026",
      학과: "기계공학부",
      학과_원본명: "기계공학부",
      모집인원: 10,
      지원인원: 30,
      합격인원: 8,
      최종합격_토익환산점수: 25,
      최종합격_토익원점수: 825,
      최종합격_학점환산점수: 27,
      최종합격_학점원점수_100점만점: 90,
    };
    const result = calculateScore(
      "부산대학교",
      "2026",
      850,
      null,
      acceptedRecord,
    );

    expect(result.myIndexSum).toBeNull();
    expect(result.diff).toBeNull();
    expect(result.status).toBe("unknown");
  });
});

describe("convertGpaTo100Scale", () => {
  it("does not turn a zero GPA into a passing percentile", () => {
    expect(convertGpaTo100Scale(0, 4.5)).toBe(0);
    expect(convertGpaTo100Scale(0, 4.3)).toBe(0);
  });
});

describe("analyzeScoreDeficit characteristics", () => {
  it("preserves linear reverse calculations", () => {
    expect(analyzeScoreDeficit("부산대학교", "2026", "100", 3)).toEqual({
      isLookupBased: false,
      toeicNeeded: 100,
      gpaNeeded: 10,
      toeicEfficiency: 0.3,
      gpaEfficiency: 0.03,
      recommendedMetric: "toeic",
    });
  });

  it("still estimates targets for lookup-based formulas, flagged as approximate", () => {
    const result = analyzeScoreDeficit("전북대학교", "2026", "100", 5);

    expect(result.isLookupBased).toBe(true);
    // 5점 격차 / (0.101 * 0.8 점당) ≈ 62점 → 5점 단위로 올림
    expect(result.toeicNeeded).toBe(65);
    expect(result.gpaNeeded).toBe(8.33);
  });

  // 충남대는 구간 환산표라 역산을 아예 거부하고 있었다. 정방향 환산은 같은
  // 근사식으로 이미 화면에 띄우면서 역방향만 막는 건 앞뒤가 안 맞았다.
  it("reverses the Chungnam lookup table instead of refusing", () => {
    const result = analyzeScoreDeficit("충남대학교", "2026", "100", 6, 800);

    expect(result.isLookupBased).toBe(true);
    // 60 - (990-t)/8.3333 에서 6점을 더 얻으려면 50점이 필요하다.
    expect(result.toeicNeeded).toBe(50);
    // 2026 전형은 전적대 성적을 반영하지 않는다.
    expect(result.gpaNeeded).toBeNull();
  });

  // 하한 구간에 눌린 사용자에게 기울기 나눗셈은 닿지 않는 목표를 적어준다.
  it("accounts for the flat floor of a lookup table", () => {
    const flooredStart = analyzeScoreDeficit("충남대학교", "2026", "100", 20, 600);
    const slopeOnly = Math.ceil(Math.ceil(20 / (1 / 8.33333333)) / 5) * 5;

    expect(flooredStart.toeicNeeded).not.toBeNull();
    expect(flooredStart.toeicNeeded!).toBeGreaterThan(slopeOnly);
  });

  it("reports no single-metric path when even a perfect score falls short", () => {
    const result = analyzeScoreDeficit("충남대학교", "2026", "100", 40, 800);

    expect(result.toeicNeeded).toBeNull();
  });

  it("preserves the current 2026 Chungbuk linear estimate", () => {
    const result = analyzeScoreDeficit("충북대학교", "2026", "100", 3);

    expect(result.isLookupBased).toBe(false);
    expect(result.toeicNeeded).toBe(120);
    expect(result.gpaNeeded).toBeNull();
    expect(result.recommendedMetric).toBe("toeic");
  });
});
