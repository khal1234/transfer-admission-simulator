import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import {
  buildDepartmentSearchIndex,
  filterDepartmentSearchIndex,
} from "./departmentSearch";

function createRecord(
  university: string,
  department: string,
  originalDepartment = department,
): DepartmentRecord {
  return {
    대학명: university,
    연도: "2026",
    학과: department,
    학과_원본명: originalDepartment,
    모집인원: 10,
    지원인원: 30,
    합격인원: 10,
    최종합격_토익환산점수: null,
    최종합격_토익원점수: 850,
    최종합격_학점환산점수: null,
    최종합격_학점원점수_100점만점: 90,
  };
}

const records = [
  createRecord("부산대학교", "기계공학부"),
  createRecord("경북대학교", "컴퓨터학부", "컴퓨터공학과"),
  createRecord("부산대학교", "생명과학과"),
];
const searchIndex = buildDepartmentSearchIndex(records);

describe("department search", () => {
  it("matches normalized department and historical names", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "컴퓨터 공학", new Set())
        .map((record) => record.학과),
    ).toEqual(["컴퓨터학부"]);
  });

  it("matches Korean consonant initials", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "ㄱㄱㄱㅎㅂ", new Set())
        .map((record) => record.학과),
    ).toEqual(["기계공학부"]);
  });

  it("applies the university filter together with the query", () => {
    expect(
      filterDepartmentSearchIndex(
        searchIndex,
        "학",
        new Set(["경북대학교"]),
      ).map((record) => record.학과),
    ).toEqual(["컴퓨터학부"]);
  });

  it("returns every selected-university record for a blank query", () => {
    expect(
      filterDepartmentSearchIndex(
        searchIndex,
        "  ",
        new Set(["부산대학교"]),
      ).map((record) => record.학과),
    ).toEqual(["기계공학부", "생명과학과"]);
  });
});
