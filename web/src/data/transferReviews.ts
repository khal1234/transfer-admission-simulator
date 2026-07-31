export type TransferReview = {
  id: number;
  title: string;
  url: string;
  publishedAt: string;
  departmentGroup: string;
  universities: readonly string[];
  comparison: boolean;
};

export const REVIEW_UNIVERSITIES = [
  "부산대학교",
  "경북대학교",
  "충남대학교",
  "충북대학교",
  "전남대학교",
  "전북대학교",
  "부경대학교",
  "인천대학교",
  "강원대학교",
  "울산과학기술원(UNIST)",
] as const;

export const TRANSFER_REVIEWS: readonly TransferReview[] = [
  {"id":431,"title":"부산대 정보컴퓨터 — 최대힙·해시테이블 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=431","publishedAt":"2026-01-22","departmentGroup":"정보컴퓨터공학부·컴퓨터계열","universities":["부산대학교"],"comparison":false},
  {"id":432,"title":"부산대 정보컴퓨터 — 10분 제시문·구술면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=432","publishedAt":"2026-01-22","departmentGroup":"정보컴퓨터공학부·컴퓨터계열","universities":["부산대학교"],"comparison":false},
  {"id":540,"title":"부산대 정보컴퓨터 — 최대힙·해시 충돌해결 복기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=540","publishedAt":"2026-01-22","departmentGroup":"정보컴퓨터공학부·컴퓨터계열","universities":["부산대학교"],"comparison":false},
  {"id":446,"title":"부산대 기계 — 미분방정식·재료·열역학 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=446","publishedAt":"2026-01-22","departmentGroup":"기계공학부","universities":["부산대학교"],"comparison":false},
  {"id":529,"title":"부산대 기계 — 강도·강성·미분방정식·열역학","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=529","publishedAt":"2026-01-22","departmentGroup":"기계공학부","universities":["부산대학교"],"comparison":false},
  {"id":2483,"title":"부산대 전자 — 신호·전자회로 면접 준비","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=2483","publishedAt":"2026-02-04","departmentGroup":"전자공학과","universities":["부산대학교"],"comparison":false},
  {"id":441,"title":"부산대 비공대 — 10분 문제풀이·인성면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=441","publishedAt":"2026-01-22","departmentGroup":"기타·학과 미상","universities":["부산대학교"],"comparison":false},
  {"id":460,"title":"부산대 학과 미상 — 전공 2문항·학업적응 꼬리질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=460","publishedAt":"2026-01-22","departmentGroup":"기타·학과 미상","universities":["부산대학교"],"comparison":false},
  {"id":591,"title":"경북대 전자 — 전자회로·회로이론·C 전공시험","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=591","publishedAt":"2026-01-23","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":664,"title":"경북대 전자 — 전자기학·회로·논리·C 시험 복원","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=664","publishedAt":"2026-01-23","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":727,"title":"경북대 전자 — 2026 논리회로 전공문제 복원","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=727","publishedAt":"2026-01-23","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":754,"title":"경북대 전자 — 학업·석사계획·MBTI 면접질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=754","publishedAt":"2026-01-24","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":2575,"title":"경북대 전자 — MOSFET·노턴·포인터 면접질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=2575","publishedAt":"2026-02-05","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":3344,"title":"경북대 전자 — 전공책·유튜브·GPT 독학","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=3344","publishedAt":"2026-02-08","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":3757,"title":"경북대 전자 — 독학 준비·전공시험 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=3757","publishedAt":"2026-02-10","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":6473,"title":"경북대 전자 — 2026 전공시험 문항 이미지·난도","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=6473","publishedAt":"2026-03-28","departmentGroup":"전자공학부","universities":["경북대학교"],"comparison":false},
  {"id":638,"title":"경북대 컴퓨터 — 동적 바인딩·점화식 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=638","publishedAt":"2026-01-23","departmentGroup":"컴퓨터학부·글로벌소프트웨어융합","universities":["경북대학교"],"comparison":false},
  {"id":641,"title":"경북대 글로벌SW — 점화식·연결성분·트리 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=641","publishedAt":"2026-01-23","departmentGroup":"컴퓨터학부·글로벌소프트웨어융합","universities":["경북대학교"],"comparison":false},
  {"id":579,"title":"경북대 기계 — 4대역학 전공시험·구술면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=579","publishedAt":"2026-01-23","departmentGroup":"기계공학부","universities":["경북대학교"],"comparison":false},
  {"id":636,"title":"경북대 토목 — 보·미분방정식·벡터 전공시험","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=636","publishedAt":"2026-01-23","departmentGroup":"토목공학과","universities":["경북대학교"],"comparison":false},
  {"id":2929,"title":"경북대 토목 — 전공 복습·기출 5회독 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=2929","publishedAt":"2026-02-06","departmentGroup":"토목공학과","universities":["경북대학교"],"comparison":false},
  {"id":660,"title":"경북대 철학 — 서술형 3문항·논점 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=660","publishedAt":"2026-01-23","departmentGroup":"철학과","universities":["경북대학교"],"comparison":false},
  {"id":735,"title":"경북대 철학 — 제시문 답안 작성 실패 회고","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=735","publishedAt":"2026-01-23","departmentGroup":"철학과","universities":["경북대학교"],"comparison":false},
  {"id":2567,"title":"경북대 경영 — 답안지 기반 전공면접 Q&A","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=2567","publishedAt":"2026-02-05","departmentGroup":"경영학부","universities":["경북대학교"],"comparison":false},
  {"id":1164,"title":"경북대 공대 비메이저 — 환경소재 지원동기·기출 질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1164","publishedAt":"2026-01-27","departmentGroup":"공대 비메이저·환경소재계열","universities":["경북대학교"],"comparison":false},
  {"id":56,"title":"충남대 기계 — 동역학·열유체 제시문 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=56","publishedAt":"2026-01-19","departmentGroup":"기계공학부","universities":["충남대학교"],"comparison":false},
  {"id":904,"title":"충남대 전자 — 논리·신호·전자기 면접문제 8개","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=904","publishedAt":"2026-01-25","departmentGroup":"전자공학과","universities":["충남대학교"],"comparison":false},
  {"id":7776,"title":"충남대 경영 — 자기소개·학업계획 면접 Q&A","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=7776","publishedAt":"2026-06-16","departmentGroup":"경영학부","universities":["충남대학교"],"comparison":false},
  {"id":8305,"title":"충남대 경제 — 경제학 전공 공부 시행착오","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=8305","publishedAt":"2026-07-20","departmentGroup":"경제학과","universities":["충남대학교"],"comparison":false},
  {"id":8063,"title":"충남대 환경소재 — 학업계획서 중심 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=8063","publishedAt":"2026-07-05","departmentGroup":"환경소재학과","universities":["충남대학교"],"comparison":false},
  {"id":4650,"title":"충남대 농대 — 비동일계 학사편입 면접 Q&A","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4650","publishedAt":"2026-02-12","departmentGroup":"농대계열·학과 미상","universities":["충남대학교"],"comparison":false},
  {"id":57,"title":"충북대 기계 — 압력용기·열역학 면접질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=57","publishedAt":"2026-01-19","departmentGroup":"기계공학부","universities":["충북대학교"],"comparison":false},
  {"id":64,"title":"충북대 전기 — 회로·라플라스·RC 면접문제","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=64","publishedAt":"2026-01-20","departmentGroup":"전기공학부","universities":["충북대학교"],"comparison":false},
  {"id":316,"title":"충북대 토목 — 도로공사 진로·교량 실습 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=316","publishedAt":"2026-01-21","departmentGroup":"토목·건설계열","universities":["충북대학교"],"comparison":false},
  {"id":5126,"title":"충북대 컴퓨터 — SQL·구현·비동일계 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=5126","publishedAt":"2026-02-18","departmentGroup":"컴퓨터·소프트웨어계열","universities":["충북대학교"],"comparison":false},
  {"id":4954,"title":"충북대 사범·문과 — 성적표 기반 면접질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4954","publishedAt":"2026-02-14","departmentGroup":"사범·문과계열","universities":["충북대학교"],"comparison":false},
  {"id":323,"title":"충북대 학과 미상 — 전공면접 중 부적절 질문 사례","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=323","publishedAt":"2026-01-21","departmentGroup":"학과 미상","universities":["충북대학교"],"comparison":false},
  {"id":1132,"title":"전남대 기계 — 5개 제시문·풀이 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1132","publishedAt":"2026-01-27","departmentGroup":"기계공학부","universities":["전남대학교"],"comparison":false},
  {"id":1140,"title":"전남대 기계 — 공업수학·열·고체·유체 문제","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1140","publishedAt":"2026-01-27","departmentGroup":"기계공학부","universities":["전남대학교"],"comparison":false},
  {"id":1106,"title":"전남대 화학 — 미분방정식·IUPAC·산화환원","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1106","publishedAt":"2026-01-27","departmentGroup":"화학계열","universities":["전남대학교"],"comparison":false},
  {"id":2680,"title":"전남대 식품영양 — 대사·식품 문제 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=2680","publishedAt":"2026-02-05","departmentGroup":"식품영양학과","universities":["전남대학교"],"comparison":false},
  {"id":1133,"title":"전남대 문헌정보 — 정보·리터러시·도서관학 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1133","publishedAt":"2026-01-27","departmentGroup":"문헌정보학과","universities":["전남대학교"],"comparison":false},
  {"id":1112,"title":"전남대 인문 — 희망과목·가치관에 영향 준 책","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1112","publishedAt":"2026-01-27","departmentGroup":"인문계열","universities":["전남대학교"],"comparison":false},
  {"id":1552,"title":"전남대 인문 — 복수전공·팀플·실패경험 압박면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1552","publishedAt":"2026-01-31","departmentGroup":"인문계열","universities":["전남대학교"],"comparison":false},
  {"id":1184,"title":"전남대 농대 — 모르는 전공질문 대응 사례","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1184","publishedAt":"2026-01-27","departmentGroup":"농대계열","universities":["전남대학교"],"comparison":false},
  {"id":1092,"title":"전남대 자연계 — 수학·프로그래밍·전공면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1092","publishedAt":"2026-01-27","departmentGroup":"자연·데이터계열","universities":["전남대학교"],"comparison":false},
  {"id":1181,"title":"전남대 자연대 — 수강과목·연구계획 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1181","publishedAt":"2026-01-27","departmentGroup":"자연·데이터계열","universities":["전남대학교"],"comparison":false},
  {"id":1080,"title":"전남대 학과 미상 — 흥미 과목·학업적응 질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1080","publishedAt":"2026-01-27","departmentGroup":"학과 미상","universities":["전남대학교"],"comparison":false},
  {"id":1082,"title":"전남대 학과 미상 — 분산 개념 질문 복기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1082","publishedAt":"2026-01-27","departmentGroup":"학과 미상","universities":["전남대학교"],"comparison":false},
  {"id":1102,"title":"전남대 학과 미상 — 지원동기·진로·전공질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1102","publishedAt":"2026-01-27","departmentGroup":"학과 미상","universities":["전남대학교"],"comparison":false},
  {"id":1122,"title":"전남대 학과 미상 — 지원동기 꼬리질문 중심 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1122","publishedAt":"2026-01-27","departmentGroup":"학과 미상","universities":["전남대학교"],"comparison":false},
  {"id":1159,"title":"전남대 학과 미상 — 수강과목 연계 즉석 전공문제","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1159","publishedAt":"2026-01-27","departmentGroup":"학과 미상","universities":["전남대학교"],"comparison":false},
  {"id":410,"title":"전북대 기계 — 에어컨·미분방정식·라플라스","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=410","publishedAt":"2026-01-22","departmentGroup":"기계공학부","universities":["전북대학교"],"comparison":false},
  {"id":403,"title":"전북대 인문 — 전공 시사·기초·꼬리질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=403","publishedAt":"2026-01-22","departmentGroup":"인문·사회계열","universities":["전북대학교"],"comparison":false},
  {"id":683,"title":"전북대 사회계열 — 지원동기·학업계획 꼬리질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=683","publishedAt":"2026-01-23","departmentGroup":"인문·사회계열","universities":["전북대학교"],"comparison":false},
  {"id":484,"title":"전북대 학과 미상 — 전공개념·진로 꼬리질문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=484","publishedAt":"2026-01-22","departmentGroup":"학과 미상","universities":["전북대학교"],"comparison":false},
  {"id":67,"title":"부경대 기계 — 모어의 원·열역학 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=67","publishedAt":"2026-01-20","departmentGroup":"기계공학부","universities":["부경대학교"],"comparison":false},
  {"id":55,"title":"인천대 기계 — 직무경험·미분방정식·탄성계수","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=55","publishedAt":"2026-01-19","departmentGroup":"기계공학부","universities":["인천대학교"],"comparison":false},
  {"id":1871,"title":"인천대 전자 — C 프로젝트·회로실험·맥스웰","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1871","publishedAt":"2026-02-02","departmentGroup":"전기·전자공학부","universities":["인천대학교"],"comparison":false},
  {"id":1877,"title":"인천대 전기 — 스마트그리드·KCL·KVL 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1877","publishedAt":"2026-02-02","departmentGroup":"전기·전자공학부","universities":["인천대학교"],"comparison":false},
  {"id":1878,"title":"인천대 정보통신 — 옴의 법칙·커패시터·이진트리","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1878","publishedAt":"2026-02-02","departmentGroup":"정보통신공학과","universities":["인천대학교"],"comparison":false},
  {"id":1855,"title":"인천대 무역 — 플랫폼무역·FTA 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1855","publishedAt":"2026-02-02","departmentGroup":"무역학부","universities":["인천대학교"],"comparison":false},
  {"id":256,"title":"강원대 토목 — 측량·진로·팀프로젝트 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=256","publishedAt":"2026-01-21","departmentGroup":"토목공학과","universities":["강원대학교"],"comparison":false},
  {"id":295,"title":"강원대 기계 — 재료역학·미적분·AI 제시문","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=295","publishedAt":"2026-01-21","departmentGroup":"기계공학부","universities":["강원대학교"],"comparison":false},
  {"id":2780,"title":"강원대 메카트로닉스 — 베르누이·미적분 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=2780","publishedAt":"2026-02-05","departmentGroup":"기계의용·메카트로닉스공학과","universities":["강원대학교"],"comparison":false},
  {"id":567,"title":"강원대 컴퓨터 — GPT·머신러닝·프로젝트 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=567","publishedAt":"2026-01-23","departmentGroup":"컴퓨터공학과","universities":["강원대학교"],"comparison":false},
  {"id":929,"title":"강원대 전자 — 래치·플립플롭 질문과 답변","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=929","publishedAt":"2026-01-25","departmentGroup":"전자공학과","universities":["강원대학교"],"comparison":false},
  {"id":258,"title":"강원대 학과 미상 — 영어지문·전공·시사 면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=258","publishedAt":"2026-01-21","departmentGroup":"학과 미상","universities":["강원대학교"],"comparison":false},
  {"id":5122,"title":"UNIST 자연·공학 — 영어 자기소개·서류기반 전공면접","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=5122","publishedAt":"2026-02-18","departmentGroup":"자연·공학계열","universities":["울산과학기술원(UNIST)"],"comparison":false},
  {"id":614,"title":"부산대·경북대 컴퓨터 — 합격자 면접 Q&A","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=614","publishedAt":"2026-01-23","departmentGroup":"컴퓨터·소프트웨어계열","universities":["부산대학교","경북대학교"],"comparison":true},
  {"id":672,"title":"부산대·경북대·부경대 컴퓨터 — 면접 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=672","publishedAt":"2026-01-23","departmentGroup":"컴퓨터·소프트웨어계열","universities":["부산대학교","경북대학교","부경대학교"],"comparison":true},
  {"id":1325,"title":"4개 대학 컴퓨터 — 전공시험·면접 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1325","publishedAt":"2026-01-29","departmentGroup":"컴퓨터·소프트웨어계열","universities":["부산대학교","충남대학교","경북대학교","전남대학교"],"comparison":true},
  {"id":4207,"title":"부산대·경북대 컴퓨터 — 전공 공부·면접 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4207","publishedAt":"2026-02-11","departmentGroup":"컴퓨터·소프트웨어계열","universities":["부산대학교","경북대학교"],"comparison":true},
  {"id":5434,"title":"4개 대학 컴퓨터 — 면접·합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=5434","publishedAt":"2026-02-19","departmentGroup":"컴퓨터·소프트웨어계열","universities":["인천대학교","충북대학교","강원대학교","경북대학교"],"comparison":true},
  {"id":319,"title":"부산대·경북대 전자 — 문제풀이 면접 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=319","publishedAt":"2026-01-21","departmentGroup":"전기·전자계열","universities":["부산대학교","경북대학교"],"comparison":true},
  {"id":722,"title":"부산대·경북대 전자 — 면접 방식·평가 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=722","publishedAt":"2026-01-23","departmentGroup":"전기·전자계열","universities":["부산대학교","경북대학교"],"comparison":true},
  {"id":3948,"title":"4개 대학 전기·전자 — 면접 준비 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=3948","publishedAt":"2026-02-10","departmentGroup":"전기·전자계열","universities":["부산대학교","인천대학교","경북대학교","충남대학교"],"comparison":true},
  {"id":5556,"title":"5개 대학 전기·전자 — 전공·면접 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=5556","publishedAt":"2026-02-21","departmentGroup":"전기·전자계열","universities":["인천대학교","충남대학교","충북대학교","부산대학교","경북대학교"],"comparison":true},
  {"id":1841,"title":"7개 대학 기계공학 — 전공·면접 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=1841","publishedAt":"2026-02-02","departmentGroup":"기계·에너지계열","universities":["경북대학교","전남대학교"],"comparison":true},
  {"id":3151,"title":"부산대 기계·경북대 에너지 — 전공 준비 Q&A","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=3151","publishedAt":"2026-02-06","departmentGroup":"기계·에너지계열","universities":["부산대학교","경북대학교"],"comparison":true},
  {"id":4793,"title":"인천대 기계·부경대 냉동공조 — 면접 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4793","publishedAt":"2026-02-13","departmentGroup":"기계·에너지계열","universities":["인천대학교","부경대학교"],"comparison":true},
  {"id":7683,"title":"인천대·충남대·충북대 기계 — 전공·면접 정보","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=7683","publishedAt":"2026-06-11","departmentGroup":"기계·에너지계열","universities":["인천대학교","충남대학교","충북대학교"],"comparison":true},
  {"id":6388,"title":"4개 대학 신소재 — 전공범위·면접 조언","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=6388","publishedAt":"2026-03-21","departmentGroup":"신소재·재료계열","universities":["부산대학교","경북대학교","전남대학교","충남대학교"],"comparison":true},
  {"id":5721,"title":"한기대·전북대·부경대 건축 — 전공면접 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=5721","publishedAt":"2026-02-23","departmentGroup":"건축공학계열","universities":["한국기술교육대학교","전북대학교","부경대학교"],"comparison":true},
  {"id":4302,"title":"전북대 경제·충남대 사학 — 지원 준비 수기 1","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4302","publishedAt":"2026-02-11","departmentGroup":"인문·상경계열","universities":["전북대학교","충남대학교"],"comparison":true},
  {"id":4313,"title":"전북대 경제·충남대 사학 — 면접·합격수기 2","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4313","publishedAt":"2026-02-11","departmentGroup":"인문·상경계열","universities":["전북대학교","충남대학교"],"comparison":true},
  {"id":4321,"title":"부산대·경북대·충남대 철학 — 면접 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4321","publishedAt":"2026-02-11","departmentGroup":"인문·상경계열","universities":["부산대학교","경북대학교","충남대학교"],"comparison":true},
  {"id":5031,"title":"전남대·전북대·충남대 사학 — 면접 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=5031","publishedAt":"2026-02-16","departmentGroup":"인문·상경계열","universities":["전남대학교","전북대학교","충남대학교"],"comparison":true},
  {"id":7902,"title":"부산대 일본어·인천대 일본문화 — 삭제 수기 복원","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=7902","publishedAt":"2026-06-25","departmentGroup":"인문·상경계열","universities":["부산대학교","인천대학교"],"comparison":true},
  {"id":656,"title":"6개 대학 자연계 — 전공·인성면접 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=656","publishedAt":"2026-01-23","departmentGroup":"자연·사회계열 비동일계","universities":["인천대학교","충남대학교","충북대학교","강원대학교","부산대학교","경북대학교"],"comparison":true},
  {"id":663,"title":"3개 대학 사회·자연계 — 비동일계 면접 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=663","publishedAt":"2026-01-23","departmentGroup":"자연·사회계열 비동일계","universities":["인천대학교","충남대학교","충북대학교"],"comparison":true},
  {"id":4317,"title":"인천대·전남대 등 — 사회·자연계 비동일계 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4317","publishedAt":"2026-02-11","departmentGroup":"자연·사회계열 비동일계","universities":["인천대학교","전남대학교","충남대학교","충북대학교"],"comparison":true},
  {"id":725,"title":"부산대·경북대 — 시험·면접 분위기 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=725","publishedAt":"2026-01-23","departmentGroup":"여러 계열 종합·학교/학과 미상","universities":["부산대학교","경북대학교"],"comparison":true},
  {"id":4147,"title":"4개 대학 — 예상질문·모의면접 준비 합격수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4147","publishedAt":"2026-02-10","departmentGroup":"여러 계열 종합·학교/학과 미상","universities":["강원대학교","전북대학교","부경대학교","전남대학교"],"comparison":true},
  {"id":4180,"title":"학교 미상 — 전적대 수강내역 압박질문 사례","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4180","publishedAt":"2026-02-10","departmentGroup":"여러 계열 종합·학교/학과 미상","universities":[],"comparison":true},
  {"id":4332,"title":"4개 대학 — 기출 활용 면접 준비 수기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=4332","publishedAt":"2026-02-11","departmentGroup":"여러 계열 종합·학교/학과 미상","universities":["충북대학교","강원대학교"],"comparison":true},
  {"id":8320,"title":"부산대·경북대 공대 — 시험·꼬리질문 면접 복기","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=8320","publishedAt":"2026-07-21","departmentGroup":"여러 계열 종합·학교/학과 미상","universities":["부산대학교","경북대학교"],"comparison":true},
  {"id":8468,"title":"4개 대학 데이터계열 — 2024 면접 비교","url":"https://gall.dcinside.com/mgallery/board/view/?id=natpass&no=8468","publishedAt":"2026-07-29","departmentGroup":"여러 계열 종합·학교/학과 미상","universities":["전남대학교","전북대학교","충북대학교","부경대학교"],"comparison":true},
];

export type ReviewKind = "면접후기" | "전공시험" | "준비법" | "합격수기";

export function getReviewKind(title: string): ReviewKind {
  if (title.includes("합격수기") || title.includes("수기 복원")) {
    return "합격수기";
  }

  if (
    title.includes("시험") ||
    title.includes("문제") ||
    title.includes("복원") ||
    title.includes("복기")
  ) {
    return "전공시험";
  }

  if (
    title.includes("공부") ||
    title.includes("독학") ||
    title.includes("준비") ||
    title.includes("기출")
  ) {
    return "준비법";
  }

  return "면접후기";
}
