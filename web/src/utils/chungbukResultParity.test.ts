import { describe, expect, it } from "vitest";
import rawStandardData from "../data/편입_성적_통합.json";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  모집인원: number | null;
  지원인원: number | null;
  합격인원: number | null;
  최종합격_토익환산점수: number | null;
  최종합격_토익원점수: number | null;
  최종합격_학점환산점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
  합격자기준?: "최초" | "최종" | "확인불가";
};

const records = (rawStandardData as ScoreRecord[]).filter(
  (record) => record.대학명 === "충북대학교",
);

function recordAt(year: string, department: string): ScoreRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("충북대 공식 편입학 결과 ↔ 저장 데이터", () => {
  // 성적표에 평균이 실린 150행(57/45/48)에, «최초 합격자 2명 이하»라 성적표에는
  // 없고 선발현황(NN_충북대_합격자.pdf)에만 인원이 실린 75행(18/31/26)을 더한 수다.
  it("keeps all 225 official result rows by year", () => {
    expect(records).toHaveLength(225);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 75, "2025": 76, "2026": 74 });
  });

  it("stores small-cohort units with counts only and no averages", () => {
    const withoutAverage = records.filter((record) => (
      record.최종합격_토익환산점수 === null
    ));
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        withoutAverage.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 18, "2025": 31, "2026": 26 });
    expect(withoutAverage.every((record) => (
      record.모집인원 !== null
      && record.모집인원 > 0
      && record.최종합격_토익원점수 === null
      && record.최종합격_학점환산점수 === null
      && record.최종합격_학점원점수_100점만점 === null
    ))).toBe(true);
    // 24_충북대_합격자.pdf 1쪽 6행: 모집 2 · 지원 5 · 최초합격 2 · 최종등록 1
    expect(recordAt("2024", "독일언어문화학과")).toMatchObject({
      모집인원: 2, 지원인원: 5, 합격인원: 1,
    });
    // 25_충북대_합격자.pdf 2쪽 39행: 모집 1, 나머지 칸은 빈칸
    expect(recordAt("2025", "조형예술학과(동양화전공)")).toMatchObject({
      모집인원: 1, 지원인원: null, 합격인원: null,
    });
    // 26_충북대_합격자.pdf 2쪽 23행: 모집 1 · 지원 3 · 최초합격 1 · 입학인원 «-»
    expect(recordAt("2026", "산림학과")).toMatchObject({
      모집인원: 1, 지원인원: 3, 합격인원: null,
    });
  });

  it("marks every published average as a first-admit average", () => {
    expect(records.every((record) => record.합격자기준 === "최초")).toBe(true);
  });

  it("matches the official public-score row counts", () => {
    const english = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_토익환산점수 !== null
        )).length,
      ]),
    );
    const gpa = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_학점환산점수 !== null
        )).length,
      ]),
    );

    expect(english).toEqual({ "2024": 57, "2025": 45, "2026": 48 });
    expect(gpa).toEqual({ "2024": 57, "2025": 45, "2026": 0 });
  });

  it("fills the four missing 2025 electronics and software counts", () => {
    expect(recordAt("2025", "전자공학전공")).toMatchObject({
      모집인원: 7, 지원인원: 52, 합격인원: 7,
    });
    expect(recordAt("2025", "반도체공학전공")).toMatchObject({
      모집인원: 9, 지원인원: 46, 합격인원: 8,
    });
    expect(recordAt("2025", "인공지능전공")).toMatchObject({
      모집인원: 7, 지원인원: 34, 합격인원: 7,
    });
    expect(recordAt("2025", "소프트웨어전공")).toMatchObject({
      모집인원: 7, 지원인원: 48, 합격인원: 7,
    });
  });

  it("keeps representative official counts and converted averages", () => {
    expect(recordAt("2024", "국어국문학과")).toMatchObject({
      모집인원: 5,
      지원인원: 16,
      합격인원: 4,
      최종합격_토익환산점수: 26.6,
      최종합격_학점환산점수: 27.64,
    });
    expect(recordAt("2026", "영어영문학과")).toMatchObject({
      모집인원: 4,
      지원인원: 34,
      합격인원: 3,
      최종합격_토익환산점수: 59,
      최종합격_토익원점수: 947.5,
    });
    expect(recordAt("2026", "물리학과").합격인원).toBeNull();
  });
});
