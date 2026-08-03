export type GuidelineAuditIssue = {
  stored: string;
  official: string;
  resolution: string;
};

export type ChungnamGuidelineAudit = {
  year: "2024" | "2025" | "2026";
  pdfUrl: string;
  pdfStartPage: number;
  officialPostUrl: string;
  pageGuide: string;
  verifiedSummary: string;
  issues: readonly GuidelineAuditIssue[];
};

/**
 * 충남대학교 입학정보가 게시한 모집요강 PDF를 화면 감사표와 연결한다.
 * issues는 수정 후의 오류가 아니라, 이번 원문 대조에서 발견해 바로잡은
 * "수정 전 저장 내용"이다. 사용자가 회귀 여부를 다시 확인할 수 있도록 남긴다.
 */
export const CHUNGNAM_GUIDELINE_AUDITS: readonly ChungnamGuidelineAudit[] = [
  {
    year: "2026",
    pdfUrl: "/guides/chungnam/chungnam-transfer-2026.pdf",
    pdfStartPage: 20,
    officialPostUrl:
      "https://ipsi.cnu.ac.kr/_prog/_board/?GotoPage=&code=notice_faculty&menu_dvs_cd=0301&mode=V&no=2024309&post_dvs_cd=03&site_dvs=&site_dvs_cd=uadm&skey=&sval=",
    pageGuide: "배점표 PDF 20쪽(책자 16쪽) · TOEIC 환산표 PDF 34쪽(책자 30쪽)",
    verifiedSummary:
      "표준전형은 공인영어 60점+면접 40점이며 전적대 성적은 미반영입니다.",
    issues: [
      {
        stored: "TOEIC 981~990은 모두 60점이고 10점마다 0.6점 감점한다고 설명했습니다.",
        official:
          "990=60점, 985=59.4점, 980=58.8점 … 795=36.6점이며, 이후에는 780~790=36점처럼 구간 폭이 달라집니다.",
        resolution: "설명과 계산 코드를 PDF 구간표의 정확 조회식으로 수정했습니다.",
      },
      {
        stored: "컴퓨터융합학부·인공지능학과의 코딩/실기를 20점으로 적었습니다.",
        official: "공인영어 20점+실기고사 40점+면접 40점입니다.",
        resolution: "예외학과 배점 설명을 20+40+40으로 수정했습니다.",
      },
      {
        stored: "식품공학과 필답고사를 20점, 수의·약학과 영어를 40점으로 적었습니다.",
        official:
          "식품공학과는 영어 20점+필답 40점+면접 40점, 수의·약학과는 영어 50점+필답 50점+면접 P/F입니다.",
        resolution: "각 예외학과 설명을 공식 배점으로 수정했습니다.",
      },
      {
        stored: "수학교육과와 일부 예술·무용 모집단위를 표준전형 데이터에 두었습니다.",
        official:
          "수학교육과는 영어 10점+필답 60점+면접 30점이며, 예술대학·무용학과는 실기 60점+면접 40점입니다.",
        resolution: "학과별 배점 프로필을 추가해 해당 모집단위를 정상 지원 데이터로 복원했습니다.",
      },
    ],
  },
  {
    year: "2025",
    pdfUrl: "/guides/chungnam/chungnam-transfer-2025.pdf",
    pdfStartPage: 18,
    officialPostUrl:
      "https://ipsi.cnu.ac.kr/_prog/_board/?GotoPage=2&code=notice_faculty&menu_dvs_cd=0301&mode=V&no=2019382&post_dvs_cd=03&site_dvs=&site_dvs_cd=uadm&skey=&sval=",
    pageGuide: "배점표 PDF 18쪽(책자 16쪽) · TOEIC 환산표 PDF 32쪽(책자 30쪽)",
    verifiedSummary:
      "표준전형은 공인영어 60점+면접 40점이며 전적대 성적은 미반영입니다.",
    issues: [
      {
        stored: "TOEIC 981~990은 모두 60점이고 10점마다 0.6점 감점한다고 설명했습니다.",
        official:
          "990=60점, 985=59.4점 … 795=36.6점, 780~790=36점이며 하위 구간은 15점 폭입니다.",
        resolution: "설명과 계산 코드를 PDF 구간표의 정확 조회식으로 수정했습니다.",
      },
      {
        stored: "컴퓨터융합학부·인공지능학과 실기와 식품공학과 필답을 각각 20점으로 적었습니다.",
        official: "세 모집단위 모두 영어 20점+전공시험 40점+면접 40점입니다.",
        resolution: "예외학과 배점 설명을 20+40+40으로 수정했습니다.",
      },
      {
        stored: "수의학과·약학과 공인영어를 40점으로 적었습니다.",
        official: "공인영어 50점+필답고사 50점+면접 P/F입니다.",
        resolution: "예외학과 배점 설명을 50+50+P/F로 수정했습니다.",
      },
      {
        stored: "한문학과·화학과·생물과학과를 예외전형 데이터로 분류했습니다.",
        official:
          "세 모집단위의 최종 배점은 표준전형과 같은 공인영어 60점+면접 40점입니다.",
        resolution: "세 모집단위를 표준전형 데이터로 복원했습니다.",
      },
      {
        stored: "일부 예술·무용 모집단위를 표준전형 데이터에 두었습니다.",
        official: "예술대학·무용학과는 공인영어 미반영, 실기 60점+면접 40점입니다.",
        resolution: "학과별 실기 프로필을 추가해 해당 모집단위를 정상 지원 데이터로 복원했습니다.",
      },
    ],
  },
  {
    year: "2024",
    pdfUrl: "/guides/chungnam/chungnam-transfer-2024.pdf",
    pdfStartPage: 16,
    officialPostUrl:
      "https://ipsi.cnu.ac.kr/_prog/_board/?GotoPage=3&code=notice_faculty&menu_dvs_cd=0301&mode=V&no=2015524&post_dvs_cd=03&site_dvs=&site_dvs_cd=uadm&skey=&sval=",
    pageGuide:
      "배점표 PDF 16쪽(책자 14쪽) · 전적대 산식 PDF 17쪽 · TOEIC 환산표 PDF 29쪽(책자 27쪽)",
    verifiedSummary:
      "표준전형은 공인영어 50점+전적대성적 10점+면접 40점이며, 전적대 점수는 백분율×0.1입니다.",
    issues: [
      {
        stored: "TOEIC 구간표를 직선으로 보간해 같은 공식 구간 안에서도 점수가 달라졌습니다.",
        official:
          "981~990=50점, 971~980=49.5점처럼 10점 구간마다 같은 환산점수를 적용합니다. 예: TOEIC 980은 49.5점입니다.",
        resolution: "연속 보간을 제거하고 PDF의 10점 구간 조회식으로 수정했습니다.",
      },
      {
        stored: "일부 예술·무용 모집단위를 표준전형 데이터에 두었습니다.",
        official:
          "예술대학·무용학과는 공인영어 미반영, 전적대 20점+실기 40점+면접 40점입니다.",
        resolution: "학과별 실기 프로필을 추가해 해당 모집단위를 정상 지원 데이터로 복원했습니다.",
      },
    ],
  },
];
