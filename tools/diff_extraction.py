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
    SOURCE_PUBLISHES,
    extract_all,
    normalize_name,
    validate_extracted_records,
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

# 원본 표기와 results 표기가 다른 곳. 값이 다른 것이 아니라 이름만 다르다.
# 확인한 것만 적는다 — 비슷해 보인다고 넣으면 서로 다른 학과를 묶게 된다.
NAME_ALIASES = {
    # PDF에서 학과명이 셀 폭을 넘쳐 닫는 괄호가 잘렸다.
    ("경북대학교", "농업토목ㆍ생물산업공학부(농업토목공학전공"):
        "농업토목ㆍ생물산업공학부(농업토목공학전공)",
}

# 원본에는 있으나 추출기가 의심 행으로 격리해 대조에 오르지 않는 레코드.
# 값은 원문을 직접 읽어 반영했다(tools/apply_fixes.py 의 KNU_2024_RESTORED).
# 고아로 잡히면 매번 가짜 신호가 되므로 여기서 제외한다.
KNOWN_UNEXTRACTED = {
    ("경북대학교", "2024", "농업토목ㆍ생물산업공학부(생물산업기계공학전공)"),
}


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

    spreadsheet_result = extract_all()
    extracted = list(spreadsheet_result.records)
    covered = set(spreadsheet_result.covered)
    failures = [
        f"{failure.year} {failure.university} "
        f"[{failure.error_type}] {failure.message}"
        for failure in spreadsheet_result.failures
    ]

    # PDF 17칸도 같은 방식으로 합친다. 의심 행은 대조에 넣지 않고 따로 센다.
    pdf_suspects = []
    for univ, spec in PDF_SPECS.items():
        for year in spec["years"]:
            try:
                records, suspects = extract_pdf_one(univ, year, spec)
                validate_extracted_records(univ, year, records)
            except Exception as exc:
                failures.append(
                    f"{year} {univ} [{exc.__class__.__name__}] {exc}"
                )
                continue
            extracted.extend(records)
            pdf_suspects.extend(suspects)
            covered.add((univ, year))

    standard = load("편입_성적_통합.json")
    exceptions = load("편입_예외학과_통합.json")

    # results 를 (대학, 연도, 정규화이름) 으로 색인한다. 표준과 예외 모두
    # 실제 값까지 같은 방식으로 대조한다.
    # 한 레코드가 '학과'와 '학과_원본명' 두 이름으로 색인된다(원본은 당시명을,
    # results 는 현재명을 쓰는 경우가 많다 — 강원대 2024는 77건 중 40건이 다르다).
    # 고아 판정을 키 단위로 하면 현재명 키가 항상 고아로 잡히므로 레코드 단위로 센다.
    indexed = {}
    record_ids = {}
    for category, collection in (("표준", standard), ("예외", exceptions)):
        for position, record in enumerate(collection):
            key = (record["대학명"], record["연도"])
            if key not in covered:
                continue
            identity = (category, position)
            record_ids[identity] = record
            for name in (record.get("학과_원본명"), record.get("학과")):
                lookup_key = (key[0], key[1], normalize_name(name))
                existing = indexed.get(lookup_key)
                if existing is not None and existing[:2] != identity:
                    failures.append(
                        f"results 키 중복 [{lookup_key[0]} {lookup_key[1]} {lookup_key[2]}]"
                    )
                indexed[lookup_key] = (category, position, record)

    missing = []
    mismatched = []
    derived = defaultdict(int)
    matched = 0
    matched_by_category = defaultdict(int)
    matched_positions = set()

    seen_keys = set()
    for row in extracted:
        alias = NAME_ALIASES.get((row["대학명"], row["학과_원본명"].strip()))
        lookup_name = normalize_name(alias) if alias else row["학과_정규화"]

        key = (row["대학명"], row["연도"], lookup_name)
        seen_keys.add(key)
        seen_keys.add((row["대학명"], row["연도"], row["학과_정규화"]))

        found = indexed.get(key)
        if found is None:
            # 원본에 성적이 전혀 없는 행(모집인원 없음 등)은 누락이라 부르지 않는다.
            has_any = any(
                row[f] is not None for f, _, _ in COMPARABLE_FIELDS
            )
            missing.append((row, has_any))
            continue

        matched += 1
        category, position, record = found
        matched_by_category[category] += 1
        matched_positions.add((category, position))
        publishes = publishes_map(row["대학명"])

        for field, pub_key, label in COMPARABLE_FIELDS:
            source_value = row[field]
            result_value = record.get(field)

            if publishes.get(pub_key) is not True:
                if result_value is not None:
                    derived[(row["대학명"], row["연도"], label)] += 1
                continue

            if not close_enough(source_value, result_value):
                mismatched.append((category, row, label, source_value, result_value))

        for field, label in COUNT_FIELDS:
            source_value = row[field]
            result_value = record.get(field)
            if source_value is None:
                continue
            if not close_enough(source_value, result_value):
                mismatched.append((category, row, label, source_value, result_value))

    orphans = []
    for identity, record in sorted(record_ids.items()):
        if identity in matched_positions:
            continue
        known = (record["대학명"], record["연도"], record.get("학과"))
        if known in KNOWN_UNEXTRACTED:
            continue
        orphans.append((identity[0], *known))

    def show(rows, limit=25):
        for line in rows[:None if show_all else limit]:
            print("  " + line)
        if not show_all and len(rows) > limit:
            print(f"  ... 외 {len(rows) - limit}건 (--full 로 전부)")

    print(f"=== 대조 결과: 원본 {len(extracted)}행 / 일치 확인 {matched}건 ===")
    print(
        f"    표준 {matched_by_category['표준']}건 / "
        f"예외 {matched_by_category['예외']}건을 인원·점수까지 비교"
    )
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
    show([
        "[{}] {} {} {}".format(category, y, u.replace("대학교", "대"), n)
        for category, u, y, n in orphans
    ])
    print()

    print(f"[C] 값 불일치 — {len(mismatched)}건")
    show([
        "{} {} {:<24} {:<10} 원본 {} / results {}".format(
            r["연도"], f"[{category}] {r['대학명'].replace('대학교', '대')}",
            r["학과_원본명"][:22], label, src, res)
        for category, r, label, src, res in mismatched
    ])
    print()

    print("[D] 원본이 싣지 않는데 results 에 값이 있다 (역산 산물)")
    for key in sorted(derived):
        print("  {} {} {:<12} {}건".format(
            key[1], key[0].replace("대학교", "대"), key[2], derived[key]))

    print()
    print(f"[PDF 의심 행] {len(pdf_suspects)}건")
    for item in pdf_suspects[:None if show_all else 25]:
        if isinstance(item, str):
            print("  " + item)
        else:
            year, univ, cells = item
            print(f"  {year} {univ}: " + " | ".join(str(cell) for cell in cells))
    if not show_all and len(pdf_suspects) > 25:
        print(f"  ... 외 {len(pdf_suspects) - 25}건 (--full 로 전부)")

    print()
    print(f"[추출 실패] {len(failures)}건")
    for failure in failures:
        print("  " + failure)

    comparison_issues = len(real_missing) + len(orphans) + len(mismatched)
    if failures or pdf_suspects:
        print("\n!! 추출 실패 또는 PDF 의심 행이 있어 결과를 신뢰할 수 없습니다.")
        print("!! 실패한 대학·연도는 covered에서 제외했으며 고아 판정을 하지 않았습니다.")
        return 1
    if comparison_issues:
        print(f"\n!! 대조 차이 {comparison_issues}건 — 확인이 필요합니다.")
        return 1
    print("\n원본↔results 대조가 모두 일치합니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
