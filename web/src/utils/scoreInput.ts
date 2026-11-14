import { convertGpaTo100Scale } from "./converter";

export type GpaType = "100" | "4.5" | "4.3";

export const GPA_SCALE_MAX: Record<Exclude<GpaType, "100">, 4.5 | 4.3> = {
  "4.5": 4.5,
  "4.3": 4.3,
};

export function isGpaType(value: string | null): value is GpaType {
  return value === "100" || value === "4.5" || value === "4.3";
}

export function parseToeicInput(input: string): number | null {
  if (input.trim() === "") {
    return null;
  }

  const value = Number(input);
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 100 ||
    value > 990 ||
    value % 5 !== 0
  ) {
    return null;
  }

  return value;
}

/**
 * 범위 밖 숫자는 고치지 않고 그대로 둔다.
 *
 * 예전에는 991 → 990, 4.5 만점 칸의 90 → 4.5 처럼 말없이 잘라 넣었다. 척도를
 * 잘못 고른 채 백분위를 친 사람이 만점자로 계산되고도 알 길이 없었다(2026-11-14
 * 검토 6번). 값을 그대로 두면 parse*Input 이 null 을 돌려 계산이 멈추고, 칸
 * 아래에 무엇이 틀렸는지가 뜬다.
 */
export type ToeicInputProblem = "empty" | "not-number" | "out-of-range" | "not-step";

export function getToeicInputProblem(input: string): ToeicInputProblem | null {
  if (input.trim() === "") return "empty";
  const value = Number(input);
  if (!Number.isFinite(value)) return "not-number";
  if (value < 100 || value > 990) return "out-of-range";
  if (!Number.isInteger(value) || value % 5 !== 0) return "not-step";
  return null;
}

export type GpaInputProblem = "empty" | "not-number" | "above-max" | "below-min";

export function getGpaInputProblem(
  input: string,
  gpaType: GpaType,
): GpaInputProblem | null {
  if (input.trim() === "") return "empty";
  const value = Number(input);
  if (!Number.isFinite(value)) return "not-number";
  if (value > getGpaMax(gpaType)) return "above-max";
  if (value < (gpaType === "100" ? 0 : Number.EPSILON)) return "below-min";
  return null;
}

export function parseGpaInput(
  input: string,
  gpaType: GpaType
): number | null {
  if (input.trim() === "") {
    return null;
  }

  const value = Number(input);
  const max = gpaType === "100" ? 100 : Number(gpaType);
  const min = gpaType === "100" ? 0 : Number.EPSILON;

  if (!Number.isFinite(value) || value < min || value > max) {
    return null;
  }

  return value;
}

/** 칸을 벗어날 때 소수 둘째 자리로만 다듬는다. 범위 밖 값은 건드리지 않는다. */
export function normalizeGpaInput(input: string, gpaType: GpaType): string {
  if (parseGpaInput(input, gpaType) === null) {
    return input;
  }

  return (Math.round(Number(input) * 100) / 100).toString();
}

export function restoreToeicInput(saved: string | null): string {
  // 저장된 값이 없으면 빈칸으로 시작한다. 예전 기본값 850 은 처음 온 사람에게
  // 남의 점수로 낸 판정을 먼저 보여 줬다(2026-11-14 검토 7번).
  const parsed = saved === null ? null : parseToeicInput(saved);
  return parsed === null ? "" : parsed.toString();
}

export function restoreGpaInput(
  saved: string | null,
  gpaType: GpaType
): string {
  const parsed = saved === null ? null : parseGpaInput(saved, gpaType);
  return parsed === null ? "" : parsed.toString();
}

export function getGpaMax(gpaType: GpaType): number {
  return gpaType === "100" ? 100 : GPA_SCALE_MAX[gpaType];
}

export function getGpa100ForInput(
  gpaType: GpaType,
  gpaRaw: number
): number {
  if (gpaType === "100") {
    return Math.max(0, Math.min(100, gpaRaw));
  }

  return convertGpaTo100Scale(gpaRaw, GPA_SCALE_MAX[gpaType]);
}

export function restoreCanonicalGpa100(
  savedGpa100: string | null,
  gpaRawInput: string,
  gpaType: GpaType,
): number | null {
  const saved = savedGpa100 === null
    ? null
    : parseGpaInput(savedGpa100, "100");

  if (saved !== null) {
    return saved;
  }

  const gpaRaw = parseGpaInput(gpaRawInput, gpaType);
  return gpaRaw === null ? null : getGpa100ForInput(gpaType, gpaRaw);
}

export function convertGpa100ToInput(
  gpa100: number,
  targetType: GpaType
): number | null {
  const normalizedGpa100 = Math.max(0, Math.min(100, gpa100));

  if (targetType === "100") {
    return Math.round(normalizedGpa100 * 100) / 100;
  }

  if (normalizedGpa100 < 60) {
    return null;
  }

  const max = GPA_SCALE_MAX[targetType];
  const raw = 1 + ((normalizedGpa100 - 60) * (max - 1)) / 40;
  const roundedToStep = Math.round(raw / 0.05) * 0.05;
  const clamped = Math.max(0, Math.min(max, roundedToStep));

  return Math.round(clamped * 100) / 100;
}
