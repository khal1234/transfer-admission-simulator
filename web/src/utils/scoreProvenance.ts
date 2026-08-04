/**
 * 화면에 보이는 '합격자 평균 원점수'가 대학이 발표한 값인지, 우리가 환산점수에서
 * 되짚어 만든 값인지 가른다.
 *
 * 배경: 어떤 대학은 성적 자료에 TOEIC 원점수를 싣고, 어떤 대학은 환산점수만
 * 싣는다. 후자의 원점수는 환산식을 뒤집어 만든 값인데, 화면에서는 둘이 똑같이
 * '876점'으로 보인다. 출처가 다른 두 숫자를 구별할 방법이 없다는 뜻이다.
 *
 * 되짚기의 정확도도 대학마다 다르다.
 *   - 비례식이면 되짚기가 정확하다. 환산 88.55 ÷ (100/990) = 876.7, 오차가 없다.
 *   - 구간 환산표면 근사다. 같은 환산점수가 5~10점 폭의 TOEIC 구간에 대응하므로,
 *     되짚은 값은 그 구간 안의 한 점일 뿐이다. 이건 사용자가 알아야 한다.
 *
 * 이 사실은 (대학, 연도)의 성질이지 학과의 성질이 아니라서, 레코드 1923건에
 * 필드를 붙이지 않고 여기 표로 둔다. 판정 근거는 tools/diff_extraction.py 의
 * [D] 항목과 tools/audit_circularity.py 다.
 */

export type RawScoreDisclosure =
  /** 대학이 원점수를 그대로 발표했다. */
  | "published"
  /** 환산점수만 발표해 되짚었다. 비례식이라 값이 정확하다. */
  | "derived-exact"
  /** 환산점수만 발표해 되짚었다. 구간 환산표라 근사값이다. */
  | "derived-approximate";

/**
 * 원본 성적 자료가 TOEIC 원점수를 싣지 않는 대학.
 * 여기 없는 대학은 원점수를 그대로 싣는다.
 */
const TOEIC_DISCLOSURE: Record<string, RawScoreDisclosure> = {
  // 평균 성적을 '우리대학 성적반영 방법에 의한' 환산점수로만 싣는다.
  // 환산식이 100 × TOEIC ÷ 990 이라 되짚기가 정확하다.
  경북대학교: "derived-exact",
  // 공인영어성적(60점) 환산값만 싣고, 환산은 구간표다.
  충남대학교: "derived-approximate",
  // 공인영어성적(60점 만점 환산점수)만 싣고, 환산은 구간표다.
  충북대학교: "derived-approximate",
};

/**
 * 원본이 전적대 백분위를 싣지 않는 대학.
 * 학점 환산식은 모두 선형식이라 되짚기가 정확하다.
 */
const GPA_DISCLOSURE: Record<string, RawScoreDisclosure> = {
  경북대학교: "derived-exact",
  부경대학교: "derived-exact",
  충남대학교: "derived-exact",
  충북대학교: "derived-exact",
};

export type DisclosureNote = {
  disclosure: RawScoreDisclosure;
  /** 값 옆에 붙일 짧은 표시. 대학이 발표한 값이면 null. */
  marker: string | null;
  /** 마우스를 올렸을 때 보일 설명. 대학이 발표한 값이면 null. */
  description: string | null;
};

const NOTES: Record<RawScoreDisclosure, Omit<DisclosureNote, "disclosure">> = {
  published: { marker: null, description: null },
  "derived-exact": {
    marker: "환산 역산",
    description:
      "이 대학은 환산점수만 공개합니다. 표시된 원점수는 환산식을 되짚어 계산한 "
      + "값이며, 역산 가능한 선형식이라 값 자체는 정확합니다.",
  },
  "derived-approximate": {
    marker: "환산 역산(근사)",
    description:
      "이 대학은 환산점수만 공개하고 환산에 구간표를 씁니다. 표시된 원점수는 "
      + "환산식을 되짚은 근사값이라 실제 평균과 다를 수 있습니다.",
  },
};

function describe(disclosure: RawScoreDisclosure): DisclosureNote {
  return { disclosure, ...NOTES[disclosure] };
}

export function getToeicDisclosure(university: string): DisclosureNote {
  return describe(TOEIC_DISCLOSURE[university] ?? "published");
}

export function getGpaDisclosure(university: string): DisclosureNote {
  return describe(GPA_DISCLOSURE[university] ?? "published");
}

/** 되짚은 값인가 — 값 옆에 표시를 붙일지 정할 때 쓴다. */
export function isDerived(note: DisclosureNote): boolean {
  return note.disclosure !== "published";
}
