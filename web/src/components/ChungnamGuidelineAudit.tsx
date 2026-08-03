import { AlertTriangle, ChevronDown, ExternalLink, FileCheck2 } from "lucide-react";
import { CHUNGNAM_GUIDELINE_AUDITS } from "../data/chungnamGuidelineAudit";

export default function ChungnamGuidelineAudit() {
  return (
    <details className="guideline-audit">
      <summary className="guideline-audit-summary">
        <span>
          <FileCheck2 size={19} aria-hidden="true" />
          충남대 2024~2026 모집요강 원문 대조 결과
        </span>
        <ChevronDown size={19} aria-hidden="true" />
      </summary>

      <div className="guideline-audit-body">
        <p className="guideline-audit-intro">
          공식 PDF의 배점표·환산표와 저장 데이터 및 실제 계산 코드를 대조했습니다.
          아래의 “수정 전 틀린 내용”은 이번 점검에서 발견해 바로잡은 항목이며,
          PDF 뷰어의 표시 페이지를 기준으로 직접 확인할 수 있습니다.
        </p>

        <div className="guideline-audit-years">
          {CHUNGNAM_GUIDELINE_AUDITS.map((audit) => {
            const viewerUrl = `${audit.pdfUrl}#page=${audit.pdfStartPage}&view=FitH`;
            return (
              <details className="guideline-audit-year" key={audit.year}>
                <summary>
                  <span>{audit.year}학년도</span>
                  <span className="guideline-audit-year-status">원문 대조 완료</span>
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>

                <div className="guideline-audit-year-body">
                  <div className="guideline-audit-actions">
                    <a href={audit.pdfUrl} target="_blank" rel="noreferrer">
                      공식 PDF 새 탭에서 열기
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                    <a href={audit.officialPostUrl} target="_blank" rel="noreferrer">
                      충남대 원문 게시물
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  </div>

                  <p className="guideline-audit-pages">{audit.pageGuide}</p>
                  <iframe
                    className="guideline-audit-pdf"
                    src={viewerUrl}
                    title={`충남대학교 ${audit.year}학년도 편입학전형 모집요강 PDF`}
                    loading="lazy"
                  />

                  <section className="guideline-audit-verified" aria-label="공식 확인값">
                    <h3>공식 확인값</h3>
                    <p>{audit.verifiedSummary}</p>
                  </section>

                  <section className="guideline-audit-issues" aria-label="수정 전 틀린 내용">
                    <h3>
                      <AlertTriangle size={17} aria-hidden="true" />
                      수정 전 틀린 내용
                    </h3>
                    <ol>
                      {audit.issues.map((issue) => (
                        <li key={issue.stored}>
                          <dl>
                            <div>
                              <dt>저장 내용</dt>
                              <dd>{issue.stored}</dd>
                            </div>
                            <div>
                              <dt>PDF 기준</dt>
                              <dd>{issue.official}</dd>
                            </div>
                            <div>
                              <dt>반영 결과</dt>
                              <dd>{issue.resolution}</dd>
                            </div>
                          </dl>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </details>
  );
}
