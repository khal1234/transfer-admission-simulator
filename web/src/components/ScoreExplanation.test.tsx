import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ScoreExplanation from "./ScoreExplanation";

describe("score explanation affordance", () => {
  it("renders a keyboard and touch operable button with an explicit explanation label", () => {
    const html = renderToStaticMarkup(<ScoreExplanation label="비공개 사유" description="개인정보 보호">비공개</ScoreExplanation>);
    expect(html).toContain('<button type="button"');
    expect(html).toContain('aria-label="비공개 사유 설명 보기"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("비공개");
  });
});
