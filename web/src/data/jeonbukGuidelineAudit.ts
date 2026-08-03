export type JeonbukGuidelineAuditIssue = {
  stored: string;
  official: string;
  resolution: string;
};

export type JeonbukGuidelineAudit = {
  year: "2024" | "2025" | "2026";
  pdfUrl: string;
  pdfStartPage: number;
  officialPostUrl: string;
  pageGuide: string;
  verifiedSummary: string;
  issues: readonly JeonbukGuidelineAuditIssue[];
};

/**
 * 전북대학교 공식 모집요강 PDF와 이번 대조에서 바로잡은 저장 내용을 연결한다.
 * issues는 현재 남아 있는 오류가 아니라 사용자가 PDF 아래에서 재검증할 수 있도록
 * 기록한 "수정 전 틀린 내용"이다.
 */
export const JEONBUK_GUIDELINE_AUDITS: readonly JeonbukGuidelineAudit[] = [
  {
    year: "2026",
    pdfUrl: "/guides/jeonbuk/jeonbuk-transfer-2026.pdf",
    pdfStartPage: 25,
    officialPostUrl:
      "https://enter.jbnu.ac.kr/submenu.do?menuurl=2YmZUZGvsmKEoKRLPZRjqw%3D%3D",
    pageGuide:
      "배점표 PDF 25쪽(책자 23쪽) · 환산식 PDF 26쪽 · TOEIC 환산표 PDF 50쪽(책자 48쪽)",
    verifiedSummary:
      "표준전형은 전적대성적 60점(백분율×0.6)+공인영어 80점(환산표×0.8)+면접 60점=200점입니다.",
    issues: [
      {
        stored: "공인영어 계산식을 ‘환산표 근사식’으로 표시했습니다.",
        official:
          "TOEIC 990=100.000, 985=99.495 … 0~4=0.010인 표이며, 유효한 5점 단위 점수에서는 저장된 연속식과 정확히 일치합니다.",
        resolution:
          "계산식은 유지하고 신뢰도를 ‘공식 원문 검증 완료’로 변경했습니다.",
      },
      {
        stored: "산업디자인학과·한국음악학과를 표준 60+80+60 전형으로 분류했습니다.",
        official:
          "예술대학은 공인영어 미반영, 전적대성적 120점+면접 20점+실기 60점입니다.",
        resolution: "두 학과를 예술대학 실기형 공식에 연결해 계산 대상으로 복원했습니다.",
      },
      {
        stored: "스포츠과학과를 표준 60+80+60 전형으로 분류했습니다.",
        official:
          "전적대성적 50점+공인영어 50점+면접 50점+실기 50점입니다.",
        resolution: "스포츠과학 실기형 공식에 연결해 계산 대상으로 복원했습니다.",
      },
      {
        stored: "치의학과를 표준 60+80+60 전형으로 분류했습니다.",
        official:
          "전적대성적 20점+공인영어 60점+필답 80점+면접 40점입니다.",
        resolution: "약학·치의학 필답형 공식에 연결해 계산 대상으로 복원했습니다.",
      },
    ],
  },
  {
    year: "2025",
    pdfUrl: "/guides/jeonbuk/jeonbuk-transfer-2025.pdf",
    pdfStartPage: 28,
    officialPostUrl:
      "https://csai.jbnu.ac.kr/bbs/csai/4929/347028/artclView.do",
    pageGuide:
      "배점표 PDF 28쪽(책자 26쪽) · 환산식 PDF 29쪽 · TOEIC 환산표 PDF 54쪽(책자 52쪽)",
    verifiedSummary:
      "표준전형은 전적대성적 60점(백분율×0.6)+공인영어 80점(환산표×0.8)+면접 60점=200점입니다.",
    issues: [
      {
        stored: "2025 환산공식을 2026 자료에서 가져온 미확인 가정값으로 표시했습니다.",
        official:
          "2025 모집요강에도 같은 60+80+60 배점, 백분율×0.6, 공인영어 환산표×0.8과 동일한 TOEIC 표가 명시돼 있습니다.",
        resolution: "2025 공식 PDF 페이지를 출처로 기록하고 검증 완료로 변경했습니다.",
      },
      {
        stored: "산업디자인학과를 표준 60+80+60 전형으로 분류했습니다.",
        official:
          "예술대학은 공인영어 미반영, 전적대성적 120점+면접 20점+실기 60점입니다.",
        resolution: "예술대학 실기형 공식에 연결해 계산 대상으로 복원했습니다.",
      },
      {
        stored: "치의학과를 표준 60+80+60 전형으로 분류했습니다.",
        official:
          "전적대성적 20점+공인영어 60점+필답 80점+면접 40점입니다.",
        resolution: "약학·치의학 필답형 공식에 연결해 계산 대상으로 복원했습니다.",
      },
    ],
  },
  {
    year: "2024",
    pdfUrl: "/guides/jeonbuk/jeonbuk-transfer-2024.pdf",
    pdfStartPage: 24,
    officialPostUrl:
      "https://enter.jbnu.ac.kr/file/download.do?sfn=20231219112235490_2024%ED%95%99%EB%85%84%EB%8F%84+%EB%8C%80%ED%95%99+%ED%8E%B8%EC%9E%85%ED%95%99+%EB%AA%A8%EC%A7%91%EC%9A%94%EA%B0%95.pdf&ofn=2024%ED%95%99%EB%85%84%EB%8F%84+%EB%8C%80%ED%95%99+%ED%8E%B8%EC%9E%85%ED%95%99+%EB%AA%A8%EC%A7%91%EC%9A%94%EA%B0%95.pdf",
    pageGuide:
      "배점표 PDF 24쪽(책자 22쪽) · 환산식 PDF 25쪽 · TOEIC 환산표 PDF 43쪽(책자 41쪽)",
    verifiedSummary:
      "표준전형은 전적대성적 60점(백분율×0.6)+공인영어 80점(환산표×0.8)+면접 60점=200점입니다.",
    issues: [
      {
        stored: "2024 환산공식을 2026 자료에서 가져온 미확인 가정값으로 표시했습니다.",
        official:
          "2024 모집요강에도 같은 60+80+60 배점, 백분율×0.6, 공인영어 환산표×0.8과 동일한 TOEIC 표가 명시돼 있습니다.",
        resolution: "2024 공식 PDF 페이지를 출처로 기록하고 검증 완료로 변경했습니다.",
      },
      {
        stored: "산업디자인학과·한국음악학과를 표준 60+80+60 전형으로 분류했습니다.",
        official:
          "예술대학은 공인영어 미반영, 전적대성적 120점+면접 20점+실기 60점입니다.",
        resolution: "두 학과를 예술대학 실기형 공식에 연결해 계산 대상으로 복원했습니다.",
      },
      {
        stored: "스포츠과학과를 표준 60+80+60 전형으로 분류했습니다.",
        official:
          "전적대성적 50점+공인영어 50점+면접 50점+실기 50점입니다.",
        resolution: "스포츠과학 실기형 공식에 연결해 계산 대상으로 복원했습니다.",
      },
    ],
  },
];
