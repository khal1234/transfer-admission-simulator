"""원본(data/)과 추출 결과(results/)의 대응 관계를 실측한다. 읽기 전용.

results/ 의 JSON은 과거에 Gemini CLI로 뽑은 것이고, 뽑는 과정(파서)은 리포에
남아 있지 않다. 그래서 "이 숫자가 어느 원본에서 나왔는가"를 아무도 되짚을 수
없는 상태다. 이 스크립트는 그 대조의 첫 단계로,

  - 어떤 (대학, 연도)의 원본이 있고 없는지
  - 그에 대응하는 레코드가 몇 건 있는지
  - 원본이 없는데 레코드가 있는 칸(출처 불명)은 어디인지
  - 값이 비어 있는 비율이 유독 높은 칸(추출 실패 의심)은 어디인지

를 표로 낸다. 값 자체가 맞는지는 여기서 판정하지 않는다 — 그건 원문 대조의
몫이고, 이 표는 어디를 먼저 볼지 정하는 데 쓴다.

    python tools/audit_sources.py
"""
import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RESULTS_DIR = ROOT / "results"

# data/ 파일명 규약: 24_충북대_모집요강.pdf  →  (2024, 충북대, 모집요강)
FILENAME_RE = re.compile(r"^(\d{2})_([^_]+)_(모집요강|성적|합격자)\.(pdf|xlsx|xls)$")

KIND_ORDER = ["모집요강", "성적", "합격자"]

# 점수 계산에 실제로 쓰이는 필드. 이게 비어 있으면 그 레코드는 비교가 안 된다.
SCORE_FIELDS = [
    "최종합격_토익환산점수",
    "최종합격_토익원점수",
    "최종합격_학점환산점수",
    "최종합격_학점원점수_100점만점",
]


def load_json(path):
    with io.open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def scan_sources():
    """data/ 를 훑어 (연도, 대학) -> {종류: 파일명} 으로 만든다."""
    sources = defaultdict(dict)
    unmatched = []

    if not DATA_DIR.is_dir():
        return sources, unmatched

    for path in sorted(DATA_DIR.iterdir()):
        if not path.is_file():
            continue
        m = FILENAME_RE.match(path.name)
        if not m:
            unmatched.append(path.name)
            continue
        yy, univ, kind, _ext = m.groups()
        sources[(f"20{yy}", univ)][kind] = path.name

    return sources, unmatched


def normalize_univ(name):
    """'충북대학교' -> '충북대' (data/ 파일명 표기에 맞춘다)."""
    return name.replace("대학교", "대")


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    sources, unmatched = scan_sources()

    standard = load_json(RESULTS_DIR / "편입_성적_통합.json")
    exceptions = load_json(RESULTS_DIR / "편입_예외학과_통합.json")

    std_count = defaultdict(int)
    exc_count = defaultdict(int)
    empty_count = defaultdict(int)

    for r in standard:
        key = (r["연도"], normalize_univ(r["대학명"]))
        std_count[key] += 1
        if all(r.get(f) is None for f in SCORE_FIELDS):
            empty_count[key] += 1

    for r in exceptions:
        exc_count[(r["연도"], normalize_univ(r["대학명"]))] += 1

    keys = sorted(set(sources) | set(std_count) | set(exc_count))

    header = "{:<6}{:<8}{:<10}{:<8}{:<8}  {:>6}{:>6}{:>8}".format(
        "연도", "대학", "모집요강", "성적", "합격자", "표준", "예외", "점수전무"
    )
    print(header)
    print("-" * len(header))

    missing_source = []
    unextracted = []

    for year, univ in keys:
        s = sources.get((year, univ), {})
        std = std_count[(year, univ)]
        exc = exc_count[(year, univ)]
        empty = empty_count[(year, univ)]

        marks = ["O" if kind in s else "-" for kind in KIND_ORDER]
        print("{:<6}{:<8}{:<10}{:<8}{:<8}  {:>6}{:>6}{:>8}".format(
            year, univ, marks[0], marks[1], marks[2], std, exc, empty
        ))

        # 성적 원본이 없는데 성적 레코드가 있으면 출처를 되짚을 수 없다.
        if std and "성적" not in s:
            missing_source.append(f"{year} {univ} — 레코드 {std}건인데 성적 원본 없음")
        # 모집요강이 없으면 그 연도 환산식의 근거가 없다.
        if std and "모집요강" not in s:
            missing_source.append(f"{year} {univ} — 모집요강 원본 없음 (환산식 근거 불명)")
        if "성적" in s and not std and not exc:
            unextracted.append(f"{year} {univ} — 성적 원본이 있는데 레코드 0건")

    print()
    print("표준 레코드 {}건 / 예외 레코드 {}건 / (대학,연도) {}칸".format(
        len(standard), len(exceptions), len(keys)
    ))

    print()
    print("=== 출처를 되짚을 수 없는 칸 ===")
    if missing_source:
        for line in missing_source:
            print(" -", line)
    else:
        print(" 없음")

    print()
    print("=== 원본은 있는데 추출 안 된 칸 ===")
    if unextracted:
        for line in unextracted:
            print(" -", line)
    else:
        print(" 없음")

    print()
    print("=== 점수 4필드가 전부 빈 레코드 ===")
    total_empty = sum(empty_count.values())
    if total_empty:
        for key in sorted(empty_count):
            if empty_count[key]:
                print(" - {} {} : {}건 / {}건".format(
                    key[0], key[1], empty_count[key], std_count[key]
                ))
        print(" 합계 {}건 ({:.1f}%)".format(
            total_empty, 100 * total_empty / len(standard)
        ))
    else:
        print(" 없음")

    if unmatched:
        print()
        print("=== 파일명 규약에 안 맞는 원본 ===")
        for name in unmatched:
            print(" -", name)


if __name__ == "__main__":
    main()
