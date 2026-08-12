import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DepartmentExplorer from "./DepartmentExplorer";
import DataConfidenceBadge from "./DataConfidenceBadge";
import SpecInputPanel from "./SpecInputPanel";
import TransferReviewLinks from "./TransferReviewLinks";
import TrendChart from "./TrendChart";
import UpdateNotice from "./UpdateNotice";
import {
  UPDATE_ITEMS,
  UPDATE_NOTICE_DATE,
} from "./updateNoticeContent";
import { focusElement } from "../utils/focusManagement";
import type { DepartmentRecord } from "../utils/converter";
import { getDepartmentGroupKey } from "../utils/departmentSearch";
import { getRecentHistoryStatus } from "../utils/historyStatus";
import { getRecordKey } from "../utils/targets";


const record: DepartmentRecord = {
  대학명: "강원대학교",
  연도: "2026",
  학과: "기계의용ㆍ메카트로닉스공학과",
  학과_원본명: "기계의용ㆍ메카트로닉스공학과",
  모집인원: 4,
  지원인원: 20,
  합격인원: 4,
  최종합격_토익환산점수: 120,
  최종합격_토익원점수: 800,
  최종합격_학점환산점수: null,
  최종합격_학점원점수_100점만점: null,
  합격자기준: "최종",
};

describe("component accessibility contracts", () => {
  it("names the GPA scale and university filter groups and exposes pressed state", () => {
    const spec = renderToStaticMarkup(
      <SpecInputPanel
        toeicInput="850"
        toeic={850}
        gpaType="4.5"
        gpaRawInput="3.5"
        gpaRaw={3.5}
        gpa100={88.57}
        onToeicInputChange={vi.fn()}
        onToeicInputBlur={vi.fn()}
        onGpaRawInputChange={vi.fn()}
        onGpaRawInputBlur={vi.fn()}
        onGpaTypeChange={vi.fn()}
      />,
    );
    const explorer = renderToStaticMarkup(
      <DepartmentExplorer
        records={[record]}
        targetKeys={new Set()}
        onToggleTarget={vi.fn()}
      />,
    );
    const reviews = renderToStaticMarkup(<TransferReviewLinks />);

    expect(spec).toContain('role="group" aria-label="GPA 척도 선택"');
    expect(spec).toContain('aria-pressed="true"');
    expect(explorer).toContain('role="group" aria-label="대학 필터"');
    expect(explorer).toContain('aria-pressed="true"');
    expect(reviews).toContain('<details class="transfer-reviews-disclosure">');
    expect(reviews).toContain('<summary class="transfer-reviews-summary">');
    expect(reviews).toContain('role="group" aria-label="후기 대학 필터"');
  });

  it("moves focus only to a connected target, supporting chart open and close restoration", () => {
    const focus = vi.fn();

    expect(focusElement({ focus, isConnected: true })).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
    expect(focusElement({ focus, isConnected: false })).toBe(false);
    expect(focus).toHaveBeenCalledOnce();
  });

  it("renders a named chart control as the initial focus destination", () => {
    const target = { univ: record.대학명, dept: record.학과 };
    const chart = renderToStaticMarkup(
      <TrendChart
        focusedTarget={target}
        targets={[target]}
        recordsByDepartment={new Map([[getRecordKey(record.대학명, record.학과), [record]]])}
        metric="toeic_orig"
        onMetricChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(chart).toContain('data-chart-initial-focus="true"');
    expect(chart).toContain('aria-label="차트 지표 선택"');
  });

  /**
   * 예전에는 여기서 날짜와 문구를 통째로 못 박고 있었다
   * (`expect(UPDATE_NOTICE_DATE.iso).toBe("2026-08-09")` 식).
   *
   * 방향이 반대였다 — 알림을 **잊었을 때는 통과하고, 갱신했을 때 깨진다.**
   * 실제로 2026-08-12 데이터 수정 3건이 알림 없이 그대로 커밋·푸시됐고
   * 이 검사는 내내 초록이었다. 잊는 것을 막지 못하는 검사는 갱신하는 쪽만
   * 귀찮게 한다.
   *
   * 그래서 여기서는 **모양만** 본다. '알림이 최신인가'는 내용으로 알 수 없고
   * 커밋 이력과 견줘야 하므로 tools/check_update_notice.py 가 맡는다.
   */
  it("keeps the update notice well-formed", () => {
    const notice = renderToStaticMarkup(<UpdateNotice />);

    expect(notice).toContain("업데이트 알림");
    expect(notice).toContain('aria-haspopup="dialog"');

    expect(UPDATE_NOTICE_DATE.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(UPDATE_NOTICE_DATE.iso))).toBe(false);

    // 화면에 뜨는 라벨과 iso 가 다른 날을 가리키면 안 된다.
    const [year, month, day] = UPDATE_NOTICE_DATE.iso.split("-");
    expect(UPDATE_NOTICE_DATE.label)
      .toBe(`${year}. ${Number(month)}. ${Number(day)}.`);

    expect(UPDATE_ITEMS.length).toBeGreaterThan(0);
    // 맨 위가 최신이라는 약속(AGENTS.md)이라 첫 항목은 반드시 실물이어야 한다.
    expect(UPDATE_ITEMS[0].trim().length).toBeGreaterThan(10);
    UPDATE_ITEMS.forEach((item) => expect(item.trim()).not.toBe(""));
    expect(new Set(UPDATE_ITEMS).size).toBe(UPDATE_ITEMS.length);
  });

  it("connects data confidence controls to their dismissible explanation", () => {
    const badge = renderToStaticMarkup(
      <DataConfidenceBadge
        confidence={{
          level: "low",
          label: "주의 필요",
          reasons: ["환산식에 추정 또는 근사값이 포함됩니다."],
        }}
        compact
      />,
    );

    expect(badge).toContain('aria-expanded="false"');
    expect(badge).toMatch(/aria-controls="([^"]+)"/);
    expect(badge).toContain('aria-label="데이터 신뢰도: 주의 필요"');
  });
});

describe("TargetBasket recent history states", () => {
  it("locks the 2025 Kangwon renamed-department case as recruited under another name", () => {
    expect(getDepartmentGroupKey("기계의용·메카트로닉스공학과")).toBe(
      getDepartmentGroupKey("기계의용·메카트로닉스공학부(기계의용공학전공)"),
    );
    const status = getRecentHistoryStatus({
      year: "2025",
      record: null,
      exclusionReason: null,
      exceptionLookupStatus: "ready",
      siblingDepartments: [
        "기계의용·메카트로닉스공학부(기계의용공학전공)",
        "기계의용·메카트로닉스공학부(메카트로닉스공학전공)",
      ],
    });

    expect(status.kind).toBe("renamed");
    expect(status.label).toBe("다른 이름으로 모집");
    expect(status.title).toContain("기계의용·메카트로닉스공학부(기계의용공학전공)");
  });

  it("distinguishes exact, excluded, loading, error, and unknown histories", () => {
    const base = {
      year: "2025",
      record: null,
      exclusionReason: null,
      exceptionLookupStatus: "ready" as const,
      siblingDepartments: [],
    };

    expect(getRecentHistoryStatus({ ...base, record }).kind).toBe("exact");
    expect(getRecentHistoryStatus({ ...base, exclusionReason: "학사편입" }).kind).toBe("excluded");
    expect(getRecentHistoryStatus({ ...base, exceptionLookupStatus: "loading" }).kind).toBe("loading");
    expect(getRecentHistoryStatus({ ...base, exceptionLookupStatus: "error" }).kind).toBe("error");
    expect(getRecentHistoryStatus(base).label).toBe("모집 여부 또는 자료 확인 불가");
  });

  it("prefers an exact exclusion record over a similarly named sibling", () => {
    const status = getRecentHistoryStatus({
      year: "2025",
      record: null,
      exclusionReason: "실기 중심 별도 전형",
      exceptionLookupStatus: "ready",
      siblingDepartments: ["체육학부(스포츠과학전공)"],
    });

    expect(status.kind).toBe("excluded");
    expect(status.title).toBe("실기 중심 별도 전형");
  });
});
