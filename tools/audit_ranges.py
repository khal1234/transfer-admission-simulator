"""값이 물리적으로 가능한 범위 안에 있는지 검사한다. 읽기 전용.

추출이 내부적으로 일관돼도(역산 R2=1) 값 자체가 말이 안 되는 경우는 따로다.
실제로 `최종합격_학점원점수_100점만점`에 187.5가 들어 있는 레코드가 있었고,
토익 미반영 학과의 토익 원점수가 null이 아니라 0.0으로 기록돼 있었다.
0은 "값 없음"이 아니라 "0점"으로 읽히므로 평균과 비교를 오염시킨다.

    python tools/audit_ranges.py
"""
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"

# (필드, 최소, 최대, 0을 값으로 인정하는가)
RANGES = [
    ("최종합격_토익원점수", 10, 990, False),
    ("최종합격_학점원점수_100점만점", 0, 100, False),
    ("최종합격_토익환산점수", 0, 1000, False),
    ("최종합격_학점환산점수", 0, 1000, False),
    ("모집인원", 0, 500, True),
    ("지원인원", 0, 5000, True),
    ("합격인원", 0, 500, True),
]


def load(name):
    with io.open(RESULTS_DIR / name, encoding="utf-8-sig") as f:
        return json.load(f)


def check(records, source_label):
    problems = []

    for r in records:
        where = "{} {} {}".format(
            r["연도"], r["대학명"].replace("대학교", "대"), r["학과"]
        )

        for field, low, high, zero_ok in RANGES:
            value = r.get(field)
            if value is None:
                continue

            if not isinstance(value, (int, float)):
                problems.append((where, field, value, "숫자가 아니다"))
                continue

            if value == 0 and not zero_ok:
                # null 이어야 할 자리에 0이 들어가면 '0점'으로 읽혀 평균을 오염시킨다.
                problems.append((where, field, value, "0은 값 없음이 아니라 0점으로 읽힌다"))
            elif value < low or value > high:
                problems.append((where, field, value, f"허용 범위 {low}~{high} 밖"))

    print(f"=== {source_label}: {len(records)}건 중 이상 {len(problems)}건 ===")
    for where, field, value, why in problems:
        print(f"  {where:<34} {field:<30} = {value}   ({why})")
    print()

    return problems


def check_cross_field(records, source_label):
    """모집-지원-합격 사이의 관계가 성립하는지 본다."""
    problems = []

    for r in records:
        where = "{} {} {}".format(
            r["연도"], r["대학명"].replace("대학교", "대"), r["학과"]
        )
        applied = r.get("지원인원")
        passed = r.get("합격인원")

        if applied is not None and passed is not None and passed > applied:
            problems.append(f"{where} — 합격 {passed} > 지원 {applied}")

    print(f"=== {source_label}: 인원 관계 이상 {len(problems)}건 ===")
    for line in problems:
        print(" -", line)
    print()

    return problems


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    standard = load("편입_성적_통합.json")
    exceptions = load("편입_예외학과_통합.json")

    total = 0
    total += len(check(standard, "표준 데이터"))
    total += len(check(exceptions, "예외 데이터"))
    total += len(check_cross_field(standard, "표준 데이터"))
    total += len(check_cross_field(exceptions, "예외 데이터"))

    print(f"합계 {total}건")
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
