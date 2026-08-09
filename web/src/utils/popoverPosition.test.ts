import { describe, expect, it } from "vitest";
import { calculatePopoverPosition } from "./popoverPosition";

describe("calculatePopoverPosition", () => {
  it("end-aligns a table popover without crossing the viewport edge", () => {
    expect(calculatePopoverPosition({
      align: "end",
      popoverHeight: 220,
      popoverWidth: 300,
      triggerRect: { bottom: 600, left: 1810, right: 1890, top: 570 },
      viewportHeight: 1146,
      viewportWidth: 1994,
    })).toEqual({ left: 1590, maxHeight: 1122, top: 606 });
  });

  it("clamps a start-aligned popover away from the right edge", () => {
    expect(calculatePopoverPosition({
      align: "start",
      popoverHeight: 180,
      popoverWidth: 300,
      triggerRect: { bottom: 440, left: 1880, right: 1950, top: 410 },
      viewportHeight: 900,
      viewportWidth: 1994,
    }).left).toBe(1682);
  });

  it("opens above the trigger when the lower edge would be clipped", () => {
    expect(calculatePopoverPosition({
      align: "end",
      popoverHeight: 240,
      popoverWidth: 300,
      triggerRect: { bottom: 850, left: 1200, right: 1280, top: 820 },
      viewportHeight: 900,
      viewportWidth: 1440,
    }).top).toBe(574);
  });
});
