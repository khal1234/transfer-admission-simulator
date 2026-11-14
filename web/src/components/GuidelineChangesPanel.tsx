import { memo, useEffect, useMemo, useState } from "react";
import { ChevronDown, Megaphone } from "lucide-react";
import {
  GUIDELINE_CHANGES,
  getGuidelineGroups,
  getScoreChangeReach,
  isCommonChange,
  type GuidelineChangeItem,
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

/** 한 줄 앞에 붙는 짧은 갈래 이름. */
const AREA_SHORT: Record<string, string> = {
  공인영어: "영어",
  전적대성적: "전적대",
  지원자격: "자격",
  모집단위: "모집",
};

const PANEL_ID = "guideline-changes";

const shortName = (university: string) => university.replace(/대학교$/, "대");

/**
 * 달라진 점 한 줄. 제목만 보이고, 누르면 전·후와 볼 쪽이 펴진다.
 * 처음부터 전·후 글을 다 펼쳐 두면 46개 항목이 한 화면에 쏟아져 읽히지 않았다.
 */
function ChangeLine({
  entry,
  change,
  baseYear,
  targetYear,
  showUniversity = false,
}: {
  entry: UniversityGuidelineChange;
  change: GuidelineChangeItem;
  baseYear: string;
  targetYear: string;
  showUniversity?: boolean;
}) {
  return (
    <li>
      <details className="guideline-change">
        <summary>
          {showUniversity && (
            <span className="guideline-change-univ">{shortName(entry.univ)}</span>
          )}
          <span className="guideline-change-area">{AREA_SHORT[change.area] ?? change.area}</span>
          <span className="guideline-change-title">{change.title}</span>
          {change.affectsScore && <span className="guideline-score-chip">점수 계산</span>}
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <div className="guideline-change-detail">
          <p className="guideline-change-scope">해당: {change.scope}</p>
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
            {change.pageBefore === null ? "" : `${baseYear} 요강 ${change.pageBefore} · `}
            {targetYear} {entry.documentKind} {change.pageAfter}
          </p>
        </div>
      </details>
    </li>
  );
}

/**
 * 새 학년도 지원자에게 「계산은 지난 학년도 식」이라는 사실과 달라진 점을 알린다.
 *
 * 지금 이 사이트를 쓰는 사람은 다음 학년도 지원자인데 화면 어디에도 그 학년도
 * 글자가 없었다(2026-11-14 검토 3번). 내용은 guidelineChanges.json 이 정본이고,
 * 새 모집요강이 나오면 그 파일만 다시 만들면 된다.
 *
 * 보여 주는 순서: 학과를 가리지 않는 것만 대학별로 한 줄씩 → 학과별 항목은 접어 두고
 * 계열 단추(간호·약학 …)를 누르면 그 계열이 달라진 대학을 한데 모아 보여 준다.
 */
function GuidelineChangesPanel() {
  const { targetYear, baseYear, universities } = GUIDELINE_CHANGES;
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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

  const groups = useMemo(() => getGuidelineGroups(universities), [universities]);
  const activeGroup = groups.find((item) => item.group === selectedGroup) ?? null;

  // 내 점수 계산이 달라지는 대학을 맨 앞에 둔다.
  const reachOrder = { all: 0, some: 1, none: 2 };
  const ordered = [...universities].sort((a, b) => (
    VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]
      || reachOrder[getScoreChangeReach(a)] - reachOrder[getScoreChangeReach(b)]
      || a.univ.localeCompare(b.univ, "ko")
  ));
  const changed = ordered.filter((entry) => entry.verdict === "changed");
  const scoreChanged = changed.filter((entry) => getScoreChangeReach(entry) !== "none");
  const otherChanged = changed.filter((entry) => getScoreChangeReach(entry) === "none");
  const names = (entries: UniversityGuidelineChange[]) => (
    entries
      .map((entry) => (
        getScoreChangeReach(entry) === "some"
          ? `${shortName(entry.univ)}(일부 학과)`
          : shortName(entry.univ)
      ))
      .join(" · ")
  );
  const hasUnconfirmed = universities.some((entry) => !entry.ownerConfirmed);

  return (
    <section className="guideline-changes" id={PANEL_ID} aria-labelledby="guideline-changes-title">
      <details
        open={open}
        onToggle={(event) => {
          // 안쪽 줄을 펴고 접는 것은 바깥 상자의 상태가 아니다.
          if (event.target === event.currentTarget) {
            setOpen(event.currentTarget.open);
          }
        }}
      >
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
            {targetYear}학년도 문서를 {baseYear}학년도 모집요강과 맞대 본 결과입니다. 줄을 누르면
            전·후와 볼 쪽이 나옵니다.
            {hasUnconfirmed && " ‘운영자 확인’ 표시가 없는 대학은 자동으로 맞대 본 것입니다."}{" "}
            원서 접수 전에 원문을 꼭 확인해 주세요.
          </p>

          {groups.length > 0 && (
            <div className="guideline-groups">
              <p className="guideline-groups-label">
                <strong>내 학과만 보기</strong>
                <span>계열을 누르면 그 계열이 달라진 대학을 모아 봅니다.</span>
              </p>
              <div className="guideline-group-chips">
                {groups.map((item) => (
                  <button
                    type="button"
                    key={item.group}
                    aria-pressed={item.group === selectedGroup}
                    onClick={() => setSelectedGroup(
                      item.group === selectedGroup ? null : item.group,
                    )}
                  >
                    {item.group}
                    <span>{item.universityCount}곳</span>
                  </button>
                ))}
              </div>
              {activeGroup !== null && (
                <div className="guideline-group-result" aria-live="polite">
                  <p className="guideline-group-result-title">
                    <strong>{activeGroup.group}</strong> 계열이 달라진 대학{" "}
                    {activeGroup.universityCount}곳 · {activeGroup.rows.length}건
                  </p>
                  <ul className="guideline-change-list">
                    {activeGroup.rows.map(({ entry, change }) => (
                      <ChangeLine
                        key={`${entry.univ}|${change.title}`}
                        entry={entry}
                        change={change}
                        baseYear={baseYear}
                        targetYear={targetYear}
                        showUniversity
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="guideline-common-label">모든 학과에 해당하는 것</p>
          <div className="guideline-university-list">
            {ordered.map((entry) => {
              const common = entry.changes.filter(isCommonChange);
              const specific = entry.changes.filter((change) => !isCommonChange(change));
              const reach = getScoreChangeReach(entry);
              const specificGroups = [...new Set(specific.flatMap((change) => change.groups))];

              return (
                <article
                  className={`guideline-university guideline-university--${entry.verdict}`}
                  key={entry.univ}
                >
                  <header>
                    <UniversityName university={entry.univ} logoSize="small" />
                    {entry.verdict !== "changed" && (
                      <span className={`guideline-verdict guideline-verdict--${entry.verdict}`}>
                        {VERDICT_LABEL[entry.verdict]}
                      </span>
                    )}
                    <span className="guideline-document-kind" title={entry.documentTitle}>
                      {entry.documentKind} 기준
                    </span>
                    {reach !== "none" && (
                      <span className="guideline-score-chip">
                        {reach === "all" ? "점수 계산 바뀜" : "일부 학과 점수 계산 바뀜"}
                      </span>
                    )}
                    {entry.ownerConfirmed && (
                      <span className="guideline-confirmed">운영자 확인</span>
                    )}
                  </header>

                  {entry.changes.length === 0 && (
                    <p className="guideline-headline">{entry.headline}</p>
                  )}
                  {entry.changes.length > 0 && common.length === 0 && (
                    <p className="guideline-none">모든 학과에 해당하는 변경은 없습니다.</p>
                  )}
                  {common.length > 0 && (
                    <ul className="guideline-change-list">
                      {common.map((change) => (
                        <ChangeLine
                          key={change.title}
                          entry={entry}
                          change={change}
                          baseYear={baseYear}
                          targetYear={targetYear}
                        />
                      ))}
                    </ul>
                  )}

                  {specific.length > 0 && (
                    <details className="guideline-dept">
                      <summary>
                        <span className="guideline-dept-count">학과별 {specific.length}건</span>
                        <span className="guideline-dept-groups">{specificGroups.join(" · ")}</span>
                        <ChevronDown size={14} aria-hidden="true" />
                      </summary>
                      <ul className="guideline-change-list">
                        {specific.map((change) => (
                          <ChangeLine
                            key={change.title}
                            entry={entry}
                            change={change}
                            baseYear={baseYear}
                            targetYear={targetYear}
                          />
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}

export default memo(GuidelineChangesPanel);
