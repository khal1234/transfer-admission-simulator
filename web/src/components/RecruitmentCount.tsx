import type { DepartmentRecord } from "../utils/converter";
import ScoreExplanation from "./ScoreExplanation";
import { getRegistrationInfo } from "../utils/registration";
import { getDisclosureEvidence } from "../utils/disclosureEvidence";

export default function RecruitmentCount({ record }: { record: DepartmentRecord; mobile?: boolean }) {
  const registration = getRegistrationInfo(record);
  const evidence = getDisclosureEvidence(record.대학명, record.연도, record.학과_원본명);
  const isZero = record.모집인원 === 0 || evidence?.kind === "not-recruited";
  const countText = `등록 ${registration.count === null ? "미확인" : `${registration.count}명`} / ${isZero ? "미모집" : `모집 ${record.모집인원 === null ? "미확인" : `${record.모집인원}명`}`}`;
  // 폰 상세 표용 짧은 표기. 머리글이 «등록 / 모집»이라 낱말을 되풀이하지 않는다(CSS 가 좁은 표에서만 보인다).
  const shortText = `${registration.count === null ? "미확인" : registration.count} / ${isZero ? "미모집" : record.모집인원 === null ? "미확인" : `${record.모집인원}명`}`;
  const countNode = <>
    <span className="recruitment-count-full">{countText}</span>
    <span className="recruitment-count-short" aria-hidden="true">{shortText}</span>
  </>;
  const needsExplanation = isZero || evidence !== null || registration.count === null
    || record.모집인원 === null || record.대학명 === "충남대학교" || Boolean(record.모집인원_근거);
  if (!needsExplanation) {
    return <span className="recruitment-count-inline">
      <span>{countNode}</span>
      {registration.sourceLabel && <small>{registration.sourceLabel} 기준</small>}
    </span>;
  }
  const description = isZero
    ? `${record.연도}학년도 일반편입 모집계획인원이 0명인 모집단위입니다. 인원을 개인정보 보호로 비공개한 것이 아니라 해당 연도 모집계획이 없는 경우입니다.`
    : record.모집인원 === null
      ? `${record.연도}학년도 모집인원을 현재 자료에서 확인하지 못했습니다. 비공개나 미모집으로 확정한 것이 아니며, 인원 미확인 값을 0명으로 해석하면 안 됩니다.`
      : `${record.연도}학년도 일반편입 모집인원은 ${record.모집인원}명입니다.`;
  return <ScoreExplanation className="recruitment-count-button" label="등록·모집인원 안내" description={(evidence ? evidence.description + " " : "") + registration.description + " " + description
    + (record.모집인원_근거 ? ` 근거: ${record.모집인원_근거}` : " 해당 연도 대학 입학처의 모집요강과 입시결과를 확인하세요.")}>
    <span>{countNode}
      {evidence?.kind === "small-cohort" && <small className="recruitment-cohort-note">합격 2명 이하 ({evidence.code})</small>}
    </span>
  </ScoreExplanation>;
}
