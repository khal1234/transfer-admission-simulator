import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RecruitmentCount from "./RecruitmentCount";
import records from "../data/편입_성적_통합.json";
import type { DepartmentRecord } from "../utils/converter";
import { getUnavailableScoreDescription } from "../utils/scoreAvailability";

function find(year: string, department: string) {
  return records.find(r => r.대학명 === "충남대학교" && r.연도 === year && r.학과 === department)! as DepartmentRecord;
}
describe("source-backed recruitment count", () => {
  it("renders ordinary counts and their source inline without an explanation button", () => {
    const record = records.find(r => r.대학명 === "전남대학교" && r.연도 === "2026" && r.학과 === "가정교육과")! as DepartmentRecord;
    const html = renderToStaticMarkup(<RecruitmentCount record={record} />);
    expect(html).toContain("등록 2명 / 모집 2명");
    expect(html).toContain("등록자수 기준");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("해당 연도 대학 입학처");
  });
  it("retains a button for the Chungnam initial-plus-additional sum", () => {
    const html = renderToStaticMarkup(<RecruitmentCount record={find("2026", "간호학과")} />);
    expect(html).toContain('aria-label="등록·모집인원 안내 설명 보기"');
    expect(html).toContain("최초합격 등록 3명 + 충원합격 등록 5명");
  });
  it.each([["2026", "건축학과(5)", 5], ["2026", "약학과", 3], ["2025", "약학과", 6],
    ["2025", "인문사회과학전공", 7], ["2026", "디자인창의학과(도자.섬유디자인)", 4]])(
    "restores %s %s from the general-transfer count column", (year, department, count) => {
      const record = find(year, department);
      expect(record.모집인원).toBe(count);
      expect(record.모집인원_근거).toContain("일반편입학 모집인원");
      expect(renderToStaticMarkup(<RecruitmentCount record={record} mobile />)).toContain(`모집 ${count}명`);
    });
  it.each(["국어교육과", "체육교육과", "기술교육과", "인문사회과학전공", "음악과(작곡)"])(
    "distinguishes confirmed zero recruitment for %s from privacy suppression", department => {
      const record = find("2026", department);
      expect(record.모집인원).toBe(0);
      expect(renderToStaticMarkup(<RecruitmentCount record={record} />)).toContain("미모집");
      expect(getUnavailableScoreDescription(record, "toeic")).toContain("모집계획인원이 0명");
      expect(getUnavailableScoreDescription(record, "gpa")).toContain("미모집");
    });
  it("does not treat an absent count or a small-cohort footnote as no recruitment", () => {
    // 2026 무용학과(한국무용)은 26_충남대_모집요강.pdf 모집인원 표로 2명이 확인돼 저장
    // 값이 채워졌다. 지금 자료에는 모집인원이 빈 행이 없어, «모집 미확인» 표시는
    // 같은 행에서 모집인원만 비워 본다.
    const stored = find("2026", "무용학과(한국무용)");
    expect(stored.모집인원).toBe(2);
    expect(stored.모집인원_근거).toContain("26_충남대_모집요강.pdf");
    const storedHtml = renderToStaticMarkup(<RecruitmentCount record={stored} mobile />);
    expect(storedHtml).toContain("모집 2명");
    expect(storedHtml).not.toContain("미모집");
    const record: DepartmentRecord = { ...stored, 모집인원: null, 모집인원_근거: undefined };
    const html = renderToStaticMarkup(<RecruitmentCount record={record} mobile />);
    expect(html).toContain("모집 미확인");
    expect(html).toContain("비공개나 미모집으로 확정한 것이 아니며");
    expect(html).toContain('aria-label="등록·모집인원 안내 설명 보기"');
  });
});
