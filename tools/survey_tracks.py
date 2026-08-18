# -*- coding: utf-8 -*-
"""모집단위를 **학문계열**로 묶고, 계열 안에서 합격 토익·경쟁률로 줄 세워 본다. 읽기 전용.

    python tools/survey_tracks.py

`results/편입_성적_통합.json` 만 읽는다. 아무것도 쓰지 않는다 —
`results/` 에 등급 파일을 만드는 것은 별건이다(`web/src/data` 동기화가 걸린다).

왜 있나: 갤에서 말하는 「메이저 / 비메」를 시뮬레이터가 어떻게 나눠야 하는지 판정하려고
만들었다. 결론은 `기록/2026-08-18-계열-메이저-구분-시안.md` 에 있다 — **이름 한 축으로는
안 되고**(하위 25% 의 34%가 「전화기컴」 이름을 달고 있다) 계열 안에서 데이터로 등급을
매겨야 한다는 것.
"""
import collections
import io
import json
import re
import statistics as st
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROWS = json.load(io.open("results/편입_성적_통합.json", encoding="utf-8"))

# ── 1축: 학문계열 (이름으로 정한다 — 해마다 안 변한다) ──────────────────────
계열규칙 = [
    # ★ 메디컬은 이 갤의 범위가 아니다 — 공지 `02_기초FAQ.html` 이 «메디컬 편입 갤로 가세요»
    #   라고 적어 두었다. 세더라도 **따로** 센다. 최고·평균에 섞으면 그 수가 거짓말을 한다.
    #   간호·보건은 범위 안이다(공지가 내보내지 않는다).
    ("메디컬(범위 밖)", r"의학과|의예|치의|한의|약학|수의"),
    ("간호·보건", r"간호|약자원|물리치료|작업치료|임상병리|방사선|치위생|응급구조|보건"),
    ("사범·교육", r"교육과$|교육학|사범|교육전공|교직"),
    ("예체능", r"미술|음악|디자인|체육|무용|연극|영화|영상|조형|공예|사진|만화|애니|실용|피아노|성악|"
             r"국악|스포츠|회화|한국화|서양화|조소|관현악|기악|작곡|이론전공|공연|운동건강|예술"),
    # ★ 공학보다 먼저 선점한다 — `광` 이 「관광」에, `산업` 이 「패션산업·농산업」에 걸려
    #   관광경영·패션산업이 공학으로 들어가 있었다(2026-08-18 실측 25개 중 7개가 오탐).
    ("사회", r"관광|컨벤션|외식"),
    ("자연·농생명", r"패션|농산업|동물산업|바이오헬스|식품생명|생명산업"),
    ("공학", r"공학|기계|전자|전기|반도체|컴퓨터|소프트|SW|IT|정보통신|통신|신소재|재료|화공|고분자|나노|"
             r"토목|건축|건설|도시|조선|해양시스템|항공|우주|원자|에너지|자동차|로봇|메카|섬유|"
             r"세라믹|금속|광공학|광전자|레이저|제어|계측|융합기전|시스템공|AI|인공지능|데이터|보안|게임|콘텐츠공|"
             r"위치정보시스템|과학컴퓨팅|모빌리티|ICT|물류교통|밀리터리|"
             r"산업공학|산업경영|산업정보|산업시스템|산업기계|산업기술융합|생물산업|산업융합"),
    ("자연·농생명", r"수학|물리|화학|생물|생명|미생물|통계|지구|천문|대기|해양|수산|식품|영양|의류|의생활|"
                r"농업|원예|산림|임학|축산|동물|작물|식물|조경|지질|환경|바이오|생태|스마트팜|과학교육|"
                r"목재|종이|과학학과"),
    ("사회", r"경영|경제|무역|통상|회계|세무|금융|부동산|행정|정치|외교|사회학|사회복지|심리|언론|미디어|"
            r"신문방송|광고|홍보|관광|호텔|법학|법|소비자|아동|가족|주거|군사|국제|지리|문헌정보|"
            r"자치|정책|산업복지|스포츠산업|비즈니스|공공인재|공공안전|리더십|평생교육|생활복지|"
            r"창의인재|상담"),
    ("인문", r"국어국문|영어영문|중어|중국|일어|일본|독어|독일|불어|프랑스|노어|러시아|서어|스페인|"
            r"사학|역사|철학|고고|미술사|종교|문화인류|언어|문예창작|한문|영어학|영미|아시아|유럽|"
            r"문화콘텐츠|인문"),
]
계열규칙 = [(n, re.compile(p)) for n, p in 계열규칙]


def 계열(학과):
    for n, r in 계열규칙:
        if r.search(학과):
            return n
    return "미분류"


# ── 2축: 수요등급 (데이터로 정한다 — 해마다 변한다) ─────────────────────────
def 수치(r):
    경쟁 = (r["지원인원"] / r["모집인원"]) if r.get("지원인원") and r.get("모집인원") else None
    return 경쟁, r.get("최종합격_토익원점수")


by = collections.defaultdict(list)
for r in ROWS:
    by[(r["대학명"], r["학과"])].append(r)

계열분포 = collections.Counter()
미분류 = collections.Counter()
for (대, 과), rs in by.items():
    c = 계열(과)
    계열분포[c] += 1
    if c == "미분류":
        미분류[과] += 1

print("== 모집단위(대학×학과) %d개의 계열 분포" % len(by))
for k, v in 계열분포.most_common():
    print("  %-10s %4d" % (k, v))
print("== 미분류 %d종" % len(미분류))
for k, v in 미분류.most_common(40):
    print("   ", k)

# ── 수요등급 시안: 계열 안에서 3개년 합격 토익·경쟁률로 줄 세운다 ──────────
메이저후보 = re.compile(r"전자|전기|기계|화학공|화공|컴퓨터|소프트|반도체|정보통신|AI|인공지능|"
                    r"신소재|재료|산업공|건축|토목")


def 통계(rs):
    경쟁 = [r["지원인원"] / r["모집인원"] for r in rs
          if r.get("지원인원") and r.get("모집인원")]
    토익 = [r["최종합격_토익원점수"] for r in rs if r.get("최종합격_토익원점수")]
    return (st.mean(경쟁) if 경쟁 else None,
            st.mean(토익) if 토익 else None,
            sum(r["모집인원"] for r in rs if r.get("모집인원")))


print()
EXCLUDE = ("메디컬(범위 밖)",)

for 목표계열 in ("공학", "사회", "인문"):
    표 = []
    for (대, 과), rs in by.items():
        if 계열(과) != 목표계열:
            continue
        경쟁, 토익, 모집 = 통계(rs)
        if 토익 is None or 경쟁 is None:
            continue
        표.append((토익, 경쟁, 모집, 대, 과, bool(메이저후보.search(과))))
    표.sort(reverse=True)
    n = len(표)
    print("== %s — 경쟁률·합격토익 둘 다 있는 모집단위 %d개" % (목표계열, n))
    상위 = 표[:n // 4] if n >= 8 else 표
    하위 = 표[-(n // 4):] if n >= 8 else []
    print("   합격 토익 상위 25%% 평균 %.0f · 하위 25%% 평균 %.0f"
          % (st.mean(x[0] for x in 상위), st.mean(x[0] for x in 하위)))
    print("   상위 25%% 중 이름이 「전화기컴」 부류인 것 %d/%d · 하위 25%% 중 %d/%d"
          % (sum(1 for x in 상위 if x[5]), len(상위),
             sum(1 for x in 하위 if x[5]), len(하위)))
    print("   ─ 상위 12")
    for 토익, 경쟁, 모집, 대, 과, m in 표[:12]:
        print("     %s%-6s %-28s 토익%6.1f 경쟁%5.1f 모집%3d" % ("★" if m else " ", 대[:3], 과[:28], 토익, 경쟁, 모집))
    print("   ─ 하위 8")
    for 토익, 경쟁, 모집, 대, 과, m in 표[-8:]:
        print("     %s%-6s %-28s 토익%6.1f 경쟁%5.1f 모집%3d" % ("★" if m else " ", 대[:3], 과[:28], 토익, 경쟁, 모집))
    print()

# ── 같은 대학 안에서 모집단위별 합격 토익이 얼마나 벌어지나 ─────────────────
# 「우리 학교 컷은 900」이라는 말이 성립하는지 보는 자리다.
대학별 = collections.defaultdict(lambda: collections.defaultdict(list))
for r in ROWS:
    if r.get("최종합격_토익원점수") and 계열(r["학과"]) not in EXCLUDE:
        대학별[r["대학명"]][r["학과"]].append(r["최종합격_토익원점수"])

print("== 대학 안에서의 폭 (모집단위별 평균의 최저~최고) — 메디컬 제외")
폭 = []
for u, ds in 대학별.items():
    m = {d: st.mean(v) for d, v in ds.items()}
    lo, hi = min(m, key=m.get), max(m, key=m.get)
    폭.append((m[hi] - m[lo], u, len(m), lo, m[lo], hi, m[hi]))
for w, u, n, lo, lov, hi, hiv in sorted(폭, reverse=True):
    print("   %-7s 모집단위 %3d · %3.0f(%s) ~ %3.0f(%s) · 폭 %.0f"
          % (u[:4], n, lov, lo[:18], hiv, hi[:18], w))

# ── 공지 FAQ 가 이미 선언한 「메이저」가 데이터에서 실제로 위인가 ──────────
# 정본: natpass-notice/원본/02_기초FAQ.html
#   문과 메이저 — 영어영문 · 영어교육 · 경영 · 미디어커뮤니케이션
#   이과 메이저 — 전전(전기전자) · 기계 · 컴공
FAQ_메이저 = {
    "문과": re.compile(r"영어영문|영어교육|경영(?!정보)|미디어커뮤니케이션|신문방송"),
    "이과": re.compile(r"전기|전자|기계|컴퓨터|소프트|정보컴퓨터"),
}
계열군 = {"문과": ("인문", "사회", "사범·교육"), "이과": ("공학", "자연·농생명")}

print()
print("== 공지 FAQ 의 「메이저」가 실제로 위인가 (메디컬 제외 · 3개년 평균 합격 토익)")
for 군, pat in FAQ_메이저.items():
    표 = []
    for (대, 과), rs in by.items():
        c = 계열(과)
        if c in EXCLUDE or c not in 계열군[군]:
            continue
        토익 = [r["최종합격_토익원점수"] for r in rs if r.get("최종합격_토익원점수")]
        if 토익:
            표.append((st.mean(토익), 대, 과, bool(pat.search(과))))
    표.sort(reverse=True)
    n = len(표)
    메 = [x for x in 표 if x[3]]
    비 = [x for x in 표 if not x[3]]
    상위4분의1 = set(id(x) for x in 표[:max(1, n // 4)])
    print("   %s — 모집단위 %d개 · FAQ 메이저에 걸리는 것 %d개" % (군, n, len(메)))
    print("      메이저 평균 %.0f · 나머지 평균 %.0f · 차 %.0f"
          % (st.mean(x[0] for x in 메), st.mean(x[0] for x in 비),
             st.mean(x[0] for x in 메) - st.mean(x[0] for x in 비)))
    print("      메이저 중 상위 25%% 안에 든 것 %d/%d"
          % (sum(1 for x in 메 if id(x) in 상위4분의1), len(메)))
    print("      메이저의 순위 분포(1=최상위): "
          + " ".join(str(i + 1) for i, x in enumerate(표) if x[3])[:200])
