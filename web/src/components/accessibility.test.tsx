import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DepartmentExplorer from "./DepartmentExplorer";
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

  it("publishes the latest simulator fixes in the update notice", () => {
    const notice = renderToStaticMarkup(<UpdateNotice />);

    expect(notice).toContain("업데이트 알림");
    expect(notice).toContain('aria-haspopup="dialog"');
    expect(UPDATE_NOTICE_DATE.iso).toBe("2026-08-04");
    expect(UPDATE_ITEMS[0]).toContain("업데이트 알림");
    expect(UPDATE_ITEMS[1]).toContain("지망 목록");
    expect(UPDATE_ITEMS[2]).toContain("제외 기록");
    expect(UPDATE_ITEMS[3]).toContain("로딩 부담");
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
