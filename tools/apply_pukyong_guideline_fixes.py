"""부경대 2024~2026 모집요강·입시결과 4차 최종 검증 결과를 반영한다.

근거 문서(부경대학교 입학처 공식 첨부):
  - 2024 모집요강 PDF 11·30·31쪽, 입학전형결과 XLSX 지원현황 A77:H80
  - 2025 모집요강 PDF 10·29·30쪽
  - 2026 모집요강 PDF 10·29·31쪽

전적대 성적은 원 백분위가 아니라 ``60 + 0.4 × 백분위``로 환산한다. 공식
결과 파일은 이 환산점수를 공개하므로 저장 원점수는 역산한다. 면접 실시,
면접 미실시, 실기, 미래융합대학 프로필을 코드에서 지원하므로 기존 예외 행을
복원하고, 2024 지원현황에만 있던 미래융합대학 4개 모집단위도 추가한다.
공식 지원현황 236행과 평균성적표 232행을 전수 대조한 공개 필드 수도
검증해, 추후 재수집이나 수동 편집으로 인한 누락을 차단한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

SOURCE_PAGES = {
    "2024": "11·30·31",
    "2025": "10·29·30",
    "2026": "10·29·31",
}

FUTURE_2024 = {
    "평생교육·상담학전공": (10, 25),
    "경찰범죄심리학전공": (4, 8),
    "스마트기계모빌리티전공": (2, 8),
    "스마트전기전자공학전공": (3, 9),
}

EXPECTED_PUBLIC_COUNTS = {
    "2024": {
        "모집인원": 77,
        "지원인원": 77,
        "합격인원": 73,
        "최종합격_토익환산점수": 60,
        "최종합격_토익원점수": 60,
        "최종합격_학점환산점수": 60,
        "최종합격_학점원점수_100점만점": 60,
    },
    "2025": {
        "모집인원": 77,
        "지원인원": 77,
        "합격인원": 77,
        "최종합격_토익환산점수": 65,
        "최종합격_토익원점수": 65,
        "최종합격_학점환산점수": 69,
        "최종합격_학점원점수_100점만점": 69,
    },
    "2026": {
        "모집인원": 82,
        "지원인원": 82,
        "합격인원": 82,
        "최종합격_토익환산점수": 65,
        "최종합격_토익원점수": 65,
        "최종합격_학점환산점수": 66,
        "최종합격_학점원점수_100점만점": 66,
    },
}

EXPECTED_CRITERIA = {
    "2024": {"최종": 73, "확인불가": 4},
    "2025": {"최종": 77},
    "2026": {"최종": 82},
}


def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_pukyong(record: dict) -> bool:
    return record.get("대학명") == "부경대학교"


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    for record in formulas:
        if not is_pukyong(record):
            continue
        year = record["연도"]
        pages = SOURCE_PAGES[year]
        expected = {
            "전형구분": "면접 실시 모집단위(대표 프로필)",
            "총점": 500,
            "배점": {
                "공인영어": 200,
                "면접구술": 200,
                "전적대성적": 100,
            },
            "공인영어_환산공식": {
                "공식유형": "비례식(소수점 다섯째 자리 절사)",
                "수식원문": "영어변환성적점수 = TOEIC 점수 / 990 × 200",
                "배점": 200,
                "만점기준": 990,
            },
            "전적대성적_환산공식": {
                "공식유형": "기본점수 포함 선형식(소수점 다섯째 자리 절사)",
                "수식원문": "전적대학성적점수 = 60 + 0.4 × 백분위",
                "기본점수": 60,
                "비례계수": 40,
                "학점기준설명": "공식 결과의 전적대학성적점수는 환산점수이며 원 백분위는 (환산점수-60)÷0.4로 역산",
            },
            "비고": (
                f"출처: {year}학년도 모집요강 PDF {pages}쪽. 면접 실시 모집단위는 "
                "영어200+GPA100+면접200=500, 면접 미실시는 영어200+GPA100=300, "
                "해양스포츠·시각디자인·공업디자인은 영어100+GPA100+실기200=400, "
                "미래융합대학은 GPA100=100이다. 패션디자인학과는 실기형이 아니라 "
                "면접 미실시형이다. 모든 환산점수는 소수점 다섯째 자리에서 절사한다."
            ),
        }
        for field, value in expected.items():
            if record.get(field) == value:
                continue
            record[field] = value
            changes.append(f"환산공식 {year} {field} 정정")


def fix_gpa_reverse_calculations(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    corrected = 0
    for record in [*standard, *exceptions]:
        if not is_pukyong(record):
            continue
        converted = record.get("최종합격_학점환산점수")
        if converted is None:
            continue
        expected = round((converted - 60) / 0.4, 3)
        current = record.get("최종합격_학점원점수_100점만점")
        if current != expected:
            record["최종합격_학점원점수_100점만점"] = expected
            changes.append(
                f"{record['연도']} {record['학과']} GPA 백분위 {current} → {expected}"
            )
        corrected += 1
    if corrected != 195:
        raise RuntimeError(f"부경대 GPA 역산 대상은 195행이어야 함: {corrected}")


def add_2024_future_convergence(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in [*standard, *exceptions]}
    new_rows: list[dict] = []
    for department, (recruited, applied) in FUTURE_2024.items():
        key = ("부경대학교", "2024", department)
        if key in existing:
            continue
        new_rows.append({
            "대학명": "부경대학교",
            "연도": "2024",
            "모집인원": recruited,
            "지원인원": applied,
            "합격인원": None,
            "최종합격_토익환산점수": None,
            "최종합격_토익원점수": None,
            "최종합격_학점환산점수": None,
            "최종합격_학점원점수_100점만점": None,
            "학과": department,
            "학과_원본명": department,
            "합격자기준": "확인불가",
        })
        changes.append(f"2024 {department} 공식 지원현황 행 추가")

    if new_rows:
        insertion_index = max(
            index
            for index, record in enumerate(standard)
            if is_pukyong(record) and record["연도"] == "2024"
        ) + 1
        standard[insertion_index:insertion_index] = new_rows


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining: list[dict] = []

    for record in exceptions:
        if not is_pukyong(record):
            remaining.append(record)
            continue
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"부경대 복원 중 키 중복: {key}")
        record.pop("제거사유", None)
        moved_by_year[record["연도"]].append(record)
        existing.add(key)
        changes.append(f"{record['연도']} {record['학과']} 예외 → 학과별 공식 지원")

    exceptions[:] = remaining
    for year in ("2024", "2025", "2026"):
        rows = moved_by_year[year]
        if not rows:
            continue
        insertion_index = max(
            index
            for index, record in enumerate(standard)
            if is_pukyong(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def validate(standard: list[dict], exceptions: list[dict]) -> None:
    by_year = {
        year: sum(is_pukyong(record) and record["연도"] == year for record in standard)
        for year in ("2024", "2025", "2026")
    }
    if by_year != {"2024": 77, "2025": 77, "2026": 82}:
        raise RuntimeError(f"부경대 지원 데이터 연도별 건수 불일치: {by_year}")
    if any(is_pukyong(record) for record in exceptions):
        raise RuntimeError("공식 지원이 끝난 부경대 예외 행이 남음")

    rows = [record for record in standard if is_pukyong(record)]
    converted_rows = [
        record for record in rows if record.get("최종합격_학점환산점수") is not None
    ]
    if len(converted_rows) != 195:
        raise RuntimeError(f"부경대 GPA 공식 결과 행은 195개여야 함: {len(converted_rows)}")
    for record in converted_rows:
        converted = record["최종합격_학점환산점수"]
        expected = round((converted - 60) / 0.4, 3)
        if record.get("최종합격_학점원점수_100점만점") != expected:
            raise RuntimeError(f"부경대 GPA 역산 검증 실패: {record_key(record)}")

    for year, expected_counts in EXPECTED_PUBLIC_COUNTS.items():
        year_rows = [record for record in rows if record["연도"] == year]
        actual_counts = {
            field: sum(record.get(field) is not None for record in year_rows)
            for field in expected_counts
        }
        if actual_counts != expected_counts:
            raise RuntimeError(
                f"부경대 {year} 공식 공개 필드 수 불일치: {actual_counts}"
            )

        actual_criteria: dict[str, int] = {}
        for record in year_rows:
            criterion = record.get("합격자기준")
            actual_criteria[criterion] = actual_criteria.get(criterion, 0) + 1
        if actual_criteria != EXPECTED_CRITERIA[year]:
            raise RuntimeError(
                f"부경대 {year} 합격자 기준 불일치: {actual_criteria}"
            )


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    fix_formula_records(formulas, changes)
    fix_gpa_reverse_calculations(standard, exceptions, changes)
    add_2024_future_convergence(standard, exceptions, changes)
    restore_supported_departments(standard, exceptions, changes)
    validate(standard, exceptions)

    print(f"=== 부경대 모집요강·입시결과 확정 수정 {len(changes)}건 ===")
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
