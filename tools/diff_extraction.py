"""원본에서 다시 뽑은 결과와 results/ 를 전건 대조한다. 읽기 전용.

표본이 아니라 스프레드시트 10칸 전부에 대해 "원문과 같은가"를 낸다.
네 가지를 가려서 보고한다.

  A. 원본에 있는데 results 에 없다        → 누락
  B. results 에 있는데 원본에 없다        → 출처 불명
  C. 양쪽에 있는데 값이 다르다            → 불일치 (원본이 싣는 필드만)
  D. results 에 값이 있는데 원본은 그 필드를 아예 싣지 않는다 → 역산 산물

D를 C와 섞지 않는 것이 중요하다. D는 '틀렸다'가 아니라 '대학이 발표한 값이
아니다'라는 뜻이고, 대응이 다르다(표시를 고치거나 근거를 밝혀야 한다).

    python tools/diff_extraction.py
    python tools/diff_extraction.py --full   # 생략 없이 전부
"""
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract_spreadsheets import (  # noqa: E402
    EXTRACTORS,
    SOURCE_PUBLISHES,
    extract_all,
    normalize_name,
)
from extract_pdfs import SPECS as PDF_SPECS  # noqa: E402
from extract_pdfs import extract_one as extract_pdf_one  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"

# (results 필드, SOURCE_PUBLISHES 키, 표시 이름)
COMPARABLE_FIELDS = [
    ("최종합격_토익원점수", "토익원", "토익 원점수"),
    ("최종합격_토익환산점수", "토익환산", "토익 환산"),
    ("최종합격_학점원점수_100점만점", "학점원", "학점 원점수"),
    ("최종합격_학점환산점수", "학점환산", "학점 환산"),
]

COUNT_FIELDS = [("모집인원", "모집인원"), ("지원인원", "지원인원"), ("합격인원", "합격인원")]

TOLERANCE = 0.02


def load(name):
    with io.open(RESULTS_DIR / name, encoding="utf-8-sig") as f:
        return json.load(f)


def publishes_map(univ):
    """그 대학 원본이 각 필드를 싣는가.

    스프레드시트 쪽은 사람이 파일을 열어 확인한 사실(SOURCE_PUBLISHES)을 쓰고,
    PDF 쪽은 추출 사양의 raw/conv 선언에서 끌어온다. 강원대처럼 원점수와
    환산점수를 모두 싣는 곳은 '변환' 열 유무로 이미 갈라져 있다.
    """
    if univ in SOURCE_PUBLISHES:
        return SOURCE_PUBLISHES[univ]

    spec = PDF_SPECS.get(univ)
    if spec is None:
        return {}

    labels = spec["labels"]
    has_pair_english = "english_raw" in labels
    has_pair_gpa = "gpa_raw" in labels

    return {
        "토익원": has_pair_english or spec["english_is_raw"],
        "토익환산": has_pair_english or not spec["english_is_raw"],
        "학점원": has_pair_gpa or spec["gpa_is_raw"],
        "학점환산": has_pair_gpa or not spec["gpa_is_raw"],
    }


def close_enough(a, b):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) <= TOLERANCE


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    show_all = "--full" in sys.argv

    extracted = extract_all()
    covered = {(univ, year) for univ, year, _ in EXTRACTORS}

    # PDF 17칸도 같은 방식으로 합친다. 의심 행은 대조에 넣지 않고 따로 센다.
    pdf_suspects = []
    for univ, spec in PDF_SPECS.items():
        for year in spec["years"]:
            records, suspects = extract_pdf_one(univ, year, spec)
            extracted.extend(records)
            pdf_suspects.extend(suspects)
            covered.add((univ, year))

    standard = load("편입_성적_통합.json")
    exceptions = load("편입_예외학과_통합.json")

    # results 를 (대학, 연도, 정규화이름) 으로 색인한다. 예외도 함께 넣어야
    # '예외로 옮긴 것'을 누락으로 잘못 세지 않는다.
    indexed = {}
    for record in standard:
        key = (record["대학명"], record["연도"])
        if key not in covered:
            continue
        for name in (record.get("학과_원본명"), record.get("학과")):
            indexed[(key[0], key[1], normalize_name(name))] = ("표준", record)

    exception_keys = set()
    for record in exceptions:
        key = (record["대학명"], record["연도"])
        if key not in covered:
            continue
        for name in (record.get("학과_원본명"), record.get("학과")):
            exception_keys.add((key[0], key[1], normalize_name(name)))

    missing = []
    mismatched = []
    derived = defaultdict(int)
    matched = 0

    seen_keys = set()
    for row in extracted:
        key = (row["대학명"], row["연도"], row["학과_정규화"])
        seen_keys.add(key)

        if key in exception_keys:
            continue

        found = indexed.get(key)
        if found is None:
            # 원본에 성적이 전혀 없는 행(모집인원 없음 등)은 누락이라 부르지 않는다.
            has_any = any(
                row[f] is not None for f, _, _ in COMPARABLE_FIELDS
            )
            missing.append((row, has_any))
            continue

        matched += 1
        _, record = found
        publishes = publishes_map(row["대학명"])

        for field, pub_key, label in COMPARABLE_FIELDS:
            source_value = row[field]
            result_value = record.get(field)

            if publishes.get(pub_key) is not True:
                if result_value is not None:
                    derived[(row["대학명"], row["연도"], label)] += 1
                continue

            if not close_enough(source_value, result_value):
                mismatched.append((row, label, source_value, result_value))

        for field, label in COUNT_FIELDS:
            source_value = row[field]
            result_value = record.get(field)
            if source_value is None:
                continue
            if not close_enough(source_value, result_value):
                mismatched.append((row, label, source_value, result_value))

    orphans = []
    for (univ, year, name), (_, record) in indexed.items():
        if (univ, year, name) not in seen_keys:
            orphans.append((univ, year, record.get("학과")))

    def show(rows, limit=25):
        for line in rows[:None if show_all else limit]:
            print("  " + line)
        if not show_all and len(rows) > limit:
            print(f"  ... 외 {len(rows) - limit}건 (--full 로 전부)")

    print(f"=== 대조 결과: 원본 {len(extracted)}행 / 일치 확인 {matched}건 ===")
    print()

    real_missing = [m for m in missing if m[1]]
    empty_missing = [m for m in missing if not m[1]]

    print(f"[A] 원본에 성적이 있는데 results 에 없다 — {len(real_missing)}건")
    show([
        "{} {} {}".format(r["연도"], r["대학명"].replace("대학교", "대"), r["학과_원본명"])
        for r, _ in real_missing
    ])
    print()

    print(f"[A-2] 원본에 행은 있으나 성적이 비어 있어 제외된 것 — {len(empty_missing)}건")
    print()

    print(f"[B] results 에 있는데 원본에 없다 — {len(orphans)}건")
    show(["{} {} {}".format(y, u.replace("대학교", "대"), n) for u, y, n in orphans])
    print()

    print(f"[C] 값 불일치 — {len(mismatched)}건")
    show([
        "{} {} {:<24} {:<10} 원본 {} / results {}".format(
            r["연도"], r["대학명"].replace("대학교", "대"),
            r["학과_원본명"][:22], label, src, res)
        for r, label, src, res in mismatched
    ])
    print()

    print("[D] 원본이 싣지 않는데 results 에 값이 있다 (역산 산물)")
    for key in sorted(derived):
        print("  {} {} {:<12} {}건".format(
            key[1], key[0].replace("대학교", "대"), key[2], derived[key]))


if __name__ == "__main__":
    main()
