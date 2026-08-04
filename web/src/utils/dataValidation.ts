import type { DepartmentRecord } from "./converter";
import { getConversionFormula } from "./formulaRegistry";

export type ExceptionDepartmentRecord = DepartmentRecord & {
  제거사유: string;
};

export type DepartmentDataIssueReason =
  | "invalid-identity"
  | "invalid-count"
  | "unsupported-formula"
  | "undisclosed-zero-sentinel"
  | "invalid-raw-score"
  | "invalid-converted-score";

export type DepartmentDataIssue = {
  key: string;
  reason: DepartmentDataIssueReason;
};

export type PreparedDepartmentRecords<T extends DepartmentRecord> = {
  records: T[];
  issues: DepartmentDataIssue[];
  affectedRecordCount: number;
};

type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isOptionalNote(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalAcceptanceBasis(
  value: unknown,
): value is DepartmentRecord["합격자기준"] {
  return value === undefined
    || value === "최초"
    || value === "최종"
    || value === "확인불가";
}

export function isDepartmentRecord(value: unknown): value is DepartmentRecord {
  if (!isObject(value)) {
    return false;
  }

  return isNonEmptyString(value["대학명"])
    && isNonEmptyString(value["연도"])
    && isNonEmptyString(value["학과"])
    && isNonEmptyString(value["학과_원본명"])
    && isNullableFiniteNumber(value["모집인원"])
    && isNullableFiniteNumber(value["지원인원"])
    && isNullableFiniteNumber(value["합격인원"])
    && isNullableFiniteNumber(value["최종합격_토익환산점수"])
    && isNullableFiniteNumber(value["최종합격_토익원점수"])
    && isNullableFiniteNumber(value["최종합격_학점환산점수"])
    && isNullableFiniteNumber(value["최종합격_학점원점수_100점만점"])
    && isOptionalNote(value["비고"])
    && isOptionalAcceptanceBasis(value["합격자기준"]);
}

function isExceptionDepartmentRecord(
  value: unknown,
): value is ExceptionDepartmentRecord {
  return isDepartmentRecord(value)
    && isObject(value)
    && isNonEmptyString(value["제거사유"]);
}

function validateRecordArray<T extends DepartmentRecord>(
  value: unknown,
  label: string,
  validator: (record: unknown) => record is T,
): T[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} 데이터는 배열이어야 합니다.`);
  }

  const records = value.map((record, index) => {
    if (!validator(record)) {
      throw new TypeError(`${label} 데이터의 ${index + 1}번째 레코드 형식이 잘못되었습니다.`);
    }

    return record;
  });
  const keys = new Set<string>();

  records.forEach((record) => {
    const key = `${record.대학명}\u0000${record.연도}\u0000${record.학과}`;

    if (keys.has(key)) {
      throw new TypeError(
        `${label} 데이터에 중복 레코드가 있습니다: ${record.대학명} ${record.연도} ${record.학과}`,
      );
    }

    keys.add(key);
  });

  return records;
}

function getDepartmentRecordKey(record: DepartmentRecord): string {
  return `${record.대학명}\u0000${record.연도}\u0000${record.학과}`;
}

function hasInvalidIdentity(record: DepartmentRecord): boolean {
  const numericOnlyName = /^\d+(?:[.,]\d+)?$/;
  return numericOnlyName.test(record.학과.trim())
    || numericOnlyName.test(record.학과_원본명.trim());
}

function hasInvalidCount(record: DepartmentRecord): boolean {
  return [record.모집인원, record.지원인원, record.합격인원].some((value) => (
    value !== null && (!Number.isInteger(value) || value < 0)
  ));
}

function hasUndisclosedZeroSentinel(record: DepartmentRecord): boolean {
  return record.최종합격_토익환산점수 === 0
    && record.최종합격_토익원점수 === 0
    && record.최종합격_학점환산점수 === 0
    && record.최종합격_학점원점수_100점만점 === 0;
}

function isValidRawToeic(value: number | null): boolean {
  return value === null || (value >= 100 && value <= 990);
}

function isValidRawGpa(value: number | null): boolean {
  return value === null || (value >= 0 && value <= 100);
}

function isValidConvertedScore(value: number | null): boolean {
  return value === null || value >= 0;
}

function prepareValidatedRecords<T extends DepartmentRecord>(
  records: T[],
  requireSupportedFormula: boolean,
): PreparedDepartmentRecords<T> {
  const preparedRecords: T[] = [];
  const issues: DepartmentDataIssue[] = [];

  records.forEach((record) => {
    const key = getDepartmentRecordKey(record);

    if (hasInvalidIdentity(record)) {
      issues.push({ key, reason: "invalid-identity" });
      return;
    }
    if (hasInvalidCount(record)) {
      issues.push({ key, reason: "invalid-count" });
      return;
    }
    if (
      requireSupportedFormula
      && getConversionFormula(record.대학명, record.연도) === null
    ) {
      issues.push({ key, reason: "unsupported-formula" });
      return;
    }

    if (hasUndisclosedZeroSentinel(record)) {
      preparedRecords.push({
        ...record,
        최종합격_토익환산점수: null,
        최종합격_토익원점수: null,
        최종합격_학점환산점수: null,
        최종합격_학점원점수_100점만점: null,
      });
      issues.push({ key, reason: "undisclosed-zero-sentinel" });
      return;
    }

    const hasInvalidRawScore = !isValidRawToeic(record.최종합격_토익원점수)
      || !isValidRawGpa(record.최종합격_학점원점수_100점만점);
    const hasInvalidConvertedScore = !isValidConvertedScore(
      record.최종합격_토익환산점수,
    ) || !isValidConvertedScore(record.최종합격_학점환산점수);

    if (hasInvalidRawScore) {
      issues.push({ key, reason: "invalid-raw-score" });
    }
    if (hasInvalidConvertedScore) {
      issues.push({ key, reason: "invalid-converted-score" });
    }

    if (!hasInvalidRawScore && !hasInvalidConvertedScore) {
      preparedRecords.push(record);
      return;
    }

    preparedRecords.push({
      ...record,
      최종합격_토익환산점수: isValidConvertedScore(
        record.최종합격_토익환산점수,
      ) ? record.최종합격_토익환산점수 : null,
      최종합격_토익원점수: isValidRawToeic(
        record.최종합격_토익원점수,
      ) ? record.최종합격_토익원점수 : null,
      최종합격_학점환산점수: isValidConvertedScore(
        record.최종합격_학점환산점수,
      ) ? record.최종합격_학점환산점수 : null,
      최종합격_학점원점수_100점만점: isValidRawGpa(
        record.최종합격_학점원점수_100점만점,
      ) ? record.최종합격_학점원점수_100점만점 : null,
    });
  });

  return {
    records: preparedRecords,
    issues,
    affectedRecordCount: new Set(issues.map((issue) => issue.key)).size,
  };
}

export function validateDepartmentRecords(
  value: unknown,
): DepartmentRecord[] {
  return validateRecordArray(value, "표준 입결", isDepartmentRecord);
}

export function validateExceptionDepartmentRecords(
  value: unknown,
): ExceptionDepartmentRecord[] {
  return validateRecordArray(value, "예외 학과", isExceptionDepartmentRecord);
}

export function prepareDepartmentRecords(
  value: unknown,
): PreparedDepartmentRecords<DepartmentRecord> {
  return prepareValidatedRecords(validateDepartmentRecords(value), true);
}

export function prepareExceptionDepartmentRecords(
  value: unknown,
): PreparedDepartmentRecords<ExceptionDepartmentRecord> {
  return prepareValidatedRecords(validateExceptionDepartmentRecords(value), false);
}
