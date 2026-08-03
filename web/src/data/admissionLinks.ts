export type TransferAdmissionLink = {
  university: string;
  url: string;
};

export type GuidelineAudit = {
  year: "2024" | "2025" | "2026";
  pdfUrl: string;
  sourcePages: string;
  officialSummary: string;
  corrections: readonly string[];
};

export const TRANSFER_ADMISSION_LINKS: readonly TransferAdmissionLink[] = [
  {
    university: "강원대학교",
    url: "https://admission.kangwon.ac.kr/admission/extn/1469/ipsiGuide-usr/list.do?searchCl1=3",
  },
  {
    university: "경북대학교",
    url: "https://ipsi1.knu.ac.kr/notice/?r=GCgVAF0VXCI4KGImIDQ",
  },
  {
    university: "부경대학교",
    url: "https://iphak.pknu.ac.kr/pknu/plan/paper.htm?ctg_cd=ta",
  },
  {
    university: "부산대학교",
    url: "https://go.pusan.ac.kr/college_2016/pages/index.asp?b=B_1_25&p=173",
  },
  {
    university: "인천대학교",
    url: "https://admission.inu.ac.kr/submenu.do?menuurl=OugLlhPCudzQcX0qRXyEuQ%3D%3D",
  },
  {
    university: "전남대학교",
    url: "https://admission.jnu.ac.kr/WebApp/web/HOM/COM/Board/board.aspx?bbsMode=view&boardID=393&cate=1569&key=1800&page=1",
  },
  {
    university: "전북대학교",
    url: "https://enter.jbnu.ac.kr/submenu.do?menuurl=YQ5d0v6456ZAAIjeRW71OQ%3D%3D",
  },
  {
    university: "충남대학교",
    url: "https://ipsi.cnu.ac.kr/_prog/_board/?code=notice_faculty&menu_dvs_cd=0301&post_dvs_cd=03&site_dvs_cd=uadm",
  },
  {
    university: "충북대학교",
    url: "https://ipsi.chungbuk.ac.kr/kor/bbs/BBSMSTR_000000000021/lst.do",
  },
];

/** 충북대 공식 모집요강을 저장 데이터와 실제 계산 코드에 대조한 결과. */
export const CHUNGBUK_GUIDELINE_AUDITS: readonly GuidelineAudit[] = [
  {
    year: "2024",
    pdfUrl: "https://ipsi.chungbuk.ac.kr/preview/1709649881200/index.html",
    sourcePages: "31·33쪽",
    officialSummary:
      "일반학과 최종 100점: 공인영어 30 + 전적대 30 + 면접 40. 영어 10 + (구간 환산점수 × 0.2), 전적대 10 + (백분율 × 0.2).",
    corrections: [
      "저장 JSON의 총점·면접 점수가 null이었음 → 100점·40점으로 수정",
      "실제 계산이 TOEIC 구간표를 연속식으로 근사하고 최저점을 10점으로 처리했음 → 원문 구간표와 최저 14.5점을 그대로 적용",
      "전적대가 2곳 이상일 때의 백분율·취득학점 가중평균식이 저장 설명에 빠져 있었음 → 원문 산식을 추가",
      "건축학과 실기 30점 프로필을 추가해 정상 지원 데이터로 복원",
    ],
  },
  {
    year: "2025",
    pdfUrl: "https://ipsi.chungbuk.ac.kr/preview/1733201205624/index.html",
    sourcePages: "27·28쪽",
    officialSummary:
      "일반학과 최종 100점: 공인영어 30 + 전적대 30 + 면접 40. 영어 10 + (구간 환산점수 × 0.2), 전적대 10 + (백분율 × 0.2).",
    corrections: [
      "저장 JSON의 총점·면접 점수가 null이었음 → 100점·40점으로 수정",
      "실제 계산이 TOEIC 구간표를 연속식으로 근사하고 최저점을 10점으로 처리했음 → 원문 구간표와 최저 14.5점을 그대로 적용",
      "전적대가 2곳 이상일 때의 백분율·취득학점 가중평균식이 저장 설명에 빠져 있었음 → 원문 산식을 추가",
      "간호학과 전공필기 20점 프로필을 추가해 정상 지원 데이터로 복원",
    ],
  },
  {
    year: "2026",
    pdfUrl: "https://ipsi.chungbuk.ac.kr/preview/1764319326867/index.html",
    sourcePages: "26·31쪽",
    officialSummary:
      "일반학과 최종 100점: 공인영어 60 + 면접 40, 전적대 미반영. 영어 40 + (구간 환산점수 × 0.2).",
    corrections: [
      "저장 JSON의 총점·면접 점수가 null이었음 → 100점·40점으로 수정",
      "실제 계산이 추정 연속식이고 최저점을 40점으로 처리했음 → 검증된 원문 구간표와 최저 44.5점을 적용",
      "약학과·제약학과는 표준형, 간호학과는 전공필기형 프로필로 정확히 분류",
      "건축학과 실기 30점 프로필을 추가해 정상 지원 데이터로 복원",
      "전적대 성적의 최종 동점자 사용과 2곳 이상 가중평균식이 저장 설명에 빠져 있었음 → 31쪽 기준으로 보완",
    ],
  },
];
