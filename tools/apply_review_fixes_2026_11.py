"""2026-11-14 자료 검토에서 원문 대조로 확정된 결함을 반영한다.

**이 스크립트는 파일을 쓴다.** tools/apply_fixes.py 와 같은 방식이다 — 무엇을 왜
고치는지 아래에 전부 적고, 쓰기 전에 원문(data/)을 다시 읽어 상수와 맞는지 보고,
고친 뒤에는 건별로 보고한다. 값은 전부 원문에서 읽은 것이고 지어낸 것은 없다.
원문이 빈칸·«-» 인 칸은 0 이 아니라 null 로 둔다(0 은 «0명»이라는 주장이다).

쓰는 파일
  - results/편입_성적_통합.{json,csv} 와 web/src/data/편입_성적_통합.json
    (tools/data_artifacts.py 의 save_artifact_generation 으로 한 번에)
  - web/src/data/registrationCounts.json · disclosureEvidence.json
    (만드는 도구가 저장소에 없어 이 도구가 건별로 고친다)

고치는 것

  [9] 정본 맞추기 — results/ 의 충남대 16행이 web/src/data/ 보다 비어 있었다
      (모집인원·합격인원·모집인원_근거). web 쪽 값이 원문과 맞으므로 정본에 옮긴다.
      다른 대학·다른 필드가 다르면 멈춘다.

  [1] 전북대 2024 «미모집» 근거 — 24_전북대_성적.pdf 는 1~3쪽과 4쪽 표 2~5행이
      일반편입, 4쪽 6행부터 학사편입이다. «PDF 4쪽»을 든 근거 11건은 학사편입
      줄을 읽은 것이다.
        · 틀림 8건 삭제(일반편입 모집이 있었다. 1쪽 표, 모집/지원/등록):
          응용기계공학 9행 9/20/9 · 도시공학과 11행 2/14/2 ·
          소프트웨어공학과 14행 4/25/4 · 정보소재공학 17행 3/10/3 ·
          전자공학부 21행 22/73/20 · 컴퓨터공학부 22행 10/84/10 ·
          IT지능정보공학과 28행 6/25/6 · 국제인문사회학부 32행 1/4/0
        · 겹친 3건 삭제(1쪽을 든 옳은 근거가 따로 있다): 간호학과 ·
          양자시스템공학과 · 국제이공학부
        · 빠진 5건 추가(3쪽 표, 일반편입 0/0/0): 아동학과 4행 · 무용학과 9행 ·
          의학과 14행 · 일본학과 22행 · 치의학과 36행
      성적 통합의 전북 2024 87행은 원문과 전부 맞아 손대지 않는다.

  [2] 충북대 등록 인원 — NN_충북대_합격자.pdf «선발현황»(집계표)의 일반편입학 열.
        · 2025 네 전공 등록 인원 행 추가(25 PDF 1쪽 45·46·49·50행):
          전자공학전공 7 · 반도체공학전공 8 · 인공지능전공 7 · 소프트웨어전공 7
        · 2026 물리학과(26 PDF 1쪽 20행: 모집 4·지원 9·최초합격 4·입학인원 «-»)
          — 숫자가 아니라 «-» 임을 근거와 함께 남긴다(null).

  [3] 충북대 평균 미공개 모집단위 — 성적 PDF 머리말 «1. 최초 합격자가 2명 이하인
      모집단위는 평균 성적 산출에서 제외» 때문에 성적표에 줄이 없던 단위다.
      선발현황에서 모집·지원·최종등록(2026 입학인원)을 읽어 행을 넣는다(점수는
      null, 합격자기준 «최초»). 2024 18 · 2025 31 · 2026 26, 값은 CHUNGBUK_NEW_UNITS.
      최초합격이 1~2명으로 적힌 72건에는 small-cohort 근거도 붙인다. 최초합격
      칸이 빈칸·«-» 인 3건(2025 조형예술학과(동양화전공)·(조소전공), 2026
      디자인학과)은 행만 넣는다.

  [4] 충남대
        · 2024 등록 칸이 «-» 인데 0 이던 3행 → null (24_충남대_합격자.xlsx):
          독어독문학과 8행 · 공공안전학전공 89행 · 무용학과(발레) 37행
        · 2025 «합격인원»에 최초합격 수가 들어간 4행 → 등록 합계로
          (25_충남대_합격자.xlsx «현황», 충남대 다른 행과 같은 뜻으로 맞춘다):
          건축학과(5) 39행 1→0 · 인문사회과학전공 90행 4→2 · 약학과 68행 7→8 ·
          디자인창의학과(도자.섬유디자인) 77행 3→1
        · 2025 기계공학교육과 행 추가 — 25_충남대_합격자.xlsx «현황» 83행
          (모집 5·최초 등록 4·충원 등록 0). 25_충남대_성적.xlsx 에는 줄이 없어
          점수는 null 이다.
        · 2026 무용학과 — 26_충남대_모집요강.pdf PDF 8쪽(책자 4쪽) 모집인원 표:
          한국무용 일반편입 2, 현대무용 «-». 26_충남대_성적.xlsx 일반편입학
          36행(현대무용) 비고 B, 37행(한국무용) 비고 A.
          한국무용 모집인원 null→2, 현대무용 모집인원 2→0.

  [5] 부산대 2026 — 26_부산대_성적.pdf 의 합격인원 «-» 18칸과 지원인원 «-» 2칸이
      0 으로 들어가 있었다 → null. 쪽·행은 PUSAN_2026_DASH_ROWS.

  [6] 전남대 — 등록자수 칸이 빈칸인데 1 이던 2행 → null.
      24_전남대_성적.pdf 2쪽 18행 역사교육과(모집 1·지원 4·등록 빈칸·예비 1),
      25_전남대_성적.pdf 3쪽 20행 한국화전공(모집 1·지원 2·등록 빈칸·예비 1).

  [7] 경북대 2026 예술대학 묶음 — 26_경북대_성적.xlsx 는 한 모집단위를 하위 전공
      여러 줄로 나눠 싣고 모집인원·경쟁률 칸만 병합한다. 저장 행은 첫 줄 이름과
      첫 줄 숫자만 갖고 있었다.
        · 157~172행(D·F 병합, 모집 1, 경쟁률 6.00:1): 지원 합 6, 최종등록 합 0
          → 표시명 «음악학과», 지원인원 1→6
        · 185~187행(D·F 병합, 모집 1, 경쟁률 3.00:1): 지원 합 3, 최종등록 합 1
          → 표시명 «미술학과», 지원인원 0→3, 합격인원 0→1
      모집단위 이름은 26_경북대_모집요강.pdf PDF 13쪽(책자 12쪽) 모집인원 표의
      «음악학과 1 · 미술학과 1». 학과_원본명은 원문 첫 줄 이름 그대로 둔다.

  [8] 부경대 2025 미모집 6개 학과 근거 추가 — 25_부경대_모집요강.pdf PDF 9·10쪽
      모집인원 표의 일반편입 칸이 «-», 25_부경대_성적.xlsx 일반편입 평균성적 현황
      해당 행은 모집인원 빈칸·지원 0·등록 0: 국어국문학과 8행 · 유아교육과 21행 ·
      간호학과 27행 · 과학컴퓨팅학과 28행 · 수해양산업교육과 64행 · 건축학전공 83행.

고치지 않는 것(보류 — 보고서에 사유)
  - 충북대 2024 서양화전공·조소전공, 2026 서양화전공: 선발현황 이름으로 넣으면
    화면 코드가 실기 전형으로 알아보지 못한다(web/src/utils/chungbukFormulaProfiles.ts).
  - 경북대 2026 기악전공(가야금): 묶음 숫자가 첫 줄과 같아 값은 맞다. 표시명을
    «국악학과»로 바꾸면 화면 코드가 예능계로 알아보지 못한다.
  - 충남대 2026 합격자 현황 39행 «무용학과(현대무용)»(모집 2)이 실제로 한국무용
    줄인지는 원문만으로 확정되지 않는다. 한국무용 등록 인원은 채우지 않는다.
  - 부산대 2025 일어일문학과 모집인원(결과표 2 / 요강 3): 두 문서가 다르다.

눈으로만 확인한 것(이 도구가 다시 읽지 못한다)
  - 26_충남대_모집요강.pdf 는 그림 PDF 다. 8쪽 무용학과 줄.
  - 26_경북대_모집요강.pdf 13쪽은 글자가 띄어 찍혀 이름 대조가 안 된다.

    python tools/apply_review_fixes_2026_11.py --dry-run   # 무엇이 바뀌는지만 본다
    python tools/apply_review_fixes_2026_11.py             # 실제로 쓴다
    (data/ 원문이 없는 자리에서는 --skip-source-check 를 붙여야 돈다)
"""
import io
import json
import os
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from apply_fixes import canonical_display_name  # noqa: E402
from data_artifacts import (  # noqa: E402
    EXCEPTION,
    FORMULA,
    STANDARD,
    save_artifact_generation,
)

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"
DATA_DIR = ROOT / "data"

REGISTRATION = "registrationCounts.json"
EVIDENCE = "disclosureEvidence.json"

SCORE_FIELDS = (
    "최종합격_토익환산점수",
    "최종합격_토익원점수",
    "최종합격_학점환산점수",
    "최종합격_학점원점수_100점만점",
)

# ── [9] 정본에 옮기는 필드 ────────────────────────────────────
PARITY_FIELDS = ("모집인원", "합격인원", "모집인원_근거")

# ── [1] 전북대 2024 ───────────────────────────────────────────
JEONBUK_2024_SOURCE = "24_전북대_성적.pdf"
JEONBUK_2024_WRONG_SOURCE = (
    "24_전북대_성적.pdf / PDF 4쪽 / 해당 모집단위 모집인원 열"
)
# (모집단위, 1쪽 표 행, 모집, 지원, 등록) — 일반편입 줄
JEONBUK_2024_RECRUITED = [
    ("응용기계공학", 9, 9, 20, 9),
    ("도시공학과", 11, 2, 14, 2),
    ("소프트웨어공학과", 14, 4, 25, 4),
    ("정보소재공학", 17, 3, 10, 3),
    ("전자공학부", 21, 22, 73, 20),
    ("컴퓨터공학부", 22, 10, 84, 10),
    ("IT지능정보공학과", 28, 6, 25, 6),
    ("국제인문사회학부", 32, 1, 4, 0),
]
# 1쪽을 든 옳은 근거가 따로 있어 «PDF 4쪽» 쪽만 지운다. (모집단위, 1쪽 표 행)
JEONBUK_2024_DUPLICATED = [
    ("간호학과", 2),
    ("양자시스템공학과", 18),
    ("국제이공학부", 31),
]
# 3쪽 표에서 일반편입 0/0/0 인데 근거가 없던 단위. (모집단위, 3쪽 표 행)
JEONBUK_2024_MISSING_ZERO = [
    ("아동학과", 4),
    ("무용학과", 9),
    ("의학과", 14),
    ("일본학과", 22),
    ("치의학과", 36),
]

# ── [2] 충북대 등록 인원 ──────────────────────────────────────
# (저장 학과_원본명, 선발현황 표기, 25 PDF 1쪽 표 행, 모집, 지원, 최초합격, 최종등록)
CHUNGBUK_2025_REGISTERED = [
    ("전자공학전공", "전자공학부(전자공학전공)", 45, 7, 52, 7, 7),
    ("반도체공학전공", "전자공학부(반도체공학전공)", 46, 9, 46, 9, 8),
    ("인공지능전공", "소프트웨어학부(인공지능전공)", 49, 7, 34, 7, 7),
    ("소프트웨어전공", "소프트웨어학부(소프트웨어전공)", 50, 7, 48, 7, 7),
]
# 26 PDF 1쪽 20행: 모집 4 · 지원 9 · 최초합격 4 · 입학인원 «-»
CHUNGBUK_2026_PHYSICS = ("물리학과", 1, 20, 4, 9, 4, "-")

# ── [3] 충북대 평균 미공개 모집단위 ───────────────────────────
# (연도, PDF 쪽, 표 행, 선발현황 모집단위, 모집, 지원, 최초합격, 최종등록·입학인원)
# 숫자가 아닌 칸은 원문 그대로 "" (빈칸) 또는 "-" 로 적는다 — 저장할 때 null 이 된다.
CHUNGBUK_NEW_UNITS = [
    ("2024", 1, 6, "독일언어문화학과", 2, 5, 2, 1),
    ("2024", 1, 7, "프랑스언어문화학과", 1, 4, 1, 0),
    ("2024", 1, 8, "러시아언어문화학과", 1, 2, 1, 1),
    ("2024", 1, 10, "사학과", 2, 11, 2, 2),
    ("2024", 2, 20, "식물의학과", 1, 5, 1, 1),
    ("2024", 2, 22, "원예과학과", 1, 10, 1, 1),
    ("2024", 2, 30, "교육학과", 1, 8, 1, 1),
    ("2024", 2, 31, "국어교육과", 2, 14, 2, 2),
    ("2024", 2, 32, "영어교육과", 1, 12, 1, 1),
    ("2024", 2, 33, "역사교육과", 1, 5, 1, 1),
    ("2024", 2, 34, "지리교육과", 1, 5, 1, 1),
    ("2024", 2, 35, "사회교육과", 2, 9, 2, 2),
    ("2024", 2, 37, "생물교육과", 2, 7, 2, 1),
    ("2024", 2, 39, "체육교육과", 1, 6, 1, 1),
    ("2024", 3, 4, "식품영양학과", 2, 11, 2, 2),
    ("2024", 3, 5, "아동복지학과", 1, 13, 1, 1),
    ("2024", 3, 8, "소비자학과", 1, 6, 1, 1),
    ("2024", 3, 19, "디자인학과", 2, 4, 2, 2),
    ("2025", 1, 3, "국어국문학과", 2, 11, 2, 2),
    ("2025", 1, 4, "중어중문학과", 2, 9, 2, 2),
    ("2025", 1, 6, "독일언어문화학과", 2, 9, 2, 2),
    ("2025", 1, 7, "프랑스언어문화학과", 1, 6, 1, 1),
    ("2025", 1, 8, "러시아언어문화학과", 1, 4, 1, ""),
    ("2025", 1, 9, "철학과", 1, 10, 1, 1),
    ("2025", 1, 10, "사학과", 1, 6, 1, 1),
    ("2025", 1, 13, "사회학과", 2, 22, 2, 2),
    ("2025", 1, 14, "심리학과", 2, 21, 2, 2),
    ("2025", 1, 16, "정치외교학과", 2, 20, 2, 1),
    ("2025", 1, 25, "생화학과", 2, 9, 2, 2),
    ("2025", 1, 27, "지구환경과학과", 2, 9, 2, 2),
    ("2025", 1, 36, "신소재공학과", 1, 26, 1, 1),
    ("2025", 1, 39, "환경공학과", 2, 8, 2, 1),
    ("2025", 1, 42, "건축학과", 2, 22, 2, 2),
    ("2025", 2, 4, "식물자원학과", 2, 7, 2, 2),
    ("2025", 2, 5, "환경생명화학과", 2, 12, 2, 2),
    ("2025", 2, 6, "식품생명공학과", 2, 17, 2, 2),
    ("2025", 2, 11, "산림학과", 1, 6, 1, 1),
    ("2025", 2, 13, "바이오시스템공학과", 1, 5, 1, 1),
    ("2025", 2, 14, "목재·종이과학과", 1, 5, 1, ""),
    ("2025", 2, 15, "농업경제학과", 2, 18, 2, 2),
    ("2025", 2, 21, "물리교육과", 1, 2, 1, 1),
    ("2025", 2, 24, "수학교육과", 1, 4, 1, 1),
    ("2025", 2, 26, "식품영양학과", 1, 12, 1, 1),
    ("2025", 2, 27, "아동복지학과", 2, 12, 2, 2),
    ("2025", 2, 29, "주거환경학과", 1, 17, 1, 1),
    ("2025", 2, 39, "조형예술학과(동양화전공)", 1, "", "", ""),
    ("2025", 2, 40, "조형예술학과(서양화전공)", 2, 1, 1, ""),
    ("2025", 2, 41, "조형예술학과(조소전공)", 2, 1, "", ""),
    ("2025", 2, 42, "디자인학과", 1, 8, 1, ""),
    ("2026", 1, 4, "중어중문학과", 2, 8, 2, "-"),
    ("2026", 1, 6, "독일언어문화학과", 2, 9, 2, "-"),
    ("2026", 1, 7, "프랑스언어문화학과", 1, 6, 1, 1),
    ("2026", 1, 8, "러시아언어문화학과", 2, 9, 2, 2),
    ("2026", 1, 10, "고고미술사학과", 1, 13, 1, 1),
    ("2026", 1, 12, "사회학과", 2, 23, 2, 2),
    ("2026", 1, 23, "미생물학과", 2, 12, 2, 2),
    ("2026", 1, 26, "지구환경과학과", 1, 6, 1, 1),
    ("2026", 1, 34, "화학공학과", 2, 21, 2, 2),
    ("2026", 2, 17, "환경생명화학과", 2, 11, 2, 2),
    ("2026", 2, 20, "식물의학과", 2, 13, 2, 2),
    ("2026", 2, 22, "원예과학과", 2, 15, 2, 2),
    ("2026", 2, 23, "산림학과", 1, 3, 1, "-"),
    ("2026", 2, 26, "목재·종이과학과", 1, 4, 1, "-"),
    ("2026", 2, 31, "국어교육과", 1, 10, 1, 1),
    ("2026", 2, 32, "역사교육과", 2, 17, 2, 2),
    ("2026", 2, 33, "사회교육과", 1, 11, 1, 1),
    ("2026", 2, 34, "윤리교육과", 2, 24, 2, 2),
    ("2026", 2, 35, "물리교육과", 2, 10, 2, 2),
    ("2026", 2, 37, "지구과학교육과", 1, 6, 1, 1),
    ("2026", 2, 38, "수학교육과", 1, 12, 1, 1),
    ("2026", 3, 6, "주거환경학과", 1, 10, 1, 1),
    ("2026", 3, 7, "소비자학과", 1, 10, 1, 1),
    ("2026", 3, 16, "수의생명보건전공", 2, 6, 2, "-"),
    ("2026", 3, 17, "바이오헬스케어전공", 2, 6, 2, 1),
    ("2026", 3, 21, "디자인학과", 1, 6, "-", "-"),
]
CHUNGBUK_REGISTERED_LABEL = {
    "2024": "일반편입 최종등록인원",
    "2025": "일반편입 최종등록인원",
    "2026": "일반편입 입학인원",
}
CHUNGBUK_SMALL_COHORT_CODE = "안내 1번"

# ── [4] 충남대 ────────────────────────────────────────────────
CHUNGNAM_COUNT_SHEET = {
    "2024": "편입학전형 충원합격자 현황",
    "2025": "현황",
    "2026": "현황",
}
# 등록 칸 둘 다 «-». (모집단위, 24_충남대_합격자.xlsx 행, 모집, 합격)
CHUNGNAM_2024_DASH_REGISTERED = [
    ("독어독문학과", 8, 3, 3),
    ("공공안전학전공", 89, 2, 1),
    ("무용학과(발레)", 37, 1, 1),
]
# (저장 학과_원본명 = 성적 xlsx 표기, 합격자 현황 표기, 25_충남대_합격자.xlsx 행,
#  모집, 합격, 최초 등록, 충원 등록, 전, 뒤)
CHUNGNAM_2025_REGISTERED_SUM = [
    ("건축학과(5)", "건축학과(5)", 39, 1, 1, 0, "-", 1, 0),
    ("인문사회과학전공", "인문·사회과학전공", 90, 7, 4, 2, "-", 4, 2),
    ("약학과", "약학과(6)", 68, 6, 7, 5, 3, 7, 8),
    ("디자인창의학과(도자.섬유디자인)", "디자인창의학과(도자·섬유디자인)",
     77, 3, 3, 1, "-", 3, 1),
]
# 25_충남대_합격자.xlsx «현황» 83행: 모집 5 · 합격 5 · 최초 등록 4 · 충원 등록 0
CHUNGNAM_2025_MECH_EDU = ("기계공학교육과", 83, 5, 5, 4, 0)
CHUNGNAM_2026_KOREAN_DANCE_BASIS = (
    "26_충남대_모집요강.pdf / PDF 8쪽(책자 4쪽) / 모집인원 표 "
    "무용학과 한국무용 일반편입 2명"
)
CHUNGNAM_2026_MODERN_DANCE_BASIS = (
    "26_충남대_모집요강.pdf / PDF 8쪽(책자 4쪽) / 모집인원 표 무용학과 현대무용 "
    "일반편입 «-», 26_충남대_성적.xlsx / 일반편입학 / 36행 비고 B: 모집계획인원 0명"
)

# ── [5] 부산대 2026 ───────────────────────────────────────────
# (모집단위, PDF 쪽, 표 행, 모집, 지원) — 합격인원 칸은 전부 «-», 지원도 «-» 면 "-"
PUSAN_2026_DASH_ROWS = [
    ("불어불문학과", 1, 7, 1, 8),
    ("노어노문학과", 1, 9, 2, 9),
    ("특수교육과", 2, 28, 1, 13),
    ("수학교육과", 2, 29, 1, 12),
    ("물리교육과", 2, 30, 1, 6),
    ("무역학부", 2, 33, 2, 38),
    ("공공정책학부", 2, 36, 2, 15),
    ("식품영양학과", 3, 6, 2, 30),
    ("한국음악학과 현악.성악전공", 3, 10, 1, 1),
    ("한국음악학과 관악.타악전공", 3, 11, 1, "-"),
    ("한국음악학과 이론.작곡전공", 3, 12, 1, "-"),
    ("무용학과 한국무용전공", 3, 16, 1, 1),
    ("간호학과", 3, 19, 3, 53),
    ("식물생명과학과", 3, 23, 1, 4),
    ("식품공학과", 3, 26, 1, 16),
    ("바이오산업기계공학과", 3, 29, 1, 4),
    ("바이오환경에너지학과", 3, 31, 1, 6),
    ("조경학과", 3, 32, 1, 8),
]

# ── [6] 전남대 ────────────────────────────────────────────────
# (연도, 모집단위, PDF 쪽, 표 행, 모집, 지원, 예비순위) — 등록자수 칸이 빈칸
CHONNAM_BLANK_REGISTERED = [
    ("2024", "역사교육과", 2, 18, 1, 4, 1),
    ("2025", "한국화전공", 3, 20, 1, 2, 1),
]

# ── [7] 경북대 2026 예술대학 묶음 ─────────────────────────────
# 첫 줄 이름(학과_원본명) → 요강 모집단위명, 엑셀 행 범위, 묶음 합계, 하위 줄 이름.
KYUNGBUK_2026_BUNDLES = {
    "성악전공": {
        "표시명": "음악학과",
        "행": (157, 172),
        "모집인원": 1,
        "지원인원": 6,
        "합격인원": 0,
        "하위": [
            "성악전공", "피아노전공", "작곡전공",
            "관현악전공(바이올린)", "관현악전공(비올라)", "관현악전공(첼로)",
            "관현악전공(콘트라베이스)", "관현악전공(플룻)", "관현악전공(오보에)",
            "관현악전공(클라리넷)", "관현악전공(바순)", "관현악전공(호른)",
            "관현악전공(트럼펫)", "관현악전공(트럼본)", "관현악전공(타악기)",
            "관현악전공(튜바)",
        ],
        "비고": (
            "원문은 음악학과 1명 모집을 성악·피아노·작곡·관현악 16줄로 나눠 "
            "싣는다(모집인원·경쟁률 칸 병합). 지원 6명·최종등록 0명은 16줄의 "
            "합이다. 근거: 26_경북대_성적.xlsx 157~172행, "
            "26_경북대_모집요강.pdf PDF 13쪽(책자 12쪽)"
        ),
    },
    "한국화전공": {
        "표시명": "미술학과",
        "행": (185, 187),
        "모집인원": 1,
        "지원인원": 3,
        "합격인원": 1,
        "하위": ["한국화전공", "서양화전공", "조소전공"],
        "비고": (
            "원문은 미술학과 1명 모집을 한국화·서양화·조소 3줄로 나눠 "
            "싣는다(모집인원·경쟁률 칸 병합). 지원 3명·최종등록 1명은 3줄의 "
            "합이다. 근거: 26_경북대_성적.xlsx 185~187행, "
            "26_경북대_모집요강.pdf PDF 13쪽(책자 12쪽)"
        ),
    },
}

# ── [8] 부경대 2025 미모집 ────────────────────────────────────
PUKYONG_NOT_RECRUITED_CODE = "모집인원 표 일반편입 «-»"
# (모집단위, 25_부경대_성적.xlsx 행, 요강 PDF 쪽)
PUKYONG_2025_NOT_RECRUITED = [
    ("국어국문학과", 8, 9),
    ("유아교육과", 21, 9),
    ("간호학과", 27, 9),
    ("과학컴퓨팅학과", 28, 9),
    ("수해양산업교육과", 64, 10),
    ("건축학전공", 83, 10),
]


class ReviewFixError(RuntimeError):
    """예상한 전·후 값이 아니거나 원문과 상수가 어긋난다."""


def load(path):
    with io.open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def count_or_none(value):
    """원문 칸 값을 저장 값으로. 빈칸·«-» 는 null 이다."""
    return value if isinstance(value, int) else None


def count_file_only_keys():
    """성적 파일에 줄이 없고 선발현황·합격자 현황에서만 온 행의 (대학, 연도, 학과).

    tools/diff_extraction.py 는 성적 파일만 다시 읽으므로 이 행들을 고아([B])로
    잡는다. 그쪽에서 이 목록을 빼는 데 쓴다. 값 대조는 이 도구의
    verify_sources 가 한다.
    """
    keys = {
        ("충북대학교", year, canonical_display_name("충북대학교", year, unit))
        for year, _page, _row, unit, *_ in CHUNGBUK_NEW_UNITS
    }
    keys.add(("충남대학교", "2025", CHUNGNAM_2025_MECH_EDU[0]))
    return keys


def bundled_units():
    """한 저장 행이 원문 여러 줄의 합인 경우. (대학, 연도, 첫 줄 이름) → 하위 줄 이름."""
    return {
        ("경북대학교", "2026", anchor): list(spec["하위"])
        for anchor, spec in KYUNGBUK_2026_BUNDLES.items()
    }


# ── 원문 다시 읽기 ────────────────────────────────────────────

def squeeze(text):
    return re.sub(r"\s+", "", str(text or ""))


def pdf_tables(path):
    """{쪽: [표, ...]} — 표는 줄바꿈을 지운 칸 목록의 목록."""
    import pdfplumber

    pages = {}
    with pdfplumber.open(path) as pdf:
        for number, page in enumerate(pdf.pages, 1):
            pages[number] = [
                [[(cell or "").replace("\n", "") for cell in row] for row in table]
                for table in page.extract_tables()
            ]
    return pages


def source_cell(text):
    """PDF·엑셀 칸 글자를 상수와 견줄 값으로. 숫자면 int, 아니면 글자 그대로."""
    if isinstance(text, (int, float)) and not isinstance(text, bool):
        return int(text)
    stripped = str(text or "").strip().replace(",", "")
    return int(stripped) if re.fullmatch(r"\d+", stripped) else stripped


def verify_sources():
    """상수로 적은 값이 원문과 같은지 다시 읽는다. 어긋난 줄 목록을 돌려준다.

    무엇을 재나: 이 파일 상수의 쪽·행·이름·숫자가 data/ 원문 표 칸과 같은가.
    못 보는 것: 그림 PDF(충남 2026 요강)와 글자가 띄어 찍힌 표(경북 2026 요강).
    """
    from openpyxl import load_workbook

    problems = []
    checked = 0

    def expect(label, actual, expected):
        nonlocal checked
        checked += 1
        if actual != expected:
            problems.append(f"{label}: 원문 {actual!r} / 상수 {expected!r}")

    # [1] 전북 2024 — 1쪽·3쪽 표. 칸 순서: 구분, 대학, 모집단위, 세부, 모집, 지원, 등록
    pages = pdf_tables(DATA_DIR / JEONBUK_2024_SOURCE)
    for name, row, quota, applied, enrolled in JEONBUK_2024_RECRUITED:
        cells = pages[1][0][row - 1]
        expect(f"전북 2024 {name} 1쪽 {row}행",
               (squeeze(cells[3]), *map(source_cell, cells[4:7])),
               (name, quota, applied, enrolled))
    for name, row in JEONBUK_2024_DUPLICATED:
        cells = pages[1][0][row - 1]
        expect(f"전북 2024 {name} 1쪽 {row}행",
               (squeeze(cells[3]), *map(source_cell, cells[4:7])),
               (name, 0, 0, 0))
    for name, row in JEONBUK_2024_MISSING_ZERO:
        cells = pages[3][0][row - 1]
        expect(f"전북 2024 {name} 3쪽 {row}행",
               (squeeze(cells[3]), *map(source_cell, cells[4:7])),
               (name, 0, 0, 0))

    # [2][3] 충북 선발현황 — 칸 순서: 단과대학, 모집단위, 모집, 지원, 최초합격, 등록
    chungbuk = {
        year: pdf_tables(DATA_DIR / f"{year[2:]}_충북대_합격자.pdf")
        for year in ("2024", "2025", "2026")
    }
    for _stored, printed, row, quota, applied, first, enrolled in CHUNGBUK_2025_REGISTERED:
        cells = chungbuk["2025"][1][0][row - 1]
        expect(f"충북 2025 {printed} 1쪽 {row}행",
               (squeeze(cells[1]), *map(source_cell, cells[2:6])),
               (printed, quota, applied, first, enrolled))
    name, page, row, quota, applied, first, enrolled = CHUNGBUK_2026_PHYSICS
    cells = chungbuk["2026"][page][0][row - 1]
    expect(f"충북 2026 {name} {page}쪽 {row}행",
           (squeeze(cells[1]), *map(source_cell, cells[2:6])),
           (name, quota, applied, first, enrolled))
    for year, page, row, unit, quota, applied, first, enrolled in CHUNGBUK_NEW_UNITS:
        cells = chungbuk[year][page][0][row - 1]
        expect(f"충북 {year} {unit} {page}쪽 {row}행",
               (squeeze(cells[1]), *map(source_cell, cells[2:6])),
               (squeeze(unit), quota, applied, first, enrolled))
    for year in ("2024", "2025", "2026"):
        import pdfplumber

        with pdfplumber.open(DATA_DIR / f"{year[2:]}_충북대_성적.pdf") as pdf:
            head = pdf.pages[0].extract_text() or ""
        expect(f"충북 {year} 성적 PDF 머리말 1번",
               "1. 최초 합격자가 2명 이하인 모집단위는 평균 성적 산출에서 제외" in head,
               True)

    # [4] 충남 합격자 현황 — 2024 는 한 칸 밀려 있다(B=대학, C=모집단위).
    def chungnam_row(year, row):
        book = load_workbook(
            DATA_DIR / f"{year[2:]}_충남대_합격자.xlsx", data_only=True)
        sheet = book[CHUNGNAM_COUNT_SHEET[year]]
        offset = 1 if year == "2024" else 0
        values = [sheet.cell(row, column + offset).value for column in range(2, 7)]
        book.close()
        return (squeeze(values[0]), *map(source_cell, values[1:]))

    for name, row, quota, admitted in CHUNGNAM_2024_DASH_REGISTERED:
        expect(f"충남 2024 {name} {row}행",
               chungnam_row("2024", row), (name, quota, admitted, "-", "-"))
    for _stored, printed, row, quota, admitted, first, extra, _b, _a in (
            CHUNGNAM_2025_REGISTERED_SUM):
        expect(f"충남 2025 {printed} {row}행",
               chungnam_row("2025", row), (printed, quota, admitted, first, extra))
    name, row, quota, admitted, first, extra = CHUNGNAM_2025_MECH_EDU
    expect(f"충남 2025 {name} {row}행",
           chungnam_row("2025", row), (name, quota, admitted, first, extra))

    book = load_workbook(DATA_DIR / "25_충남대_성적.xlsx", data_only=True)
    sheet = book["일반편입학"]
    units = {squeeze(sheet.cell(r, 3).value) for r in range(1, sheet.max_row + 1)}
    book.close()
    expect("충남 2025 성적 xlsx 일반편입학에 기계공학교육과 줄 없음",
           "기계공학교육과" in units, False)

    book = load_workbook(DATA_DIR / "26_충남대_성적.xlsx", data_only=True)
    sheet = book["일반편입학"]
    for row, unit, note in ((36, "무용학과(현대무용)", "B"),
                            (37, "무용학과(한국무용)", "A")):
        cells = [sheet.cell(row, c).value for c in range(1, sheet.max_column + 1)]
        expect(f"충남 2026 성적 xlsx {row}행",
               (squeeze(cells[2]), squeeze([c for c in cells if c is not None][-1])),
               (unit, note))
    book.close()

    # [5] 부산 2026 — 칸 순서: 단과대학, 모집단위, 모집, 지원, 합격
    pages = pdf_tables(DATA_DIR / "26_부산대_성적.pdf")
    for name, page, row, quota, applied in PUSAN_2026_DASH_ROWS:
        table = pages[page][-1]
        cells = table[row - 1]
        expect(f"부산 2026 {name} {page}쪽 {row}행",
               (cells[1], *map(source_cell, cells[2:5])),
               (name, quota, applied, "-"))

    # [6] 전남 — 칸 순서: 구분, 캠퍼스, 대학, 모집단위, 모집, 지원, 등록, 예비순위
    for year, name, page, row, quota, applied, waiting in CHONNAM_BLANK_REGISTERED:
        cells = pdf_tables(DATA_DIR / f"{year[2:]}_전남대_성적.pdf")[page][0][row - 1]
        expect(f"전남 {year} {name} {page}쪽 {row}행",
               (cells[3], *map(source_cell, cells[4:8])),
               (name, quota, applied, "", waiting))

    # [7] 경북 2026 — 칸: C 모집단위, D 모집, E 지원, F 경쟁률, H 최종등록자
    book = load_workbook(DATA_DIR / "26_경북대_성적.xlsx", data_only=True)
    sheet = book.worksheets[0]
    merged = {str(cell_range) for cell_range in sheet.merged_cells.ranges}
    for anchor, spec in KYUNGBUK_2026_BUNDLES.items():
        first, last = spec["행"]
        rows = range(first, last + 1)
        expect(f"경북 2026 {anchor} 묶음 병합 칸",
               {f"D{first}:D{last}", f"F{first}:F{last}"} <= merged, True)
        expect(f"경북 2026 {anchor} 묶음 하위 줄 이름",
               [squeeze(sheet.cell(r, 3).value) for r in rows],
               [squeeze(name) for name in spec["하위"]])
        expect(f"경북 2026 {anchor} 묶음 합계",
               (source_cell(sheet.cell(first, 4).value),
                sum(source_cell(sheet.cell(r, 5).value) for r in rows),
                sum(source_cell(sheet.cell(r, 8).value) for r in rows)),
               (spec["모집인원"], spec["지원인원"], spec["합격인원"]))
        expect(f"경북 2026 {anchor} 묶음 경쟁률",
               squeeze(sheet.cell(first, 6).value),
               f"{spec['지원인원'] / spec['모집인원']:.2f}:1")
    book.close()

    # [8] 부경 2025 — 성적 xlsx 는 모집인원 빈칸, 요강 표는 일반편입 칸 «-»
    book = load_workbook(DATA_DIR / "25_부경대_성적.xlsx", data_only=True)
    sheet = book["일반편입 평균성적 현황"]
    guide = pdf_tables(DATA_DIR / "25_부경대_모집요강.pdf")
    for name, row, page in PUKYONG_2025_NOT_RECRUITED:
        expect(f"부경 2025 {name} 성적 xlsx {row}행",
               (squeeze(sheet.cell(row, 2).value), sheet.cell(row, 3).value,
                source_cell(sheet.cell(row, 4).value),
                source_cell(sheet.cell(row, 5).value)),
               (name, None, 0, 0))
        general = [
            cells[4]
            for cells in guide[page][0]
            if any(re.sub(r"[●★]|<.*?>", "", squeeze(c)) == name for c in cells[2:4])
        ]
        expect(f"부경 2025 {name} 요강 {page}쪽 일반편입 칸", general, ["-"])
    book.close()

    return checked, problems


# ── 고치기 ────────────────────────────────────────────────────

def find_record(standard, univ, year, name, by="학과_원본명"):
    found = [
        record for record in standard
        if record["대학명"] == univ and record["연도"] == year
        and record.get(by) == name
    ]
    if len(found) != 1:
        raise ReviewFixError(f"{univ} {year} {name}: 저장 행이 {len(found)}개다")
    return found[0]


def set_field(changes, tag, record, field, after, allowed_before, source):
    """예상한 전 값일 때만 바꾼다. 이미 뒤 값이면 지나간다."""
    current = record.get(field)
    if current == after and (field in record or after is None):
        return
    if current not in allowed_before:
        raise ReviewFixError(
            f"{record['대학명']} {record['연도']} {record['학과']} · {field}: "
            f"지금 값 {current!r} 이 예상한 전 값 {allowed_before!r} 이 아니다"
        )
    record[field] = after
    changes.append(
        f"[{tag}] {record['대학명']} {record['연도']} {record['학과']} · {field} "
        f"{json.dumps(current, ensure_ascii=False)} → "
        f"{json.dumps(after, ensure_ascii=False)} ({source})"
    )


def insert_after_block(rows, new_row, same_block):
    """같은 대학·연도 묶음의 마지막 줄 바로 뒤에 넣는다. 묶음이 없으면 끝에."""
    last = max((i for i, row in enumerate(rows) if same_block(row)), default=None)
    if last is None:
        rows.append(new_row)
    else:
        rows.insert(last + 1, new_row)


def new_record(univ, year, unit, quota, applied, enrolled, basis, quota_basis=None):
    record = {
        "대학명": univ,
        "연도": year,
        "모집인원": quota,
        "지원인원": applied,
        "합격인원": enrolled,
        **{field: None for field in SCORE_FIELDS},
        "학과": canonical_display_name(univ, year, unit),
        "학과_원본명": unit,
        "합격자기준": basis,
    }
    if quota_basis is not None:
        record["모집인원_근거"] = quota_basis
    return record


def add_record(changes, tag, standard, record, source):
    univ, year = record["대학명"], record["연도"]
    existing = [
        row for row in standard
        if row["대학명"] == univ and row["연도"] == year
        and (row["학과"] == record["학과"]
             or row["학과_원본명"] == record["학과_원본명"])
    ]
    if existing:
        if existing != [record]:
            raise ReviewFixError(
                f"{univ} {year} {record['학과']}: 이미 다른 값의 행이 있다"
            )
        return
    insert_after_block(
        standard, record,
        lambda row: row["대학명"] == univ and row["연도"] == year)
    changes.append(
        f"[{tag}] {univ} {year} {record['학과']} 행 추가 — 모집 "
        f"{json.dumps(record['모집인원'])} · 지원 {json.dumps(record['지원인원'])} · "
        f"등록 {json.dumps(record['합격인원'])}, 점수 null ({source})"
    )


def set_registration(changes, tag, registrations, row):
    """registrationCounts 한 줄을 넣거나 바꾼다. 열쇠는 (대학, 연도, 학과_원본명)."""
    univ, year, name = row[:3]
    same = [i for i, old in enumerate(registrations) if old[:3] == [univ, year, name]]
    if len(same) > 1:
        raise ReviewFixError(f"등록 인원 줄이 겹친다: {univ} {year} {name}")
    if same:
        if registrations[same[0]] == row:
            return
        changes.append(
            f"[{tag}] 등록 인원 {univ} {year} {name} "
            f"{json.dumps(registrations[same[0]][3:6])} → {json.dumps(row[3:6])} "
            f"({row[6]})"
        )
        registrations[same[0]] = row
        return
    insert_after_block(
        registrations, row, lambda old: old[0] == univ and old[1] == year)
    changes.append(
        f"[{tag}] 등록 인원 {univ} {year} {name} (없음) → "
        f"{json.dumps(row[3])} ({row[6]})"
    )


def add_evidence(changes, tag, evidence, row):
    univ, year = row[:2]
    if row in evidence:
        return
    insert_after_block(
        evidence, row, lambda old: old[0] == univ and old[1] == year)
    changes.append(
        f"[{tag}] 근거 추가 {univ} {year} {row[2]} · {row[3]} «{row[4]}» ({row[5]})"
    )


def remove_evidence(changes, tag, evidence, row, reason):
    if row not in evidence:
        return
    evidence.remove(row)
    changes.append(
        f"[{tag}] 근거 삭제 {row[0]} {row[1]} {row[2]} · {row[3]} ({row[5]}) — {reason}"
    )


def sync_canonical(changes, standard, web_standard):
    """[9] web 쪽에만 채워진 충남대 인원·근거를 정본으로 옮긴다."""
    if len(standard) != len(web_standard):
        # 이 도구가 이미 돈 뒤라면 두 쪽 행 수가 같다. 다르면 손이 닿은 것이다.
        raise ReviewFixError(
            f"results {len(standard)}행 / web {len(web_standard)}행 — 행 수가 다르다"
        )
    for record, web_record in zip(standard, web_standard):
        key = (record["대학명"], record["연도"], record["학과"])
        if key != (web_record["대학명"], web_record["연도"], web_record["학과"]):
            raise ReviewFixError(f"results 와 web 의 행 순서가 다르다: {key}")
        differing = sorted(
            field for field in set(record) | set(web_record)
            if record.get(field) != web_record.get(field)
        )
        if not differing:
            continue
        if record["대학명"] != "충남대학교" or not set(differing) <= set(PARITY_FIELDS):
            raise ReviewFixError(
                f"results↔web 차이가 예상 밖이다: {key} {differing}"
            )
        for field in PARITY_FIELDS:
            if field not in differing:
                continue
            if record.get(field) is not None:
                raise ReviewFixError(
                    f"정본에 이미 값이 있는데 web 과 다르다: {key} {field}"
                )
            record[field] = web_record[field]
        changes.append(
            f"[9] 정본 {key[0]} {key[1]} {key[2]} · "
            + ", ".join(
                f"{field} null → {json.dumps(web_record[field], ensure_ascii=False)}"
                for field in PARITY_FIELDS if field in differing
            )
            + " (web/src/data 와 맞춤)"
        )


def apply_all(standard, registrations, evidence):
    changes = []

    # ── [1] 전북대 2024 ───────────────────────────────────────
    for name, row, quota, applied, enrolled in JEONBUK_2024_RECRUITED:
        record = find_record(standard, "전북대학교", "2024", name)
        actual = (record["모집인원"], record["지원인원"], record["합격인원"])
        if actual != (quota, applied, enrolled):
            raise ReviewFixError(f"전북 2024 {name} 저장 값 {actual} 이 원문과 다르다")
        remove_evidence(
            changes, 1, evidence,
            ["전북대학교", "2024", name, "not-recruited", "모집인원 0명",
             JEONBUK_2024_WRONG_SOURCE],
            f"학사편입 줄. 일반편입은 1쪽 {row}행 모집 {quota}·지원 {applied}·등록 {enrolled}",
        )
    for name, row in JEONBUK_2024_DUPLICATED:
        kept = ["전북대학교", "2024", name, "not-recruited", "모집인원 0명",
                "24_전북대_성적.pdf / PDF 1쪽 / 해당 모집단위 모집인원 열"]
        if kept not in evidence:
            raise ReviewFixError(f"전북 2024 {name}: 1쪽 근거가 없다")
        remove_evidence(
            changes, 1, evidence,
            ["전북대학교", "2024", name, "not-recruited", "모집인원 0명",
             JEONBUK_2024_WRONG_SOURCE],
            f"학사편입 줄. 1쪽 {row}행 근거(일반편입 0명)가 따로 있다",
        )
    for name, row in JEONBUK_2024_MISSING_ZERO:
        add_evidence(
            changes, 1, evidence,
            ["전북대학교", "2024", name, "not-recruited", "모집인원 0명",
             "24_전북대_성적.pdf / PDF 3쪽 / 해당 모집단위 모집인원 열"],
        )

    # ── [2] 충북대 등록 인원 ──────────────────────────────────
    for stored, _printed, row, quota, applied, _first, enrolled in CHUNGBUK_2025_REGISTERED:
        record = find_record(standard, "충북대학교", "2025", stored)
        actual = (record["모집인원"], record["지원인원"], record["합격인원"])
        if actual != (quota, applied, enrolled):
            raise ReviewFixError(f"충북 2025 {stored} 저장 값 {actual} 이 원문과 다르다")
        set_registration(
            changes, 2, registrations,
            ["충북대학교", "2025", stored, enrolled, None, None,
             f"25_충북대_합격자.pdf / PDF 1쪽 / {CHUNGBUK_REGISTERED_LABEL['2025']}"],
        )
    name, page, row, quota, applied, _first, enrolled = CHUNGBUK_2026_PHYSICS
    record = find_record(standard, "충북대학교", "2026", name)
    if (record["모집인원"], record["지원인원"], record["합격인원"]) != (
            quota, applied, count_or_none(enrolled)):
        raise ReviewFixError("충북 2026 물리학과 저장 값이 원문과 다르다")
    set_registration(
        changes, 2, registrations,
        ["충북대학교", "2026", name, None, None, None,
         f"26_충북대_합격자.pdf / PDF {page}쪽 / "
         f"{CHUNGBUK_REGISTERED_LABEL['2026']} 칸 «-»"],
    )

    # ── [3] 충북대 평균 미공개 모집단위 ───────────────────────
    for year, page, row, unit, quota, applied, first, enrolled in CHUNGBUK_NEW_UNITS:
        count_source = f"{year[2:]}_충북대_합격자.pdf / PDF {page}쪽"
        add_record(
            changes, 3, standard,
            new_record("충북대학교", year, unit, quota, count_or_none(applied),
                       count_or_none(enrolled), "최초"),
            f"{count_source} {row}행",
        )
        label = CHUNGBUK_REGISTERED_LABEL[year]
        if isinstance(enrolled, int):
            registration_source = f"{count_source} / {label}"
        else:
            registration_source = (
                f"{count_source} / {label} 칸 "
                + ("«-»" if enrolled == "-" else "빈칸")
            )
        set_registration(
            changes, 3, registrations,
            ["충북대학교", year, unit, count_or_none(enrolled), None, None,
             registration_source],
        )
        if isinstance(first, int) and 1 <= first <= 2:
            add_evidence(
                changes, 3, evidence,
                ["충북대학교", year, unit, "small-cohort",
                 CHUNGBUK_SMALL_COHORT_CODE,
                 f"{year[2:]}_충북대_성적.pdf / PDF 1쪽 / 머리말 «1. 최초 합격자가 "
                 f"2명 이하인 모집단위는 평균 성적 산출에서 제외», "
                 f"{count_source} / 일반편입 최초합격 {first}명"],
            )

    # ── [4] 충남대 ────────────────────────────────────────────
    for name, row, _quota, _admitted in CHUNGNAM_2024_DASH_REGISTERED:
        record = find_record(standard, "충남대학교", "2024", name)
        set_field(
            changes, 4, record, "합격인원", None, (0,),
            f"24_충남대_합격자.xlsx / {CHUNGNAM_COUNT_SHEET['2024']} / {row}행 "
            "최초 등록·충원 등록 칸 «-»",
        )
    for name, _printed, row, _q, admitted, first, extra, before, after in (
            CHUNGNAM_2025_REGISTERED_SUM):
        record = find_record(standard, "충남대학교", "2025", name)
        set_field(
            changes, 4, record, "합격인원", after, (before,),
            f"25_충남대_합격자.xlsx / 현황 / {row}행 합격 {admitted} · "
            f"최초 등록 {first} · 충원 등록 {extra} → 등록 합계",
        )
    name, row, quota, _admitted, first, extra = CHUNGNAM_2025_MECH_EDU
    add_record(
        changes, 4, standard,
        new_record(
            "충남대학교", "2025", name, quota, None, first + extra, "최초",
            f"25_충남대_합격자.xlsx / 현황 / {row}행 일반편입학 모집인원"),
        f"25_충남대_합격자.xlsx / 현황 / {row}행",
    )
    set_registration(
        changes, 4, registrations,
        ["충남대학교", "2025", name, first + extra, first, extra,
         f"25_충남대_합격자.xlsx / 현황 / {row}행 일반편입 최초 등록 + 충원 등록"],
    )
    record = find_record(standard, "충남대학교", "2026", "무용학과(한국무용)")
    set_field(changes, 4, record, "모집인원", 2, (None,),
              CHUNGNAM_2026_KOREAN_DANCE_BASIS)
    if record.get("모집인원_근거") != CHUNGNAM_2026_KOREAN_DANCE_BASIS:
        record["모집인원_근거"] = CHUNGNAM_2026_KOREAN_DANCE_BASIS
        changes.append(
            "[4] 충남대학교 2026 무용학과(한국무용) · 모집인원_근거 → "
            + CHUNGNAM_2026_KOREAN_DANCE_BASIS
        )
    record = find_record(standard, "충남대학교", "2026", "무용학과(현대무용)")
    set_field(changes, 4, record, "모집인원", 0, (2,),
              CHUNGNAM_2026_MODERN_DANCE_BASIS)
    if record.get("모집인원_근거") != CHUNGNAM_2026_MODERN_DANCE_BASIS:
        record["모집인원_근거"] = CHUNGNAM_2026_MODERN_DANCE_BASIS
        changes.append(
            "[4] 충남대학교 2026 무용학과(현대무용) · 모집인원_근거 → "
            + CHUNGNAM_2026_MODERN_DANCE_BASIS
        )

    # ── [5] 부산대 2026 ───────────────────────────────────────
    for name, page, row, _quota, applied in PUSAN_2026_DASH_ROWS:
        record = find_record(standard, "부산대학교", "2026", name, by="학과")
        source = f"26_부산대_성적.pdf / PDF {page}쪽 {row}행 «-»"
        set_field(changes, 5, record, "합격인원", None, (0,), source)
        if applied == "-":
            set_field(changes, 5, record, "지원인원", None, (0,), source)

    # ── [6] 전남대 ────────────────────────────────────────────
    for year, name, page, row, _quota, _applied, _waiting in CHONNAM_BLANK_REGISTERED:
        record = find_record(standard, "전남대학교", year, name, by="학과")
        set_field(
            changes, 6, record, "합격인원", None, (1,),
            f"{year[2:]}_전남대_성적.pdf / PDF {page}쪽 {row}행 등록자수 빈칸",
        )

    # ── [7] 경북대 2026 예술대학 묶음 ─────────────────────────
    for anchor, spec in KYUNGBUK_2026_BUNDLES.items():
        record = find_record(standard, "경북대학교", "2026", anchor)
        first, last = spec["행"]
        source = f"26_경북대_성적.xlsx / {first}~{last}행 합계"
        if record["모집인원"] != spec["모집인원"]:
            raise ReviewFixError(f"경북 2026 {anchor} 모집인원이 원문과 다르다")
        set_field(changes, 7, record, "지원인원", spec["지원인원"],
                  (0, 1), source)
        set_field(changes, 7, record, "합격인원", spec["합격인원"],
                  (0,), source)
        set_field(changes, 7, record, "비고", spec["비고"], (None,), source)
        if record["학과"] != spec["표시명"]:
            if record["학과"] != anchor:
                raise ReviewFixError(f"경북 2026 {anchor} 표시명이 예상과 다르다")
            changes.append(
                f"[7] 경북대학교 2026 학과 표시명 {anchor!r} → {spec['표시명']!r} "
                "(26_경북대_모집요강.pdf PDF 13쪽 모집단위명, 학과_원본명은 그대로)"
            )
            record["학과"] = spec["표시명"]

    # ── [8] 부경대 2025 미모집 ────────────────────────────────
    for name, row, page in PUKYONG_2025_NOT_RECRUITED:
        add_evidence(
            changes, 8, evidence,
            ["부경대학교", "2025", name, "not-recruited",
             PUKYONG_NOT_RECRUITED_CODE,
             f"25_부경대_모집요강.pdf / PDF {page}쪽 / 모집인원 표, "
             f"25_부경대_성적.xlsx / 일반편입 평균성적 현황 / {row}행 모집인원 빈칸"],
        )

    return changes


# ── 쓰기 전 검증 ──────────────────────────────────────────────

def evidence_name(name):
    """web/src/utils/disclosureEvidence.ts 의 normalize 와 같은 규칙."""
    return re.sub(r"[\s·.ㆍ‧•・]", "", name)


def validate(standard, registrations, evidence):
    """고친 뒤 세 자료가 서로 어긋나지 않는지 본다.

    무엇을 재나: 열쇠 중복, 줄 모양, «미모집» 근거와 모집인원 > 0 이 같이 걸린
    행(이번에 고친 대학·연도), 충북·충남의 합격인원과 등록 인원 줄의 일치.
    못 보는 것: 값이 원문과 같은지(verify_sources 몫), 화면에 어떻게 보이는지.
    """
    problems = []

    keys = [(r["대학명"], r["연도"], r["학과"]) for r in standard]
    duplicated = {key for key in keys if keys.count(key) > 1}
    if duplicated:
        problems.append(f"성적 통합 열쇠 중복: {sorted(duplicated)}")

    for row in registrations:
        if not (isinstance(row, list) and len(row) == 7
                and all(isinstance(v, str) for v in (row[0], row[1], row[2], row[6]))
                and all(v is None or isinstance(v, int) for v in row[3:6])):
            problems.append(f"등록 인원 줄 모양이 다르다: {row}")
    registration_keys = [tuple(row[:3]) for row in registrations]
    duplicated = {k for k in registration_keys if registration_keys.count(k) > 1}
    if duplicated:
        problems.append(f"등록 인원 열쇠 중복: {sorted(duplicated)}")

    for row in evidence:
        if not (isinstance(row, list) and len(row) == 6
                and all(isinstance(v, str) for v in row)
                and row[3] in ("not-recruited", "small-cohort")):
            problems.append(f"근거 줄 모양이 다르다: {row}")
    evidence_keys = [(r[0], r[1], evidence_name(r[2])) for r in evidence]
    touched = {
        ("전북대학교", "2024"), ("부경대학교", "2025"), ("충남대학교", "2026"),
        ("충북대학교", "2024"), ("충북대학교", "2025"), ("충북대학교", "2026"),
    }
    duplicated = {
        k for k in evidence_keys
        if evidence_keys.count(k) > 1 and k[:2] in touched
    }
    if duplicated:
        problems.append(f"근거 열쇠 중복: {sorted(duplicated)}")

    not_recruited = {
        key for key, row in zip(evidence_keys, evidence) if row[3] == "not-recruited"
    }
    for record in standard:
        if (record["대학명"], record["연도"]) not in touched:
            continue
        key = (record["대학명"], record["연도"], evidence_name(record["학과_원본명"]))
        if key in not_recruited and (record.get("모집인원") or 0) > 0:
            problems.append(
                f"«미모집» 근거와 모집인원 {record['모집인원']} 이 같이 걸렸다: {key}"
            )

    registered = {tuple(row[:3]): row[3] for row in registrations}
    for record in standard:
        if record["대학명"] not in ("충북대학교", "충남대학교"):
            continue
        key = (record["대학명"], record["연도"], record["학과_원본명"])
        if key not in registered:
            if record["대학명"] == "충북대학교":
                problems.append(f"충북 등록 인원 줄이 없다: {key}")
            continue
        # 충남 2025 조소과·회화과(한국화)는 원문이 합격 0 · 등록 «-» 라
        # 합격인원 0 / 등록 null 로 다르다. 0 과 null 의 차이만 넘어간다.
        if registered[key] != record["합격인원"] and (
                registered[key] is not None or record["합격인원"] != 0):
            problems.append(
                f"합격인원 {record['합격인원']} 과 등록 인원 줄 {registered[key]} 이 "
                f"다르다: {key}"
            )

    return problems


# ── 저장 ──────────────────────────────────────────────────────

def serialize_rows(rows):
    """registrationCounts·disclosureEvidence 의 모양: 한 줄에 한 항목."""
    body = ",\n".join(json.dumps(row, ensure_ascii=False) for row in rows)
    return ("[\n" + body + "\n]\n").encode("utf-8")


def check_row_file_format(path, rows):
    if path.read_bytes() != serialize_rows(rows):
        raise ReviewFixError(
            f"{path.name} 의 줄 모양이 이 도구가 쓰는 모양과 다르다 — 덮어쓰지 않는다"
        )


def write_row_file(path, rows):
    payload = serialize_rows(rows)
    if json.loads(payload.decode("utf-8")) != rows:
        raise ReviewFixError(f"{path.name} 다시 읽은 값이 다르다")
    handle = tempfile.NamedTemporaryFile(
        dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False)
    try:
        with handle:
            handle.write(payload)
        os.replace(handle.name, path)
    except BaseException:
        if os.path.exists(handle.name):
            os.unlink(handle.name)
        raise


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    dry_run = "--dry-run" in sys.argv
    skip_source_check = "--skip-source-check" in sys.argv

    standard = load(RESULTS_DIR / STANDARD)
    web_standard = load(WEB_DATA_DIR / STANDARD)
    exceptions = load(RESULTS_DIR / EXCEPTION)
    formulas = load(RESULTS_DIR / FORMULA)
    registrations = load(WEB_DATA_DIR / REGISTRATION)
    evidence = load(WEB_DATA_DIR / EVIDENCE)

    try:
        if skip_source_check:
            print("원문 다시 읽기를 건너뛰었다(--skip-source-check).")
        else:
            checked, problems = verify_sources()
            print(f"=== 원문 다시 읽기: {checked}건 대조, 어긋남 {len(problems)}건 ===")
            for line in problems:
                print(" !", line)
            if problems:
                raise ReviewFixError("원문과 상수가 어긋나 멈춘다")

        check_row_file_format(WEB_DATA_DIR / REGISTRATION, registrations)
        check_row_file_format(WEB_DATA_DIR / EVIDENCE, evidence)

        changes = []
        sync_canonical(changes, standard, web_standard)
        before = (
            json.dumps(registrations, ensure_ascii=False),
            json.dumps(evidence, ensure_ascii=False),
        )
        changes.extend(apply_all(standard, registrations, evidence))

        problems = validate(standard, registrations, evidence)
        if problems:
            for line in problems:
                print(" !", line)
            raise ReviewFixError("고친 뒤 검증에서 걸려 멈춘다")
    except (ReviewFixError, OSError, KeyError, IndexError) as exc:
        print(f"!! {exc.__class__.__name__}: {exc}", file=sys.stderr)
        print("!! 아무 파일도 쓰지 않았다.", file=sys.stderr)
        return 1

    print(f"\n=== 수정 {len(changes)}건 ===")
    for line in changes:
        print(" -", line)
    by_tag = {}
    for line in changes:
        tag = line[1:line.index("]")]
        by_tag[tag] = by_tag.get(tag, 0) + 1
    print("\n항목별: " + " · ".join(
        f"[{tag}] {count}건" for tag, count in sorted(by_tag.items())))

    if dry_run:
        print("\n--dry-run 이라 파일을 쓰지 않았다.")
        return 0

    if not changes:
        print("\n바꿀 것이 없다.")
        return 0

    parity = save_artifact_generation(
        RESULTS_DIR,
        WEB_DATA_DIR,
        {STANDARD: standard, EXCEPTION: exceptions, FORMULA: formulas},
    )
    if json.dumps(registrations, ensure_ascii=False) != before[0]:
        write_row_file(WEB_DATA_DIR / REGISTRATION, registrations)
    if json.dumps(evidence, ensure_ascii=False) != before[1]:
        write_row_file(WEB_DATA_DIR / EVIDENCE, evidence)

    print("\nresults/ 와 web/src/data/ 양쪽에 반영했다.")
    print(
        f"성적 {len(standard)}행 / 등록 인원 {len(registrations)}줄 / "
        f"근거 {len(evidence)}줄"
    )
    for name, result in parity.items():
        print(
            f"{name}: JSON {result.json_rows}행 / CSV {result.csv_rows}행 / "
            f"JSON-only {result.json_only} / CSV-only {result.csv_only} / "
            f"값 차이 {result.value_mismatches} / 키 중복 {result.duplicate_keys}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
