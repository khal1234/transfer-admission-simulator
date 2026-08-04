import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawFormulaData from "../data/편입_환산공식_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  합격인원: number | null;
  최종합격_토익원점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
};

type FormulaRecord = {
  대학명: string;
  연도: string;
  비고: string;
  전적대성적_환산공식: { 학점기준설명: string };
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];
const formulas = rawFormulaData as FormulaRecord[];

function getRecord(year: string, department: string): ScoreRecord {
  const record = standard.find((candidate) => (
    candidate.대학명 === "전남대학교"
      && candidate.연도 === year
      && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("전남대 모집요강·공식 결과 ↔ 저장 데이터", () => {
  it("restores veterinary medicine and art-theory rows with supported formulas", () => {
    for (const year of ["2024", "2025"]) {
      expect(getRecord(year, "수의학과")).toBeDefined();
    }
    for (const year of ["2024", "2025", "2026"]) {
      expect(getRecord(year, "이론전공")).toBeDefined();
    }
    expect(exceptions.filter((record) => record.대학명 === "전남대학교"))
      .toEqual([]);
  });

  it("stores the newly confirmed 2024 official scores", () => {
    expect(getRecord("2024", "이론전공")).toMatchObject({
      최종합격_토익원점수: 835,
      최종합격_학점원점수_100점만점: 96.35,
    });

    const expectedGpa: Record<string, number> = {
      관현악전공: 86.5,
      체육교육과: 92.86,
      건축디자인학과: 86.72,
      환경시스템공학과: 90.7,
      "산업기술융합공학과(야간)": 97.59,
      멀티미디어전공: 92.12,
      전자상거래전공: 84.87,
      수산생명의학과: 94.96,
      해양경찰학과: 83.1,
    };
    for (const [department, gpa] of Object.entries(expectedGpa)) {
      expect(getRecord("2024", department).최종합격_학점원점수_100점만점)
        .toBe(gpa);
    }
  });

  it("keeps undisclosed 2024 registration counts null", () => {
    const undisclosed = [
      "냉동공조공학과",
      "문화관광경영학과",
      "석유화학소재공학과",
      "양식생물학과",
      "역사교육과",
      "의공학과",
      "전기및반도체공학전공",
      "지질환경전공",
      "컴퓨터공학전공",
      "헬스케어메디컬공학부",
      "화공안전전공",
    ];
    for (const department of undisclosed) {
      expect(getRecord("2024", department).합격인원).toBeNull();
    }
  });

  it("records official pages, special profiles, and the GPA conversion", () => {
    for (const year of ["2024", "2025", "2026"]) {
      const formula = formulas.find((candidate) => (
        candidate.대학명 === "전남대학교" && candidate.연도 === year
      ));
      expect(formula?.비고).toContain("모집요강 PDF");
      expect(formula?.비고).toContain("약학부");
      expect(formula?.비고).toContain("여수캠퍼스");
      expect(formula?.전적대성적_환산공식.학점기준설명).not.toBe("");
    }
    const formula2026 = formulas.find((candidate) => (
      candidate.대학명 === "전남대학교" && candidate.연도 === "2026"
    ));
    expect(formula2026?.비고).toContain("간호학과");
    expect(formula2026?.비고).toContain("디자인학과");
    expect(formula2026?.전적대성적_환산공식.학점기준설명)
      .toBe("백분율 성적을 배점 비율로 반영");
  });
});
