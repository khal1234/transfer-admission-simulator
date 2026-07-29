import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import {
  prepareDepartmentRecords,
  prepareExceptionDepartmentRecords,
  validateDepartmentRecords,
  validateExceptionDepartmentRecords,
} from "./dataValidation";

const validRecord = {
  대학명: "테스트대학교",
  연도: "2026",
  모집인원: 1,
  지원인원: 2,
  합격인원: 1,
  최종합격_토익환산점수: 50,
  최종합격_토익원점수: 800,
  최종합격_학점환산점수: null,
  최종합격_학점원점수_100점만점: 90,
  학과: "테스트학과",
  학과_원본명: "테스트학과",
  비고: null,
  합격자기준: "최초",
} as const;
const preparableRecord = {
  ...validRecord,
  대학명: "부산대학교",
};

describe("department data validation", () => {
  it("accepts the current generated datasets", () => {
    expect(validateDepartmentRecords(rawStandardData)).toHaveLength(1922);
    expect(validateExceptionDepartmentRecords(rawExceptionData)).toHaveLength(267);
  });

  it("quarantines or normalizes semantic anomalies in current datasets", () => {
    const standard = prepareDepartmentRecords(rawStandardData);
    const exceptions = prepareExceptionDepartmentRecords(rawExceptionData);

    expect(standard.records).toHaveLength(1920);
    expect(standard.affectedRecordCount).toBe(13);
    expect(exceptions.records).toHaveLength(267);
    expect(exceptions.affectedRecordCount).toBe(11);
  });

  it("rejects a malformed score field", () => {
    expect(() => validateDepartmentRecords([
      { ...validRecord, 최종합격_토익원점수: "800" },
    ])).toThrow("1번째 레코드 형식");
  });

  it("rejects duplicate university-year-department records", () => {
    expect(() => validateDepartmentRecords([
      validRecord,
      { ...validRecord },
    ])).toThrow("중복 레코드");
  });

  it("requires an exclusion reason for exception records", () => {
    expect(() => validateExceptionDepartmentRecords([
      validRecord,
    ])).toThrow("1번째 레코드 형식");
  });

  it("excludes records with invalid identities or counts", () => {
    const prepared = prepareDepartmentRecords([
      { ...preparableRecord, 학과: "2", 학과_원본명: "2" },
      { ...preparableRecord, 학과: "정상학과", 학과_원본명: "정상학과", 모집인원: -1 },
    ]);

    expect(prepared.records).toEqual([]);
    expect(prepared.affectedRecordCount).toBe(2);
    expect(prepared.issues.map((issue) => issue.reason)).toEqual([
      "invalid-identity",
      "invalid-count",
    ]);
  });

  it("turns all-zero undisclosed score sentinels into nulls", () => {
    const prepared = prepareDepartmentRecords([{
      ...preparableRecord,
      최종합격_토익환산점수: 0,
      최종합격_토익원점수: 0,
      최종합격_학점환산점수: 0,
      최종합격_학점원점수_100점만점: 0,
    }]);

    expect(prepared.records[0]).toMatchObject({
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
    });
    expect(prepared.issues[0]?.reason).toBe("undisclosed-zero-sentinel");
  });

  it("keeps a record but hides raw scores outside valid ranges", () => {
    const prepared = prepareDepartmentRecords([{
      ...preparableRecord,
      최종합격_토익원점수: 1200,
      최종합격_학점원점수_100점만점: 177.1,
    }]);

    expect(prepared.records[0]).toMatchObject({
      최종합격_토익원점수: null,
      최종합격_학점원점수_100점만점: null,
    });
    expect(prepared.issues[0]?.reason).toBe("invalid-raw-score");
  });

  it("excludes unsupported standard formulas but preserves exception metadata", () => {
    const standard = prepareDepartmentRecords([validRecord]);
    const exceptions = prepareExceptionDepartmentRecords([{
      ...validRecord,
      제거사유: "별도 전형",
    }]);

    expect(standard.records).toEqual([]);
    expect(standard.issues[0]?.reason).toBe("unsupported-formula");
    expect(exceptions.records).toHaveLength(1);
  });
});
