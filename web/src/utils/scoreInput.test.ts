import { describe, expect, it } from "vitest";
import {
  convertGpa100ToInput,
  getGpaInputProblem,
  getToeicInputProblem,
  normalizeGpaInput,
  parseGpaInput,
  parseToeicInput,
  restoreCanonicalGpa100,
  restoreGpaInput,
  restoreToeicInput,
} from "./scoreInput";

describe("parseToeicInput", () => {
  it("accepts TOEIC scores in the supported range and step", () => {
    expect(parseToeicInput("100")).toBe(100);
    expect(parseToeicInput("850")).toBe(850);
    expect(parseToeicInput("990")).toBe(990);
  });

  it("rejects empty, malformed, out-of-range, and off-step values", () => {
    expect(parseToeicInput("")).toBeNull();
    expect(parseToeicInput("850점")).toBeNull();
    expect(parseToeicInput("95")).toBeNull();
    expect(parseToeicInput("995")).toBeNull();
    expect(parseToeicInput("851")).toBeNull();
  });
});

describe("parseGpaInput", () => {
  it("validates each GPA scale independently", () => {
    expect(parseGpaInput("0", "100")).toBe(0);
    expect(parseGpaInput("92.5", "100")).toBe(92.5);
    expect(parseGpaInput("3.75", "4.5")).toBe(3.75);
    expect(parseGpaInput("4.1", "4.3")).toBe(4.1);
  });

  it("rejects empty, zero on grade-point scales, and out-of-range values", () => {
    expect(parseGpaInput("", "100")).toBeNull();
    expect(parseGpaInput("0", "4.5")).toBeNull();
    expect(parseGpaInput("4.6", "4.5")).toBeNull();
    expect(parseGpaInput("4.4", "4.3")).toBeNull();
  });
});

describe("score input boundaries", () => {
  it("범위 밖 숫자를 고치지 않고 무엇이 틀렸는지 알려 준다", () => {
    expect(getToeicInputProblem("1000")).toBe("out-of-range");
    expect(getToeicInputProblem("-5")).toBe("out-of-range");
    expect(getToeicInputProblem("853")).toBe("not-step");
    expect(getToeicInputProblem("")).toBe("empty");
    expect(getToeicInputProblem("850")).toBeNull();
    expect(getGpaInputProblem("101", "100")).toBe("above-max");
    // 4.5 만점 칸에 백분위 90 을 친 경우 — 만점으로 바꾸지 않는다.
    expect(getGpaInputProblem("90", "4.5")).toBe("above-max");
    expect(parseGpaInput("90", "4.5")).toBeNull();
    expect(getGpaInputProblem("-1", "4.5")).toBe("below-min");
    expect(getGpaInputProblem("3.8", "4.5")).toBeNull();
  });

  it("칸을 벗어날 때 범위 안 값만 소수 둘째 자리로 다듬는다", () => {
    expect(normalizeGpaInput("3.456", "4.5")).toBe("3.46");
    expect(normalizeGpaInput("101", "100")).toBe("101");
    expect(normalizeGpaInput("4.75", "4.5")).toBe("4.75");
    expect(normalizeGpaInput("90", "4.5")).toBe("90");
  });
});

describe("stored score restoration", () => {
  it("keeps valid stored values", () => {
    expect(restoreToeicInput("900")).toBe("900");
    expect(restoreGpaInput("3.8", "4.5")).toBe("3.8");
  });

  it("falls back safely when stored values are missing or invalid", () => {
    // 저장값이 없거나 깨졌으면 남의 점수 대신 빈칸으로 시작한다.
    expect(restoreToeicInput("2000")).toBe("");
    expect(restoreGpaInput("90", "4.5")).toBe("");
    expect(restoreGpaInput(null, "4.3")).toBe("");
  });
});

describe("canonical GPA restoration", () => {
  it("prefers a saved canonical percentile over a rounded display scale", () => {
    expect(restoreCanonicalGpa100("90", "3.65", "4.5")).toBe(90);
  });

  it("migrates legacy raw GPA storage to a percentile", () => {
    expect(restoreCanonicalGpa100(null, "3.65", "4.5")).toBe(90.29);
  });
});

describe("convertGpa100ToInput", () => {
  it("does not silently raise a percentile that the target scale cannot represent", () => {
    expect(convertGpa100ToInput(59.99, "4.5")).toBeNull();
    expect(convertGpa100ToInput(0, "4.3")).toBeNull();
  });

  it("preserves supported percentile values across scale changes", () => {
    expect(convertGpa100ToInput(60, "4.5")).toBe(1);
    expect(convertGpa100ToInput(100, "4.3")).toBe(4.3);
    expect(convertGpa100ToInput(90, "100")).toBe(90);
  });
});
