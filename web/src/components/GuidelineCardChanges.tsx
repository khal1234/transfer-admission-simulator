import { ChevronDown } from "lucide-react";
import {
  getAreaLabel,
  type GuidelineChangeItem,
  type UniversityGuidelineChange,
} from "../utils/guidelineChanges";
import GuidelineChangeDetail from "./GuidelineChangeDetail";

/**
 * 지망 카드의 «달라진 점» 줄 목록. 한 줄에 제목만 보이고, 줄을 누르면 그 자리에서 전·후와 원문 쪽수가 펼쳐진다.
 *
 * 전·후 글을 처음부터 깔아 두면 카드 한 장이 화면 두세 장 길이가 됐다(2026-11-15 사용자 지적).
 */
export default function GuidelineCardChanges({
  entry,
  changes,
  baseYear,
  targetYear,
}: {
  entry: UniversityGuidelineChange;
  changes: GuidelineChangeItem[];
  baseYear: string;
  targetYear: string;
}) {
  return (
    <ul className="guideline-card-changes">
      {changes.map((change) => (
        <li key={change.title}>
          <details className="guideline-card-change">
            <summary>
              <span className="guideline-change-area">{getAreaLabel(change)}</span>
              <span className="guideline-card-change-title">{change.title}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <GuidelineChangeDetail
              entry={entry}
              change={change}
              baseYear={baseYear}
              targetYear={targetYear}
            />
          </details>
        </li>
      ))}
    </ul>
  );
}
