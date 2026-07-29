import { convertGpaTo100Scale } from "./converter";

export type GpaType = "100" | "4.5" | "4.3";

export const GPA_SCALE_MAX: Record<Exclude<GpaType, "100">, 4.5 | 4.3> = {
  "4.5": 4.5,
  "4.3": 4.3,
};

const DEFAULT_GPA_INPUT: Record<GpaType, string> = {
  "100": "90",
  "4.5": "3.65",
  "4.3": "3.5",
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

function clampNumericInput(
  input: string,
  min: number,
  max: number,
): string {
  if (input.trim() === "") {
    return input;
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    return input;
  }

  if (value > max) {
    return max.toString();
  }

  if (value < 0) {
    return min.toString();
  }

  return input;
}

export function limitToeicInput(input: string): string {
  return clampNumericInput(input, 100, 990);
}

export function normalizeToeicInput(input: string): string {
  if (input.trim() === "") {
    return input;
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    return input;
  }

  const clamped = Math.max(100, Math.min(990, value));
  return (Math.round(clamped / 5) * 5).toString();
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

export function limitGpaInput(input: string, gpaType: GpaType): string {
  const min = gpaType === "100" ? 0 : 0.01;
  return clampNumericInput(input, min, getGpaMax(gpaType));
}

export function normalizeGpaInput(input: string, gpaType: GpaType): string {
  if (input.trim() === "") {
    return input;
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    return input;
  }

  const min = gpaType === "100" ? 0 : 0.01;
  const normalized = Math.max(min, Math.min(getGpaMax(gpaType), value));
  return (Math.round(normalized * 100) / 100).toString();
}

export function restoreToeicInput(saved: string | null): string {
  const parsed = saved === null ? null : parseToeicInput(saved);
  return parsed === null ? "850" : parsed.toString();
}

export function restoreGpaInput(
  saved: string | null,
  gpaType: GpaType
): string {
  const parsed = saved === null ? null : parseGpaInput(saved, gpaType);
  return parsed === null ? DEFAULT_GPA_INPUT[gpaType] : parsed.toString();
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
