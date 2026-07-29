import { describe, expect, it } from "vitest";
import {
  getRecordKey,
  parseSavedTargets,
  type Target,
} from "./targets";

const defaults: Target[] = [
  { univ: "부산대학교", dept: "기계공학부" },
];
const validKeys = new Set([
  getRecordKey("부산대학교", "기계공학부"),
  getRecordKey("경북대학교", "기계공학과"),
]);

describe("parseSavedTargets", () => {
  it("preserves an intentionally empty basket", () => {
    expect(parseSavedTargets("[]", validKeys, defaults)).toEqual([]);
  });

  it("removes duplicate and stale targets while preserving order", () => {
    const saved = JSON.stringify([
      { univ: "경북대학교", dept: "기계공학과" },
      { univ: "경북대학교", dept: "기계공학과" },
      { univ: "없는대학교", dept: "없는학과" },
      { univ: "부산대학교", dept: "기계공학부" },
    ]);

    expect(parseSavedTargets(saved, validKeys, defaults)).toEqual([
      { univ: "경북대학교", dept: "기계공학과" },
      { univ: "부산대학교", dept: "기계공학부" },
    ]);
  });

  it("restores defaults for malformed JSON or invalid shapes", () => {
    expect(parseSavedTargets("{", validKeys, defaults)).toEqual(defaults);
    expect(
      parseSavedTargets(
        JSON.stringify([{ univ: "부산대학교" }]),
        validKeys,
        defaults
      )
    ).toEqual(defaults);
  });
});
