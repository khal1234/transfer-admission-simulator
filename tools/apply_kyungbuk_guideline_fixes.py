"""경북대 2024~2026 편입학 학과별 배점과 TOEIC 역산 오류를 반영한다.

근거 문서(경북대학교 입학처 공식 일반편입 모집요강):
  - 2024: PDF 16~17쪽(책자 15~16쪽)
  - 2025: PDF 16~17쪽(책자 15~16쪽)
  - 2026: PDF 17~18쪽(책자 16~17쪽)

일반학과는 영어100+전적대50+면접100, 예능계는
영어50+전적대50+면접50+실기100, 체능계는
영어50+전적대50+면접100+실기50이다. 학과별 공식이 코드에서 지원되므로
기존 예외 행을 지원 데이터로 복원하고, 50점 배점을 100점으로 잘못 역산한
TOEIC 원점수 8건을 정정한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

SOURCE_PAGES = {
    "2024": "PDF 16~17쪽(책자 15~16쪽)",
    "2025": "PDF 16~17쪽(책자 15~16쪽)",
    "2026": "PDF 17~18쪽(책자 16~17쪽)",
}

ARTS_DEPARTMENTS = {
    "디자인학과",
    "미술학과",
    "성악전공",
    "작곡전공",
    "한국화전공",
    "서양화전공",
    "조소전공",
}

EXPECTED_TOEIC_CORRECTIONS = {
    ("2024", "디자인학과"): 732.40,
    ("2024", "체육학부(체육학전공)"): 330.07,
    ("2025", "체육교육과"): 842.49,
    ("2025", "디자인학과"): 558.76,
    ("2025", "체육학부(체육학전공)"): 256.61,
    ("2026", "체육교육과"): 792.59,
    ("2026", "체육학부(건강운동관리전공)"): 432.63,
    ("2026", "디자인학과"): 811.80,
}


def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_kyungbuk(record: dict) -> bool:
    return record.get("대학명") == "경북대학교"


def normalize_department(department: str) -> str:
    return "".join(department.split())


def is_arts_department(department: str) -> bool:
    normalized = normalize_department(department)
    return (
        normalized in ARTS_DEPARTMENTS
        or normalized.startswith("기악전공")
        or normalized.startswith("음악학과")
        or normalized.startswith("미술학과(")
    )


def is_sports_department(department: str) -> bool:
    normalized = normalize_department(department)
    return (
        normalized in {"체육교육과", "체육학과"}
        or normalized.startswith("체육학부(")
    )


def is_special_department(department: str) -> bool:
    return is_arts_department(department) or is_sports_department(department)


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining_exceptions: list[dict] = []

    for record in exceptions:
        if not is_kyungbuk(record):
            remaining_exceptions.append(record)
            continue
        if not is_special_department(record["학과"]):
            raise RuntimeError(f"지원 프로필이 없는 경북대 예외 행: {record_key(record)}")

        record.pop("제거사유", None)
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"경북대 복원 중 키 중복: {key}")
        moved_by_year[record["연도"]].append(record)
        existing.add(key)
        changes.append(f"{record['연도']} {record['학과']} 예외 → 지원 데이터")

    exceptions[:] = remaining_exceptions

    for year in ("2024", "2025", "2026"):
        rows = moved_by_year[year]
        if not rows:
            continue
        insertion_index = max(
            index
            for index, record in enumerate(standard)
            if is_kyungbuk(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def fix_toeic_reverse_calculations(
    standard: list[dict], changes: list[str]
) -> None:
    for record in standard:
        if not is_kyungbuk(record) or not is_special_department(record["학과"]):
            continue
        converted = record.get("최종합격_토익환산점수")
        if converted is None:
            continue

        expected = round(converted * 990 / 50, 2)
        key = (record["연도"], record["학과"])
        documented = EXPECTED_TOEIC_CORRECTIONS.get(key)
        if documented is None or expected != documented:
            raise RuntimeError(f"검증보고서의 경북대 TOEIC 정정값과 불일치: {key} {expected}")

        current = record.get("최종합격_토익원점수")
        if current != expected:
            record["최종합격_토익원점수"] = expected
            changes.append(f"{record['연도']} {record['학과']} TOEIC {current} → {expected}")


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    gpa_description = (
        "전적대 1곳은 100점 만점 평균점수를 사용. 전적대 2곳 이상은 "
        "Σ(대학별 이수학점×대학별 성적) ÷ Σ(이수학점)으로 가중평균한 뒤 "
        "30 + 20 × 가중평균 ÷ 100으로 산출"
    )
    for record in formulas:
        if not is_kyungbuk(record):
            continue
        year = record["연도"]
        note = (
            f"출처: {year}학년도 모집요강 {SOURCE_PAGES[year]}. "
            "일반학과는 공인영어100+전적대50+면접100, 예능계는 "
            "공인영어50+전적대50+면접50+실기100, 체능계는 "
            "공인영어50+전적대50+면접100+실기50이다. 공인영어는 "
            "배점×TOEIC÷990, 전적대성적은 계열과 관계없이 30+20×백분위÷100이다."
        )
        gpa = record["전적대성적_환산공식"]
        if gpa.get("학점기준설명") != gpa_description:
            gpa["학점기준설명"] = gpa_description
            changes.append(f"{year} 복수 전적대 이수학점 가중평균 설명 추가")
        if record.get("비고") != note:
            record["비고"] = note
            changes.append(f"{year} 일반·예능·체능 배점 근거 추가")


def validate(standard: list[dict], exceptions: list[dict]) -> None:
    kyungbuk_standard = [record for record in standard if is_kyungbuk(record)]
    kyungbuk_exceptions = [record for record in exceptions if is_kyungbuk(record)]
    if len(kyungbuk_standard) != 254:
        raise RuntimeError(f"경북대 지원 데이터는 254행이어야 함: {len(kyungbuk_standard)}")
    if kyungbuk_exceptions:
        raise RuntimeError(f"공식 지원이 끝난 경북대 예외 행이 남음: {len(kyungbuk_exceptions)}")

    by_key = {(record["연도"], record["학과"]): record for record in kyungbuk_standard}
    for key, expected in EXPECTED_TOEIC_CORRECTIONS.items():
        actual = by_key.get(key, {}).get("최종합격_토익원점수")
        if actual != expected:
            raise RuntimeError(f"경북대 TOEIC 정정값 검증 실패: {key} {actual} != {expected}")


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    restore_supported_departments(standard, exceptions, changes)
    fix_toeic_reverse_calculations(standard, changes)
    fix_formula_records(formulas, changes)
    validate(standard, exceptions)

    print(f"=== 경북대 모집요강 학과별 공식 반영 {len(changes)}건 ===")
    for change in changes:
        print(" -", change)
    if not changes:
        print("변경할 내용이 없습니다.")
        return 0

    parity = save_artifact_generation(
        RESULTS_DIR,
        WEB_DATA_DIR,
        {STANDARD: standard, EXCEPTION: exceptions, FORMULA: formulas},
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
