import { describe, expect, it } from "vitest";
import { captureFileName, capturePixelRatio, formatCaptureDate } from "./captureImage";

describe("지망 장바구니 사진 저장", () => {
  it("파일 이름과 사진에 찍히는 날짜는 저장한 날이다", () => {
    const day = new Date(2026, 10, 5);

    expect(captureFileName(day)).toBe("편입-지망-2026-11-05.png");
    expect(formatCaptureDate(day)).toBe("2026. 11. 5.");
  });

  it("보통은 2배로 찍고, 화면 배율이 더 높으면 3배까지만 올린다", () => {
    expect(capturePixelRatio(960, 1200, 1)).toBe(2);
    expect(capturePixelRatio(375, 1500, 3)).toBe(3);
    expect(capturePixelRatio(375, 1500, 4)).toBe(3);
  });

  // 아이폰 사파리는 캔버스가 너무 크면 빈 그림을 낸다.
  it("지망이 많아 사진이 길면 넓이 상한 안에 들도록 선명도를 낮춘다", () => {
    const width = 960;
    const height = 9000;
    const ratio = capturePixelRatio(width, height, 2);

    expect(ratio).toBeLessThan(2);
    expect(width * ratio * height * ratio).toBeLessThanOrEqual(12_000_000 * 1.0001);
  });

  it("크기를 못 잰 경우에도 쓸 수 있는 배율을 낸다", () => {
    expect(capturePixelRatio(0, 0, 1)).toBe(2);
  });
});
