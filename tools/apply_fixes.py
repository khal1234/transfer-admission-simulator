"""원문 대조로 확정된 결함만 골라 results/ 와 web/src/data/ 에 반영한다.

**이 스크립트는 파일을 쓴다.** 다른 tools/ 도구는 전부 읽기 전용이지만 이것만
예외다. 그래서 무엇을 왜 고치는지 아래에 전부 적어두고, 고친 뒤에는 건별로
보고한다. 근거 없이 값을 만들지 않는다 — 전부 원본 파일에서 확인한 것이다.

고치는 것 (2026-07-31 확정, tools/diff_extraction.py 대조 결과)

  1. 전남대 2024 — 원본에 토익-학점이 있는데 results 가 null 인 16개 학과.
     비공개라 빈 것이 아니라 추출에서 빠졌다.
  2. 경북대 2024 — 학과명이 '2', '4' 인 오염 레코드 2건 제거하고, 그 자리에
     있어야 할 농업토목ㆍ생물산업공학부 2개 전공을 넣는다. PDF 표에서 학과명이
     셀 폭을 넘쳐 행 전체가 한 칸 밀린 것이 원인이었다.
  3. 경북대 2025 — 생물학과 1건 추가. 전형구분이 병합셀이라 비어 있는 행이
     통째로 빠져 있었다.
  4. 부경대 2025-2026 — 원본이 빈칸인데 0.0 이 들어간 점수 필드를 null 로.
     0은 '값 없음'이 아니라 '0점'으로 읽혀 평균과 비교를 오염시킨다.
  5. 충남대 2024 회화과(서양화) 예외 — 학점 원점수 177.1 을 null 로.
     백분위는 100을 넘을 수 없다. 원본은 환산점수 17.71 만 싣는다.

고치지 않는 것
  - 역산으로 채워진 원점수 709건. 값이 틀린 것이 아니라 '대학이 발표한 값이
    아닌 것'이라 대응이 다르다. 별도 판단이 필요하다.

    python tools/apply_fixes.py --dry-run   # 무엇이 바뀌는지만 본다
    python tools/apply_fixes.py             # 실제로 쓴다
"""
import io
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract_pdfs import SPECS as PDF_SPECS  # noqa: E402
from extract_pdfs import extract_one as extract_pdf_one  # noqa: E402
from extract_spreadsheets import (  # noqa: E402
    extract_all,
    normalize_name,
    validate_extracted_records,
)
from data_artifacts import (  # noqa: E402
    EXCEPTION,
    FORMULA,
    STANDARD,
    save_artifact_generation,
)

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

SCORE_FIELDS = [
    "최종합격_토익환산점수",
    "최종합격_토익원점수",
    "최종합격_학점환산점수",
    "최종합격_학점원점수_100점만점",
]


def load(path):
    with io.open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def index_extracted():
    """(대학, 연도, 정규화이름) -> 원본에서 뽑은 레코드."""
    result = extract_all()
    records = list(result.records)
    failures = [
        f"{failure.year} {failure.university} "
        f"[{failure.error_type}] {failure.message}"
        for failure in result.failures
    ]
    for univ, spec in PDF_SPECS.items():
        for year in spec["years"]:
            try:
                got, _ = extract_pdf_one(univ, year, spec)
                validate_extracted_records(univ, year, got)
            except Exception as exc:
                failures.append(
                    f"{year} {univ} [{exc.__class__.__name__}] {exc}"
                )
                continue
            records.extend(got)

    if failures:
        details = "\n".join(f" - {failure}" for failure in failures)
        raise RuntimeError(
            "원본 추출 실패가 있어 수정 결과를 저장할 수 없습니다.\n" + details
        )

    return {
        (r["대학명"], r["연도"], r["학과_정규화"]): r
        for r in records
    }


def sibling_basis(standard, univ, year):
    """같은 대학-연도의 다른 레코드에서 합격자기준을 빌린다."""
    for record in standard:
        if record["대학명"] == univ and record["연도"] == year:
            return record.get("합격자기준", "확인불가")
    return "확인불가"


def round2(value):
    """원본 엑셀에는 47.90999999999999 같은 잡음이 있다. results 관례대로 자른다."""
    return None if value is None else round(float(value), 2)


def build_record(source, standard, canonical_name=None):
    """추출 레코드를 results 스키마로 옮긴다."""
    univ, year = source["대학명"], source["연도"]
    return {
        "대학명": univ,
        "연도": year,
        "모집인원": source["모집인원"],
        "지원인원": source["지원인원"],
        "합격인원": source["합격인원"],
        "최종합격_토익환산점수": round2(source["최종합격_토익환산점수"]),
        "최종합격_토익원점수": round2(source["최종합격_토익원점수"]),
        "최종합격_학점환산점수": round2(source["최종합격_학점환산점수"]),
        "최종합격_학점원점수_100점만점": round2(
            source["최종합격_학점원점수_100점만점"]),
        "학과": canonical_name or source["학과_원본명"],
        "학과_원본명": source["학과_원본명"],
        "합격자기준": sibling_basis(standard, univ, year),
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    dry_run = "--dry-run" in sys.argv

    standard = load(RESULTS_DIR / STANDARD)
    exceptions = load(RESULTS_DIR / EXCEPTION)
    formulas = load(RESULTS_DIR / FORMULA)
    try:
        extracted = index_extracted()
    except RuntimeError as exc:
        print(f"!! {exc}", file=sys.stderr)
        print("!! dry-run과 실제 쓰기 모두 중단했습니다.", file=sys.stderr)
        return 1

    changes = []

    # ── 1. 전남대 2024 성적 유실 복원 ─────────────────────────
    for record in standard:
        if record["대학명"] != "전남대학교" or record["연도"] != "2024":
            continue

        key = None
        for name in (record.get("학과_원본명"), record.get("학과")):
            candidate = (record["대학명"], record["연도"], normalize_name(name))
            if candidate in extracted:
                key = candidate
                break
        if key is None:
            continue

        source = extracted[key]
        for field in ("최종합격_토익원점수", "최종합격_학점원점수_100점만점"):
            if record.get(field) is None and source.get(field) is not None:
                changes.append(
                    f"[1] 전남대 2024 {record['학과']} · {field} "
                    f"null → {source[field]}"
                )
                record[field] = source[field]

    # ── 2. 경북대 2024 오염 레코드 교체 ───────────────────────
    bogus = [r for r in standard
             if r["대학명"] == "경북대학교" and r["연도"] == "2024"
             and str(r["학과"]).strip().isdigit()]
    for record in bogus:
        changes.append(f"[2] 경북대 2024 학과명 '{record['학과']}' 오염 레코드 제거")
        standard.remove(record)

    # 이 두 건은 자동 추출로 그대로 가져올 수 없다.
    #   - 농업토목공학전공: PDF에서 학과명이 셀 폭을 넘쳐 닫는 괄호가 잘렸다.
    #   - 생물산업기계공학전공: '전공'의 '공'이 모집인원 칸으로 넘쳐, 추출기가
    #     의심 행으로 격리한다(자동 교정을 하지 않는 설계라 당연한 결과다).
    # 그래서 값을 24_경북대_성적.pdf 3쪽에서 직접 읽어 명시한다. 원문 그대로다.
    #   r4: 모집 2 지원 13 입학 2 | 공인영어 72.22 전적대 47.01 면접 62.5 총점 181.73
    #   r5: 모집 4 지원 11 입학 3 | 공인영어 52.36 전적대 47.6  면접 82.67 총점 182.62
    KNU_2024_RESTORED = [
        {
            "학과": "농업토목ㆍ생물산업공학부(농업토목공학전공)",
            "모집인원": 2, "지원인원": 13, "합격인원": 2,
            "최종합격_토익환산점수": 72.22,
            "최종합격_학점환산점수": 47.01,
        },
        {
            "학과": "농업토목ㆍ생물산업공학부(생물산업기계공학전공)",
            "모집인원": 4, "지원인원": 11, "합격인원": 3,
            "최종합격_토익환산점수": 52.36,
            "최종합격_학점환산점수": 47.6,
        },
    ]

    for entry in KNU_2024_RESTORED:
        already = any(
            r["대학명"] == "경북대학교" and r["연도"] == "2024"
            and normalize_name(r["학과"]) == normalize_name(entry["학과"])
            for r in standard
        )
        if already:
            continue

        standard.append({
            "대학명": "경북대학교",
            "연도": "2024",
            "모집인원": entry["모집인원"],
            "지원인원": entry["지원인원"],
            "합격인원": entry["합격인원"],
            "최종합격_토익환산점수": entry["최종합격_토익환산점수"],
            "최종합격_토익원점수": None,
            "최종합격_학점환산점수": entry["최종합격_학점환산점수"],
            "최종합격_학점원점수_100점만점": None,
            "학과": entry["학과"],
            "학과_원본명": entry["학과"],
            "합격자기준": sibling_basis(standard, "경북대학교", "2024"),
        })
        changes.append(
            f"[2] 경북대 2024 {entry['학과']} 복원 "
            f"(영어환산 {entry['최종합격_토익환산점수']}, "
            f"학점환산 {entry['최종합격_학점환산점수']}) — 원본 3쪽"
        )

    # ── 3. 경북대 2025 생물학과 추가 ──────────────────────────
    key = ("경북대학교", "2025", normalize_name("생물학과"))
    source = extracted.get(key)
    already = any(r["대학명"] == "경북대학교" and r["연도"] == "2025"
                  and normalize_name(r["학과"]) == normalize_name("생물학과")
                  for r in standard)
    if source is not None and not already:
        new_record = build_record(source, standard)
        standard.append(new_record)
        changes.append(
            f"[3] 경북대 2025 생물학과 추가 "
            f"(영어환산 {new_record['최종합격_토익환산점수']}, "
            f"학점환산 {new_record['최종합격_학점환산점수']})"
        )

    # ── 4. 부경대 0.0 채움 정리 ───────────────────────────────
    for collection in (standard, exceptions):
        for record in collection:
            if record["대학명"] != "부경대학교":
                continue
            for field in SCORE_FIELDS:
                if record.get(field) == 0:
                    changes.append(
                        f"[4] 부경대 {record['연도']} {record['학과']} · {field} 0.0 → null"
                    )
                    record[field] = None

    # ── 5. 충남대 회화과(서양화) 범위 밖 학점 ─────────────────
    # 백분위가 100을 넘는 학점 원점수는 예외 없이 틀렸다. 충남대 예체능-특수
    # 배점 학과는 전적대 배점이 20점인데, 표준 계수 0.1로 나눠 역산한 탓에
    # 값이 두 배가 됐다(18.75 → 187.5). 원본은 환산점수만 싣고 백분위를 싣지
    # 않으므로, 다시 계산해 넣지 않고 null 로 둔다.
    for record in standard + exceptions:
        gpa_raw = record.get("최종합격_학점원점수_100점만점")
        if gpa_raw is not None and gpa_raw > 100:
            changes.append(
                f"[5] {record['연도']} {record['대학명']} {record['학과']} · "
                f"학점 원점수 {gpa_raw} → null (백분위는 100 초과 불가)"
            )
            record["최종합격_학점원점수_100점만점"] = None

    # ── 6. 환산공식 JSON — 강원대 2026 ────────────────────────
    for record in formulas:
        if record["대학명"] != "강원대학교" or record["연도"] != "2026":
            continue
        english = record["공인영어_환산공식"]
        gpa = record["전적대성적_환산공식"]

        if english.get("배점") != 150:
            changes.append(
                f"[6] 환산공식 강원대 2026 공인영어 배점 {english.get('배점')} → 150"
            )
            english["배점"] = 150
            english["수식원문"] = "공인영어성적 = TOEIC 점수 / 990 * 150"
        if gpa.get("공식유형") is not None:
            changes.append("[6] 환산공식 강원대 2026 전적대성적 반영 → 미반영")
            gpa["공식유형"] = None
            gpa["수식원문"] = "2026학년도 미반영 (면접고사로 대체)"
            gpa["기본점수"] = None
            gpa["비례계수"] = None
            gpa["학점기준설명"] = "미반영"
        if record["배점"].get("전적대성적") is not None:
            record["배점"] = {"공인영어": 150, "면접구술": 100, "전적대성적": None}
            record["비고"] = (
                "26_강원대_모집요강.pdf 13쪽 전형요소별 배점표: "
                "일반/학사 전체 모집단위 공인영어 150점(60%) + 면접 100점(40%) = 250점, "
                "전적대학성적 미반영. " + str(record.get("비고", ""))
            ).strip()
            changes.append("[6] 환산공식 강원대 2026 배점 수정 (영어 150 / 면접 100 / 전적대 미반영)")

    # ── 보고와 저장 ───────────────────────────────────────────
    print(f"=== 수정 {len(changes)}건 ===")
    for line in changes:
        print(" -", line)

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

    print(f"\nresults/ 와 web/src/data/ 양쪽에 반영했다.")
    print(f"표준 {len(standard)}건 / 예외 {len(exceptions)}건 / 공식 {len(formulas)}건")
    for name, result in parity.items():
        print(
            f"{name}: JSON {result.json_rows}행 / CSV {result.csv_rows}행 / "
            f"JSON-only {result.json_only} / CSV-only {result.csv_only} / "
            f"값 차이 {result.value_mismatches} / 키 중복 {result.duplicate_keys}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
