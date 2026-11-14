import { memo, useEffect, useState } from "react";
import { ChevronDown, Megaphone } from "lucide-react";
import {
  GUIDELINE_CHANGES,
  hasScoreAffectingChange,
  type UniversityGuidelineChange,
} from "../utils/guidelineChanges";
import UniversityName from "./UniversityName";

const VERDICT_LABEL: Record<UniversityGuidelineChange["verdict"], string> = {
  changed: "달라짐",
  same: "작년과 같음",
  unknown: "아직 판단 불가",
};

const VERDICT_ORDER: Record<UniversityGuidelineChange["verdict"], number> = {
  changed: 0,
  unknown: 1,
  same: 2,
};

const PANEL_ID = "guideline-changes";

/**
 * 새 학년도 지원자에게 「계산은 지난 학년도 식」이라는 사실과 달라진 점을 알린다.
 *
 * 지금 이 사이트를 쓰는 사람은 다음 학년도 지원자인데 화면 어디에도 그 학년도
 * 글자가 없었다(2026-11-14 검토 3번). 내용은 guidelineChanges.json 이 정본이고,
 * 새 모집요강이 나오면 그 파일만 다시 만들면 된다.
 */
function GuidelineChangesPanel() {
  const { targetYear, baseYear, universities } = GUIDELINE_CHANGES;
  const [open, setOpen] = useState(false);

  // 카드의 「달라진 점 보기」(#guideline-changes)로 오면 펼쳐서 보여 준다.
  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash === `#${PANEL_ID}`) {
        setOpen(true);
      }
    };

    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, []);

  // 내 점수 계산이 달라지는 대학을 맨 앞에 둔다.
  const ordered = [...universities].sort((a, b) => (
    VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]
      || Number(hasScoreAffectingChange(b)) - Number(hasScoreAffectingChange(a))
      || a.univ.localeCompare(b.univ, "ko")
  ));
  const changed = ordered.filter((entry) => entry.verdict === "changed");
  const scoreChanged = changed.filter(hasScoreAffectingChange);
  const otherChanged = changed.filter((entry) => !hasScoreAffectingChange(entry));
  const short = (university: string) => university.replace(/대학교$/, "대");
  const names = (entries: UniversityGuidelineChange[]) => (
    entries.map((entry) => short(entry.univ)).join(" · ")
  );

  return (
    <section className="guideline-changes" id={PANEL_ID} aria-labelledby="guideline-changes-title">
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>
          <span className="guideline-changes-heading">
            <Megaphone size={18} aria-hidden="true" />
            <strong id="guideline-changes-title">{targetYear}학년도 지원자라면</strong>
          </span>
          <span className="guideline-changes-lead">
            이 사이트의 점수 계산과 합격 평균은 {baseYear}학년도까지의 자료입니다.{" "}
            {changed.length === 0
              ? `${targetYear}학년도에 달라진 점이 확인된 대학은 아직 없습니다.`
              : [
                scoreChanged.length > 0
                  ? `${targetYear}학년도에 점수 계산이 달라지는 대학: ${names(scoreChanged)}.`
                  : null,
                otherChanged.length > 0
                  ? `영어 성적 인정 기간·모집단위 등이 달라진 대학: ${names(otherChanged)}.`
                  : null,
              ].filter(Boolean).join(" ")}
          </span>
          <span className="guideline-changes-toggle">
            달라진 점 {open ? "접기" : "보기"}
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </summary>

        <div className="guideline-changes-body">
          <p className="guideline-changes-legend">
            각 대학의 {targetYear}학년도 문서(모집요강 · 기본계획 · 주요사항 가운데 가장
            확정된 것)를 {baseYear}학년도 모집요강과 맞대 본 결과입니다. 모집요강이 아직
            나오지 않은 대학은 바뀔 수 있으니 원서 접수 전에 반드시 원문을 확인해 주세요.
          </p>

          <div className="guideline-university-list">
            {ordered.map((entry) => (
              <article
                className={`guideline-university guideline-university--${entry.verdict}`}
                key={entry.univ}
              >
                <header>
                  <UniversityName university={entry.univ} logoSize="small" />
                  <span className={`guideline-verdict guideline-verdict--${entry.verdict}`}>
                    {VERDICT_LABEL[entry.verdict]}
                  </span>
                  <span className="guideline-document-kind">{entry.documentKind} 기준</span>
                  {hasScoreAffectingChange(entry) && (
                    <span className="guideline-score-chip">내 점수 계산에 영향</span>
                  )}
                </header>
                <p className="guideline-headline">{entry.headline}</p>

                {entry.changes.length > 0 && (
                  <ul className="guideline-change-list">
                    {entry.changes.map((change) => (
                      <li key={`${change.area}|${change.scope}|${change.after}`}>
                        <p className="guideline-change-title">
                          <span className="guideline-change-area">{change.area}</span>
                          {change.scope}
                        </p>
                        <dl>
                          <div>
                            <dt>{baseYear}</dt>
                            <dd>{change.before}</dd>
                          </div>
                          <div className="guideline-change-after">
                            <dt>{targetYear}</dt>
                            <dd>{change.after}</dd>
                          </div>
                        </dl>
                        {change.impact !== null && (
                          <p className="guideline-change-impact">→ {change.impact}</p>
                        )}
                        <p className="guideline-change-pages">
                          확인할 곳:{" "}
                          {change.pageBefore === null
                            ? ""
                            : `${baseYear} 요강 ${change.pageBefore} · `}
                          {targetYear} {entry.documentKind} {change.pageAfter}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="guideline-source">
                  근거 문서: {entry.documentTitle}
                  {!entry.ownerConfirmed && (
                    <span
                      className="guideline-unconfirmed"
                      title="문서를 자동으로 맞대 본 결과이고, 운영자가 원문을 보고 확인하기 전입니다."
                    >
                      자동 대조 · 운영자 확인 전
                    </span>
                  )}
                </p>
              </article>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

export default memo(GuidelineChangesPanel);
