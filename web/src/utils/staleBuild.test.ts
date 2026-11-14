import { describe, expect, it } from "vitest";
import { decideStaleAction, parseBuildId } from "./staleBuild";

const OLD = "2026-11-15T03:00:00.000Z";
const NEW = "2026-11-15T09:00:00.000Z";

describe("stale build check", () => {
  it("leaves the page alone when the server has the same or an older build", () => {
    expect(decideStaleAction({ currentBuildId: NEW, latestBuildId: NEW, isFirstCheck: true, reloadedForBuildId: null })).toBe("none");
    expect(decideStaleAction({ currentBuildId: NEW, latestBuildId: OLD, isFirstCheck: true, reloadedForBuildId: null })).toBe("none");
    expect(decideStaleAction({ currentBuildId: OLD, latestBuildId: null, isFirstCheck: true, reloadedForBuildId: null })).toBe("none");
  });

  it("reloads once when a page that just opened is an older build", () => {
    expect(decideStaleAction({ currentBuildId: OLD, latestBuildId: NEW, isFirstCheck: true, reloadedForBuildId: null })).toBe("reload");
  });

  it("only notifies when it already reloaded for that build or the page is in use", () => {
    expect(decideStaleAction({ currentBuildId: OLD, latestBuildId: NEW, isFirstCheck: true, reloadedForBuildId: NEW })).toBe("notify");
    expect(decideStaleAction({ currentBuildId: OLD, latestBuildId: NEW, isFirstCheck: false, reloadedForBuildId: null })).toBe("notify");
  });

  it("reads the build id only from a well-formed version file", () => {
    expect(parseBuildId({ buildId: NEW })).toBe(NEW);
    expect(parseBuildId({ buildId: "어제" })).toBeNull();
    expect(parseBuildId({})).toBeNull();
    expect(parseBuildId("<!doctype html>")).toBeNull();
    expect(parseBuildId(null)).toBeNull();
  });
});
