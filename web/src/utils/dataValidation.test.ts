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
  // 2026-07-31~08-01 원문 대조로 데이터를 고치면서 건수가 바뀌었다.
  //   경북대 2024: 학과명이 '2','4' 인 오염 레코드 2건을 빼고, 그 자리에 있어야 할
  //                농업토목ㆍ생물산업공학부 2개 전공을 넣었다.
  //   경북대 2025: 병합셀 때문에 통째로 빠져 있던 생물학과 1건을 넣었다.
  // 격리 대상이 0이 된 것도 같은 작업의 결과다 — 숫자 학과명과 100 초과 백분위가
  // 데이터에서 사라졌다. 근거는 tools/apply_fixes.py 의 머리말에 있다.
  // 충남대는 3개년 모집요강 배점표에 따라 예술·무용 22건과 2026 수학교육과를
  // 예외로 옮기고, 2025 한문·화학·생물과학 3건을 표준으로 복원했다.
  // 근거는 tools/apply_chungnam_guideline_fixes.py 에 있다.
  // 전북대는 3개년 모집요강에 따라 예술·체육·치의학 특수전형 9건을
  // 표준에서 예외로 옮겼다. 근거는 tools/apply_jeonbuk_guideline_fixes.py 에 있다.
  // 부산대는 학과별 배점 공식을 계산 코드에서 지원하게 되어, 배점 차이만으로
  // 격리했던 19건을 모두 표준 데이터로 복원했다.
  // 경북대도 일반·예능·체능 프로필을 지원해 예외 5건을 복원하고, 예·체능계
  // TOEIC 50점 배점을 100점으로 역산한 8건을 정정했다.
  // 충남대는 3개년 8개 학과별 프로필을 지원해 예외 49건을 복원하고,
  // 구간표와 학과별 영어 배점에 맞춰 TOEIC 역산 근삿값을 다시 산출했다.
  // 인천대는 표준·실기·운동건강·면접전용 프로필을 지원해 예외 16건을
  // 복원하고, 2026 스포츠과학부·체육교육과에도 공인영어 미반영식을 적용했다.
  // 충북대는 표준·전공필기·실기 프로필을 지원해 예외 11건을 복원했다.
  it("accepts the current generated datasets", () => {
    // 충북대 11행과 전북대 23행은 학과별 공식 지원 후 계산 대상으로 복원했다.
    expect(validateDepartmentRecords(rawStandardData)).toHaveLength(2012);
    expect(validateExceptionDepartmentRecords(rawExceptionData)).toHaveLength(178);
  });

  it("quarantines or normalizes semantic anomalies in current datasets", () => {
    const standard = prepareDepartmentRecords(rawStandardData);
    const exceptions = prepareExceptionDepartmentRecords(rawExceptionData);

    expect(standard.records).toHaveLength(2012);
    expect(standard.affectedRecordCount).toBe(0);
    expect(exceptions.records).toHaveLength(178);
    expect(exceptions.affectedRecordCount).toBe(0);
  });

  it("keeps Chungbuk special units selectable after profile support", () => {
    const standardKeys = new Set(
      rawStandardData.map((record) => `${record.대학명}|${record.연도}|${record.학과}`),
    );
    const exceptionKeys = new Set(
      rawExceptionData.map((record) => `${record.대학명}|${record.연도}|${record.학과}`),
    );

    expect(standardKeys).toContain("충북대학교|2026|약학과");
    expect(standardKeys).toContain("충북대학교|2026|제약학과");
    expect(standardKeys).toContain("충북대학교|2026|간호학과");
    expect(standardKeys).toContain("충북대학교|2025|간호학과");
    expect(standardKeys).toContain("충북대학교|2024|건축학과");
    expect(standardKeys).toContain("충북대학교|2026|건축학과");
    expect(exceptionKeys).not.toContain("충북대학교|2026|약학과");
    expect(exceptionKeys).not.toContain("충북대학교|2026|제약학과");
    expect(exceptionKeys).not.toContain("충북대학교|2026|간호학과");
    expect(exceptionKeys).not.toContain("충북대학교|2025|간호학과");
    expect(exceptionKeys).not.toContain("충북대학교|2024|건축학과");
    expect(exceptionKeys).not.toContain("충북대학교|2026|건축학과");
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
