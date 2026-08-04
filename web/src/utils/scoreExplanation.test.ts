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

  it("marks English as not reflected for Pusan's 2025 contract department", () => {
    const result = explainMyScore(
      "부산대학교",
      "2025",
      null,
      "100",
      100,
      "발전공학과",
    );

    expect(componentAt(result, 0).source).toBe("not-reflected");
    expect(componentAt(result, 1).value).toBe(30);
    expect(result?.total).toBe(30);
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

  it("shows the documented text once the source was verified", () => {
    // 강원대 2026은 JSON(영어 100점-학점 반영)과 계산식(영어 150점-학점 미반영)이
    // 어긋나 원문 표기를 감추던 칸이었다. 26_강원대_모집요강.pdf 13쪽 배점표로
    // 계산식 쪽이 맞는 것이 확인돼 JSON을 고쳤고, 이제 원문을 보여준다.
    const basis = getFormulaBasis("강원대학교", "2026");

    expect(basis?.documentedFormulaUnverified).toBe(false);
    expect(basis?.englishFormulaText).toContain("150");
    expect(basis?.gpaFormulaText).toBeNull();  // 전적대 미반영
    expect(basis?.confidence).toBe("verified");
  });

  it("surfaces the verified Pusan 2024 formula", () => {
    const basis = getFormulaBasis("부산대학교", "2024", "기계공학부");

    expect(basis?.provenance).toBe("documented-for-year");
    expect(basis?.gpaFormulaText).toContain("× 20");
    expect(basis?.admissionProfileText).toContain("지필고사 50점");
  });

  it("shows KNU's selected arts weights and 30-point GPA base", () => {
    const basis = getFormulaBasis("경북대학교", "2026", "디자인학과");

    expect(basis?.englishFormulaText).toContain("50 × TOEIC");
    expect(basis?.gpaFormulaText).toContain("30 + 20");
    expect(basis?.admissionProfileText).toContain("실기 100점");
  });

  it("shows Chungnam's year-and-department-specific weights", () => {
    const computer2024 = getFormulaBasis("충남대학교", "2024", "컴퓨터융합학부");
    const math2026 = getFormulaBasis("충남대학교", "2026", "수학교육과");
    const arts2026 = getFormulaBasis("충남대학교", "2026", "음악과(성악)");

    expect(computer2024?.admissionProfileText).toContain("공인영어 20점");
    expect(computer2024?.admissionProfileText).toContain("전적대성적 20점");
    expect(computer2024?.admissionProfileText).toContain("실기 20점");
    expect(math2026?.admissionProfileText).toContain("지필고사 60점");
    expect(math2026?.gpaFormulaText).toBeNull();
    expect(arts2026?.englishFormulaText).toBeNull();
    expect(arts2026?.admissionProfileText).toContain("실기 60점");
  });

  it("shows Incheon's selected standard, movement, and interview-only weights", () => {
    const design = getFormulaBasis("인천대학교", "2026", "디자인학부");
    const movement = getFormulaBasis("인천대학교", "2026", "운동건강학부");
    const painting = getFormulaBasis("인천대학교", "2026", "한국화전공");

    expect(design?.englishFormulaText).toContain("기본점수 60");
    expect(design?.admissionProfileText).toContain("공인영어 120점");
    expect(movement?.englishFormulaText).toContain("기본점수 없음");
    expect(movement?.admissionProfileText).toContain("실기 60점");
    expect(painting?.englishFormulaText).toBeNull();
    expect(painting?.admissionProfileText).toContain("면접 200점");
  });

  it("shows Chungbuk's written and practical profile weights", () => {
    const written2025 = getFormulaBasis("충북대학교", "2025", "간호학과");
    const practical2026 = getFormulaBasis("충북대학교", "2026", "건축학과");

    expect(written2025?.admissionProfileText).toContain("전공필기형");
    expect(written2025?.admissionProfileText).toContain("지필고사 20점");
    expect(written2025?.gpaFormulaText).toContain("10 + 백분율");
    expect(practical2026?.admissionProfileText).toContain("실기 30점");
    expect(practical2026?.admissionProfileText).toContain("면접 10점");
    expect(practical2026?.gpaFormulaText).toBeNull();
  });

  it("shows Jeonbuk's selected special-profile weights", () => {
    const arts2025 = getFormulaBasis("전북대학교", "2025", "산업디자인학과");
    const sports2026 = getFormulaBasis("전북대학교", "2026", "스포츠과학과");
    const dental2026 = getFormulaBasis("전북대학교", "2026", "치의학과");
    const hanok2026 = getFormulaBasis("전북대학교", "2026", "한옥학과");

    expect(arts2025?.englishFormulaText).toBeNull();
    expect(arts2025?.gpaFormulaText).toContain("× 1.2");
    expect(arts2025?.admissionProfileText).toContain("실기 60점");
    expect(sports2026?.admissionProfileText).toContain("공인영어 50점");
    expect(sports2026?.admissionProfileText).toContain("실기 50점");
    expect(dental2026?.admissionProfileText).toContain("지필고사 80점");
    expect(dental2026?.englishFormulaText).toContain("× 0.6");
    expect(hanok2026?.admissionProfileText).toContain("전적대성적 100점");
  });

  it("shows Chonnam's year-and-department-specific weights", () => {
    const veterinary2024 = getFormulaBasis("전남대학교", "2024", "수의학과");
    const veterinary2026 = getFormulaBasis("전남대학교", "2026", "수의학과");
    const nursing2026 = getFormulaBasis("전남대학교", "2026", "간호학과");
    const theory2025 = getFormulaBasis("전남대학교", "2025", "이론전공");
    const yeosu2026 = getFormulaBasis("전남대학교", "2026", "건축디자인학과");

    expect(veterinary2024?.admissionProfileText).toContain("1단계 4배수");
    expect(veterinary2024?.admissionProfileText).toContain("공인영어 400점");
    expect(veterinary2026?.admissionProfileText).toContain("공인영어 300점");
    expect(veterinary2026?.admissionProfileText).toContain("지필고사 300점");
    expect(nursing2026?.admissionProfileText).toContain("지필고사 400점");
    expect(theory2025?.admissionProfileText).toContain("광주캠퍼스 표준형");
    expect(yeosu2026?.englishFormulaText).toBeNull();
    expect(yeosu2026?.admissionProfileText).toContain("전적대성적 600점");
  });

  it("returns null for an unsupported university or year", () => {
    expect(getFormulaBasis("없는대학교", "2026")).toBeNull();
    expect(getFormulaBasis("경북대학교", "2023")).toBeNull();
  });
});
