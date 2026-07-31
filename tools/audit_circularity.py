"""results의 '원점수'가 독립 관측값인지, 환산점수를 뒤집어 만든 값인지 가른다.

왜 필요한가. `derive_formulas.py`는 (원점수, 환산점수)가 한 직선 위에 있는지
본다. 그런데 원본이 환산점수만 공개하는 대학에서는 원점수가 환산식을 뒤집어
만들어진 값이다. 그러면 그 검사는 **순환 논증**이 된다 — 역으로 계산한 값을
다시 정방향으로 계산해 맞는지 보는 것이라, R2는 데이터 품질과 무관하게 1.0이
나온다. 실제로 14칸 중 13칸이 그랬고, 그걸 모르고 "추출이 일관된다"고 읽었다.

판정 기준은 두 가지를 함께 본다.
  ⑴ 원본 파일이 원점수 열을 공개하는가 (SOURCE_PUBLISHES_RAW — 사람이 확인한 사실)
  ⑵ 기록된 원점수가 환산점수의 역산과 반올림 오차 안에서 같은가

⑴이 거짓이면 ⑵의 결과와 무관하게 순환이다. ⑴이 참인데 ⑵도 참이면 그해에는
두 값이 실제로 같은 모집단에서 나왔다는 뜻이고, 대조는 여전히 유효하다.

    python tools/audit_circularity.py
"""
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"

# 원본 성적 자료가 '원점수'를 실제로 싣는가. 파일을 열어 확인한 사실만 적는다.
#   부경대  : '공인영어성적(TOEIC 해당자)' + '영어변환성적점수' 두 열을 모두 싣는다.
#   경북대  : '평균 성적(우리대학 성적반영 방법에 의한)' 환산값만 싣는다.
#   충남대  : '공인영어성적(50점)' 환산값만 싣는다. 별도 시트에 환산표가 있다.
#   전북대  : '토익 점수 평균' 원점수만 싣는다(환산 열 없음).
#   나머지  : 성적 원본이 PDF라 아직 확인하지 않았다.
SOURCE_PUBLISHES_RAW = {
    "부경대학교": True,
    "경북대학교": False,
    "충남대학교": False,
    "전북대학교": True,
    # 미확인 — PDF 원본을 열어 확인하면 여기에 적는다.
    "강원대학교": None,
    "부산대학교": None,
    "인천대학교": None,
    "전남대학교": None,
    "충북대학교": None,
}

# 영어 환산식의 (기울기, 절편). formulaRegistry.ts 와 같은 식이다.
LINEAR_ENGLISH = {
    ("경북대학교", None): (100 / 990, 0.0),
    ("강원대학교", "2024"): (100 / 990, 0.0),
    ("강원대학교", "2025"): (100 / 990, 0.0),
    ("부경대학교", None): (200 / 990, 0.0),
    ("충남대학교", "2024"): (1 / 20, 20 - 385 / 20),
    ("충남대학교", "2025"): (1 / 8.33333333, 60 - 990 / 8.33333333),
    ("충남대학교", "2026"): (1 / 8.33333333, 60 - 990 / 8.33333333),
}

ROUNDING_TOLERANCE = 0.05


def load(name):
    with io.open(RESULTS_DIR / name, encoding="utf-8-sig") as f:
        return json.load(f)


def coefficients(univ, year):
    return LINEAR_ENGLISH.get((univ, year)) or LINEAR_ENGLISH.get((univ, None))


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    records = load("편입_성적_통합.json")

    gaps = defaultdict(list)
    for r in records:
        raw = r.get("최종합격_토익원점수")
        conv = r.get("최종합격_토익환산점수")
        if raw is None or conv is None:
            continue

        coef = coefficients(r["대학명"], r["연도"])
        if coef is None:
            continue

        slope, intercept = coef
        implied_raw = (conv - intercept) / slope
        gaps[(r["대학명"], r["연도"])].append(abs(implied_raw - raw))

    header = "{:<10}{:<6}{:>5}{:>11}{:>11}  {:<12} {}".format(
        "대학", "연도", "n", "평균차", "최대차", "원본에원점수", "판정"
    )
    print(header)
    print("-" * (len(header) + 12))

    circular = []
    for key in sorted(gaps):
        univ, year = key
        diffs = gaps[key]
        largest = max(diffs)
        publishes = SOURCE_PUBLISHES_RAW.get(univ)
        matches = largest < ROUNDING_TOLERANCE

        if publishes is False:
            verdict = "★ 순환 — 대조가 무의미하다"
            circular.append(f"{year} {univ}")
        elif publishes is None:
            verdict = ("순환 의심 — 원본 미확인" if matches else "독립 가능 — 원본 미확인")
            if matches:
                circular.append(f"{year} {univ} (미확인)")
        elif matches:
            verdict = "독립 관측 — 그해엔 두 값이 일치"
        else:
            verdict = "독립 관측 — 대조 유효"

        print("{:<10}{:<6}{:>5}{:>11.5f}{:>11.5f}  {:<12} {}".format(
            univ.replace("대학교", "대"), year, len(diffs),
            sum(diffs) / len(diffs), largest,
            {True: "있음", False: "없음", None: "미확인"}[publishes],
            verdict,
        ))

    print()
    print("=== derive_formulas.py 결과를 읽을 때 주의할 칸 ===")
    if circular:
        for line in circular:
            print(" -", line, "— R2가 1.0이어도 품질의 근거가 되지 못한다")
    else:
        print(" 없음")


if __name__ == "__main__":
    main()
