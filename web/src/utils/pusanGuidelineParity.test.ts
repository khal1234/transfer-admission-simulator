import { describe, expect, it } from "vitest";
import rawStandardData from "../data/편입_성적_통합.json";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  모집인원: number | null;
  지원인원: number | null;
  합격인원: number | null;
  최종합격_토익원점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
  합격자기준?: "최초" | "최종" | "확인불가";
};

const records = (rawStandardData as ScoreRecord[]).filter(
  (record) => record.대학명 === "부산대학교",
);

const zeroAdmissionDepartments2026 = [
  "간호학과",
  "공공정책학부",
  "노어노문학과",
  "무역학부",
  "무용학과 한국무용전공",
  "물리교육과",
  "바이오산업기계공학과",
  "바이오환경에너지학과",
  "불어불문학과",
  "수학교육과",
  "식물생명과학과",
  "식품공학과",
  "식품영양학과",
  "조경학과",
  "특수교육과",
  "한국음악학과 관악.타악전공",
  "한국음악학과 이론.작곡전공",
  "한국음악학과 현악.성악전공",
];

const zeroApplicationDepartments2026 = [
  "한국음악학과 관악.타악전공",
  "한국음악학과 이론.작곡전공",
];

function recordAt(year: string, department: string): ScoreRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("부산대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 236 official result rows by year", () => {
    expect(records).toHaveLength(236);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 89, "2025": 59, "2026": 88 });
  });

  it("marks every published average as a final-admit average", () => {
    expect(records.every((record) => record.합격자기준 === "최종")).toBe(true);
  });

  it("stores the 18 official 2026 no-admit rows as zero", () => {
    const zeroRows = records.filter((record) => (
      record.연도 === "2026" && record.합격인원 === 0
    ));
    expect(zeroRows.map((record) => record.학과).sort())
      .toEqual(zeroAdmissionDepartments2026);
    for (const record of zeroRows) {
      expect(record.최종합격_토익원점수).toBeNull();
      expect(record.최종합격_학점원점수_100점만점).toBeNull();
    }
  });

  it("stores the two official 2026 no-application rows as zero", () => {
    const zeroRows = records.filter((record) => (
      record.연도 === "2026" && record.지원인원 === 0
    ));
    expect(zeroRows.map((record) => record.학과).sort())
      .toEqual(zeroApplicationDepartments2026);
    expect(zeroRows.every((record) => record.합격인원 === 0)).toBe(true);
  });

  it("keeps representative official counts and averages", () => {
    expect(recordAt("2024", "국어국문학과")).toMatchObject({
      모집인원: 4,
      지원인원: 23,
      합격인원: 4,
      최종합격_토익원점수: 880,
      최종합격_학점원점수_100점만점: 94.9,
    });
    expect(recordAt("2025", "기계공학부")).toMatchObject({
      모집인원: 30,
      지원인원: 144,
      합격인원: 11,
      최종합격_토익원점수: 884.1,
      최종합격_학점원점수_100점만점: 94.5,
    });
    expect(recordAt("2026", "약학부")).toMatchObject({
      모집인원: 16,
      지원인원: 665,
      합격인원: 16,
      최종합격_토익원점수: 975.3,
      최종합격_학점원점수_100점만점: 97.9,
    });
  });

  it("matches the official public-score row counts", () => {
    const publicScores = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_토익원점수 !== null
          && record.최종합격_학점원점수_100점만점 !== null
        )).length,
      ]),
    );
    expect(publicScores).toEqual({ "2024": 62, "2025": 59, "2026": 41 });
  });
});
