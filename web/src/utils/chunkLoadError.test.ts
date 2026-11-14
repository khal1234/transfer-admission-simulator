import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./chunkLoadError";

// 미리보기를 열어 둔 채 새로 빌드했더니 «차트를 표시하지 못했습니다»만 뜨고 까닭을 알 수 없었다(2026-11-15 사용자 지적).
describe("조각 파일을 못 받은 오류 가리기", () => {
  it("브라우저마다 다른 «모듈을 못 받았다» 문구를 알아본다", () => {
    [
      "Failed to fetch dynamically imported module: https://example.test/assets/TrendChart-abc.js",
      "error loading dynamically imported module: https://example.test/assets/TrendChart-abc.js",
      "Importing a module script failed.",
      "Unable to preload CSS for /assets/TrendChart-abc.css",
    ].forEach((message) => {
      expect(isChunkLoadError(new TypeError(message)), message).toBe(true);
    });
  });

  it("차트를 그리다 난 오류는 조각 파일 오류로 보지 않는다", () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isChunkLoadError("알 수 없는 오류")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
