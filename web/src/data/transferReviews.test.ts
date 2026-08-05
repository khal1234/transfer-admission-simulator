import { describe, expect, it } from "vitest";
import {
  REVIEW_UNIVERSITIES,
  TRANSFER_REVIEWS,
  getReviewKind,
} from "./transferReviews";

describe("TRANSFER_REVIEWS", () => {
  it("contains the 99 uniquely verified source posts", () => {
    expect(TRANSFER_REVIEWS).toHaveLength(99);
    expect(new Set(TRANSFER_REVIEWS.map(({ id }) => id)).size).toBe(99);
    expect(new Set(TRANSFER_REVIEWS.map(({ url }) => url)).size).toBe(99);
  });

  it("keeps every source link usable and excludes the removed question post", () => {
    for (const review of TRANSFER_REVIEWS) {
      const url = new URL(review.url);

      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("gall.dcinside.com");
      expect(url.searchParams.get("id")).toBe("natpass");
      expect(Number(url.searchParams.get("no"))).toBe(review.id);
      expect(review.title.trim()).not.toBe("");
      expect(review.departmentGroup.trim()).not.toBe("");
    }

    expect(TRANSFER_REVIEWS.some(({ id }) => id === 6274)).toBe(false);
  });

  it("stores multi-university posts once while exposing their related universities", () => {
    const comparisonReviews = TRANSFER_REVIEWS.filter(({ comparison }) => comparison);

    expect(comparisonReviews).toHaveLength(29);
    expect(TRANSFER_REVIEWS.filter(({ comparison }) => !comparison)).toHaveLength(70);
    expect(
      comparisonReviews.find(({ id }) => id === 614)?.universities,
    ).toEqual(["부산대학교", "경북대학교"]);
    expect(REVIEW_UNIVERSITIES).toHaveLength(10);
  });
});

describe("getReviewKind", () => {
  it("labels curated button titles by their most useful content type", () => {
    expect(getReviewKind("전공시험 합격수기")).toBe("합격수기");
    expect(getReviewKind("논리회로 문제 복원")).toBe("전공시험");
    expect(getReviewKind("전공 공부·면접 준비")).toBe("준비법");
    expect(getReviewKind("지원동기 면접질문")).toBe("면접후기");
  });
});
