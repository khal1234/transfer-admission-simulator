import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import { getUnavailableScoreDescription } from "./scoreAvailability";

const baseRecord: DepartmentRecord = {
  대학명: "충북대학교",
  연도: "2026",
  학과: "간호학과",
  학과_원본명: "간호학과",
  모집인원: 7,
  지원인원: 100,
  합격인원: 7,
  최종합격_토익환산점수: 59.29,
  최종합격_토익원점수: 959.1,
  최종합격_학점환산점수: null,
  최종합격_학점원점수_100점만점: null,
  합격자기준: "최초",
};

describe("getUnavailableScoreDescription", () => {
  it("explains an average that cannot exist when nobody was admitted", () => {
    const record = {
      ...baseRecord,
      대학명: "부산대학교",
      합격인원: 0,
    };

    expect(getUnavailableScoreDescription(record, "toeic"))
      .toContain("합격(등록) 인원이 0명");
  });

  it("explains a score that the admission formula does not use", () => {
    expect(getUnavailableScoreDescription(baseRecord, "gpa"))
      .toContain("전적대 성적을 반영하지 않아");
    expect(getUnavailableScoreDescription(baseRecord, "gpa"))
      .toContain("PDF 25쪽(인쇄 23쪽)");
    expect(getUnavailableScoreDescription(baseRecord, "gpa"))
      .toContain("1단계 동점자 처리");
  });

  it("uses Chungnam's explicit exclusion for two admitted students", () => {
    const record = {
      ...baseRecord,
      대학명: "충남대학교",
      학과: "건설공학교육과",
      학과_원본명: "건설공학교육과",
      합격인원: 2,
    };

    expect(getUnavailableScoreDescription(record, "toeic"))
      .toContain("합격자가 2명 이하");
  });

  it.each([
    ["경북대학교", "입학인원이 1명", "물리교육과"],
    ["부경대학교", "모집인원 및 등록인원이 1~2명", "수해양산업교육과"],
    ["부산대학교", "합격자가 1명", "도시공학과"],
    ["전남대학교", "등록자가 1명", "교육학과"],
    ["전북대학교", "등록인원이 1명 이하", "IT응용시스템공학"],
    ["충북대학교", "최초 합격자가 2명 이하", "간호학과"],
  ])("preserves %s's distinct official cohort rule", (university, rule, department) => {
    const record = { ...baseRecord, 대학명: university, 학과: department, 학과_원본명: department, 합격인원: 1 };
    expect(getUnavailableScoreDescription(record, "toeic")).toContain(rule);
    expect(getUnavailableScoreDescription(record, "toeic")).toContain("공식 입결 안내");
  });

  it("links Kangwon's GPA absence to the correct guideline and leaves GPA-reflecting nursing out", () => {
    const record = { ...baseRecord, 대학명: "강원대학교", 학과: "가정교육과", 학과_원본명: "가정교육과", 합격인원: 0 };
    const note = getUnavailableScoreDescription(record, "gpa");
    expect(note).toContain("모집요강의 전형요소별 배점표");
    expect(note).toContain("공인영어 150점");
    expect(note).toContain("면접 100점");
    expect(note).not.toContain("인원이 0명");
    expect(getUnavailableScoreDescription({ ...record, 학과: "간호학과", 학과_원본명: "간호학과" }, "gpa"))
      .not.toContain("반영하지 않아");
  });

  it("does not carry Incheon's 2024 single-seat non-disclosure rule into 2025 or 2026", () => {
    const record = { ...baseRecord, 대학명: "인천대학교", 학과: "경영학부", 학과_원본명: "경영학부", 모집인원: 1, 합격인원: null };
    expect(getUnavailableScoreDescription({ ...record, 연도: "2024" }, "toeic")).toContain("모집인원이 1명");
    for (const year of ["2025", "2026"]) {
      expect(getUnavailableScoreDescription({ ...record, 연도: year }, "toeic"))
        .not.toContain("모집인원이 1명");
    }
  });

  it("does not treat Kangwon's final registration zero as zero initial admits", () => {
    const record = { ...baseRecord, 대학명: "강원대학교", 학과: "가정교육과", 학과_원본명: "가정교육과", 합격인원: 0 };
    expect(getUnavailableScoreDescription(record, "toeic")).toContain("최종등록인원만으로");
    expect(getUnavailableScoreDescription(record, "toeic")).not.toContain("평균이 없습니다");
  });
});
