/**
 * 환산식 정본이 둘로 갈라지는 것을 막는 대조 테스트.
 *
 * 배경: 계산에 실제로 쓰이는 것은 `formulaRegistry.ts`(TS 코드)인데,
 * 모집요강에서 뽑아낸 `편입_환산공식_통합.json`은 어느 코드도 읽지 않는 채
 * 따로 남아 있었다. 그래서 둘이 어긋나도 빌드·테스트·화면 어디서도 드러나지
 * 않았다. 실제로 강원대 2026이 그렇게 어긋난 채 배포돼 있었다.
 *
 * 여기서 검사하는 불변식 (JSON 27건 중 26건이 이미 만족한다):
 *   1. convertEnglish(990) === 공인영어_환산공식.배점   (만점이면 배점 만점)
 *   2. 전적대성적_환산공식.공식유형 == null  ⟺  convertGpa === null
 *   3. gpaSlope100 === 비례계수 / 100,  convertGpa(0) === 기본점수 ?? 0
 *
 * 아직 못 고친 불일치는 KNOWN_DIVERGENCES에 근거와 함께 적어 통과시키되,
 * **적어둔 불일치가 실제로 아직 불일치인지도 함께 검사한다.** 원문 대조로
 * 해소되면 이 테스트가 깨져서 예외 항목을 지우도록 강제한다 — 예외가
 * 조용히 남아 썩는 것을 막는 장치다.
 */
import { describe, expect, it } from "vitest";
import rawFormulaData from "../data/편입_환산공식_통합.json";
import { getConversionFormula } from "./formulaRegistry";

type RawFormulaRecord = {
  대학명: string;
  연도: string;
  총점: number | null;
  배점: Record<string, number | null>;
  공인영어_환산공식: {
    공식유형: string;
    배점: number | null;
    만점기준: number;
  };
  전적대성적_환산공식: {
    공식유형: string | null;
    기본점수?: number | null;
    비례계수?: number | null;
  };
};

const formulaRecords = rawFormulaData as RawFormulaRecord[];

type ParityField =
  | "englishMaxScore"
  | "gpaReflected"
  | "gpaSlope"
  | "gpaBaseScore";

type Mismatch = {
  key: string;
  field: ParityField;
  expected: number | boolean | null;
  actual: number | boolean | null;
};

/**
 * 원문 대조가 끝나지 않아 아직 남겨둔 불일치.
 * 해소하면 항목을 지운다 — 안 지우면 아래 두 번째 테스트가 실패한다.
 */
const KNOWN_DIVERGENCES: Record<string, { fields: ParityField[]; reason: string }> = {
  // 2026-07-31 현재 비어 있다. 강원대 2026이 여기 있었는데,
  // 26_강원대_모집요강.pdf 13쪽 배점표(공인영어 150점 · 전적대 미반영)로
  // 원문 대조가 끝나 JSON 쪽을 고쳤다. 아래 세 번째 테스트가 "적어둔 불일치가
  // 아직 실제로 불일치인가"를 검사하기 때문에, 해소하고도 항목을 남겨두면
  // 테스트가 깨져 지우도록 강제된다 — 실제로 그렇게 걸려서 지웠다.
};

const MAX_TOEIC = 990;

function collectMismatches(): Mismatch[] {
  const mismatches: Mismatch[] = [];

  for (const record of formulaRecords) {
    const key = `${record.대학명}|${record.연도}`;
    const formula = getConversionFormula(record.대학명, record.연도);

    // 커버리지 자체는 별도 테스트에서 본다. 여기서는 비교만 한다.
    if (!formula) continue;

    const englishMax = record.공인영어_환산공식.배점;
    if (englishMax !== null) {
      const actual = formula.convertEnglish?.(MAX_TOEIC) ?? null;
      if (actual === null || Math.abs(actual - englishMax) > 0.01) {
        mismatches.push({
          key,
          field: "englishMaxScore",
          expected: englishMax,
          actual: actual === null ? null : Number(actual.toFixed(2)),
        });
      }
    }

    const gpaReflectedInSource = record.전적대성적_환산공식.공식유형 !== null;
    const gpaReflectedInRegistry = formula.convertGpa !== null;
    if (gpaReflectedInSource !== gpaReflectedInRegistry) {
      mismatches.push({
        key,
        field: "gpaReflected",
        expected: gpaReflectedInSource,
        actual: gpaReflectedInRegistry,
      });
    }

    if (gpaReflectedInSource) {
      const coefficient = record.전적대성적_환산공식.비례계수;
      if (coefficient != null) {
        const expectedSlope = coefficient / 100;
        if (Math.abs(formula.gpaSlope100 - expectedSlope) > 0.0001) {
          mismatches.push({
            key,
            field: "gpaSlope",
            expected: expectedSlope,
            actual: formula.gpaSlope100,
          });
        }
      }

      if (gpaReflectedInRegistry) {
        const expectedBase = record.전적대성적_환산공식.기본점수 ?? 0;
        const actualBase = formula.convertGpa!(0);
        if (Math.abs(actualBase - expectedBase) > 0.01) {
          mismatches.push({
            key,
            field: "gpaBaseScore",
            expected: expectedBase,
            actual: Number(actualBase.toFixed(2)),
          });
        }
      }
    }
  }

  return mismatches;
}

function isDeclared(mismatch: Mismatch): boolean {
  return Boolean(
    KNOWN_DIVERGENCES[mismatch.key]?.fields.includes(mismatch.field)
  );
}

describe("formulaRegistry ↔ 편입_환산공식_통합.json parity", () => {
  it("covers every university and year present in the source JSON", () => {
    const uncovered = formulaRecords
      .filter((record) => !getConversionFormula(record.대학명, record.연도))
      .map((record) => `${record.대학명}|${record.연도}`);

    expect(uncovered).toEqual([]);
  });

  it("has no undeclared divergence from the source JSON", () => {
    const undeclared = collectMismatches().filter(
      (mismatch) => !isDeclared(mismatch)
    );

    expect(undeclared).toEqual([]);
  });

  it("keeps every declared divergence real, so resolved ones must be removed", () => {
    const actual = collectMismatches();
    const stale: string[] = [];

    for (const [key, entry] of Object.entries(KNOWN_DIVERGENCES)) {
      for (const field of entry.fields) {
        const stillDiverging = actual.some(
          (mismatch) => mismatch.key === key && mismatch.field === field
        );
        if (!stillDiverging) {
          stale.push(`${key} / ${field}`);
        }
      }
    }

    expect(stale).toEqual([]);
  });

  it("requires a written reason for every declared divergence", () => {
    for (const [key, entry] of Object.entries(KNOWN_DIVERGENCES)) {
      expect(entry.fields.length, `${key} 예외에 대상 필드가 없다`).toBeGreaterThan(0);
      expect(entry.reason.trim().length, `${key} 예외에 근거가 없다`).toBeGreaterThan(30);
    }
  });

  it("keeps 배점 breakdown consistent with 총점 where 총점 is recorded", () => {
    const inconsistent = formulaRecords
      .filter((record) => record.총점 !== null)
      .filter((record) => {
        const sum = Object.values(record.배점)
          .filter((value): value is number => value !== null)
          .reduce((total, value) => total + value, 0);
        return sum !== record.총점;
      })
      .map((record) => `${record.대학명}|${record.연도}`);

    expect(inconsistent).toEqual([]);
  });
});
