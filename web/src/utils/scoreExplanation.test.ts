import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import {
  explainAcceptedScore,
  explainMyScore,
  getFormulaBasis,
  type ScoreComponent,
  type ScoreExplanation,
} from "./scoreExplanation";

function makeRecord(overrides: Partial<DepartmentRecord>): DepartmentRecord {
  return {
    대학명: "경북대학교",
    연도: "2026",
    학과: "기계공학과",
    학과_원본명: "기계공학과",
    모집인원: 10,
    지원인원: 30,
    합격인원: 10,
    최종합격_토익환산점수: null,
    최종합격_토익원점수: null,
    최종합격_학점환산점수: null,
    최종합격_학점원점수_100점만점: null,
    ...overrides,
  };
}

/** 인덱스 접근이 undefined일 수 있으므로 한 곳에서 확인하고 좁힌다. */
function componentAt(
  explanation: ScoreExplanation | null,
  index: number,
): ScoreComponent {
  const component = explanation?.components[index];
  if (component === undefined) {
    throw new Error(`components[${index}] 가 없다`);
  }

  return component;
}

function requireTotal(explanation: ScoreExplanation | null): number {
  if (explanation === null || explanation.total === null) {
    throw new Error("total 이 없다");
  }

  return explanation.total;
}

describe("explainMyScore", () => {
  it("shows how each component was computed from my own input", () => {
    const result = explainMyScore("경북대학교", "2026", 850, "100", 90);
    const english = componentAt(result, 0);
    const gpa = componentAt(result, 1);

    expect(english.source).toBe("computed-from-my-input");
    expect(english.detail).toContain("TOEIC 850점");
    expect(gpa.source).toBe("computed-from-my-input");

    // 합계는 각 항목의 합과 어긋나면 안 된다.
    expect(requireTotal(result)).toBeCloseTo(english.value! + gpa.value!, 2);
  });

  it("converts a 4.5 scale GPA and shows both scales", () => {
    const result = explainMyScore("경북대학교", "2026", 850, "4.5", 3.8);

    expect(componentAt(result, 1).detail).toContain("3.8/4.5");
    expect(componentAt(result, 1).detail).toContain("/100");
  });

  it("marks GPA as not reflected where the year drops it", () => {
    const result = explainMyScore("인천대학교", "2026", 850, "100", 90);
    const gpa = componentAt(result, 1);

    expect(gpa.source).toBe("not-reflected");
    expect(gpa.value).toBeNull();
    expect(result?.total).toBe(componentAt(result, 0).value);
  });

  it("asks for input instead of guessing when a score is missing", () => {
    const result = explainMyScore("경북대학교", "2026", null, "100", null);

    expect(componentAt(result, 0).source).toBe("unavailable");
    expect(componentAt(result, 1).source).toBe("unavailable");
    expect(result?.total).toBeNull();
  });

  it("returns null for an unsupported university or year", () => {
    expect(explainMyScore("없는대학교", "2026", 850, "100", 90)).toBeNull();
    expect(explainMyScore("경북대학교", "2023", 850, "100", 90)).toBeNull();
  });
});

describe("explainAcceptedScore", () => {
  it("distinguishes a university-published score from one we derived", () => {
    const published = explainAcceptedScore(makeRecord({
      최종합격_토익환산점수: 85.86,
      최종합격_학점환산점수: 48,
    }));
    expect(componentAt(published, 0).source).toBe("university-published");
    expect(componentAt(published, 1).source).toBe("university-published");

    const derived = explainAcceptedScore(makeRecord({
      최종합격_토익원점수: 850,
      최종합격_학점원점수_100점만점: 90,
    }));
    expect(componentAt(derived, 0).source).toBe("derived-from-published-raw");
    expect(componentAt(derived, 1).source).toBe("derived-from-published-raw");
    expect(componentAt(derived, 0).detail).toContain("환산식에 넣어 계산");
  });

  it("reports an undisclosed score instead of showing zero", () => {
    const result = explainAcceptedScore(makeRecord({}));

    expect(componentAt(result, 0).source).toBe("unavailable");
    expect(componentAt(result, 0).value).toBeNull();
    expect(result?.total).toBeNull();
  });

  it("carries the 최초/최종 basis through", () => {
    const result = explainAcceptedScore(makeRecord({
      최종합격_토익환산점수: 85.86,
      합격자기준: "최초",
    }));

    expect(result?.admissionBasis).toBe("최초");
  });

  it("keeps the total identical to the value the comparison actually uses", () => {
    const result = explainAcceptedScore(makeRecord({
      최종합격_토익환산점수: 85.86,
      최종합격_학점환산점수: 48,
    }));

    expect(requireTotal(result)).toBeCloseTo(85.86 + 48, 2);
  });
});

describe("getFormulaBasis", () => {
  it("exposes the documented formula text where it matches what we compute", () => {
    const basis = getFormulaBasis("경북대학교", "2026");

    expect(basis?.documentedFormulaUnverified).toBe(false);
    expect(basis?.englishFormulaText).toContain("TOEIC");
    expect(basis?.gpaFormulaText).not.toBeNull();
    expect(basis?.confidence).toBe("verified");
  });

  it("withholds the documented text where it contradicts our formula", () => {
    // 강원대 2026은 모집요강 JSON(영어 100점-학점 반영)과 계산식(영어 150점-학점
    // 미반영)이 어긋난 채로 남아 있다. 원문 대조 전까지는 원문 표기를 보여주면
    // 화면의 숫자와 모순되는 설명이 붙으므로 감춘다.
    const basis = getFormulaBasis("강원대학교", "2026");

    expect(basis?.documentedFormulaUnverified).toBe(true);
    expect(basis?.englishFormulaText).toBeNull();
    expect(basis?.gpaFormulaText).toBeNull();
    expect(basis?.confidence).toBe("estimated");
  });

  it("surfaces a formula assumed from another year", () => {
    expect(getFormulaBasis("부산대학교", "2024")?.provenance)
      .toBe("assumed-from-other-year");
  });

  it("returns null for an unsupported university or year", () => {
    expect(getFormulaBasis("없는대학교", "2026")).toBeNull();
    expect(getFormulaBasis("경북대학교", "2023")).toBeNull();
  });
});
