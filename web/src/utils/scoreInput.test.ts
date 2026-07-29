import { describe, expect, it } from "vitest";
import {
  convertGpa100ToInput,
  limitGpaInput,
  limitToeicInput,
  normalizeGpaInput,
  normalizeToeicInput,
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
  it("clamps clearly out-of-range values while preserving partial input", () => {
    expect(limitToeicInput("1000")).toBe("990");
    expect(limitToeicInput("-5")).toBe("100");
    expect(limitToeicInput("85")).toBe("85");
    expect(limitGpaInput("101", "100")).toBe("100");
    expect(limitGpaInput("-1", "4.5")).toBe("0.01");
  });

  it("normalizes values to a valid score when editing finishes", () => {
    expect(normalizeToeicInput("99")).toBe("100");
    expect(normalizeToeicInput("851")).toBe("850");
    expect(normalizeToeicInput("989")).toBe("990");
    expect(normalizeGpaInput("101", "100")).toBe("100");
    expect(normalizeGpaInput("4.75", "4.5")).toBe("4.5");
  });
});

describe("stored score restoration", () => {
  it("keeps valid stored values", () => {
    expect(restoreToeicInput("900")).toBe("900");
    expect(restoreGpaInput("3.8", "4.5")).toBe("3.8");
  });

  it("falls back safely when stored values are missing or invalid", () => {
    expect(restoreToeicInput("2000")).toBe("850");
    expect(restoreGpaInput("90", "4.5")).toBe("3.65");
    expect(restoreGpaInput(null, "4.3")).toBe("3.5");
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
