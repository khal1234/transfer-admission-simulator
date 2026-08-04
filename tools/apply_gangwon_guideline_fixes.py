"""강원대 2024~2026 모집요강·입시결과 3차 검증 결과를 반영한다.

근거 문서(강원대학교 입학처 공식 첨부, 춘천캠퍼스):
  - 2024 모집요강 PDF 13·18·19쪽, 입시결과 PDF 1~2쪽
  - 2025 모집요강 PDF 13·14쪽, 입시결과 PDF 1~3쪽
  - 2026 모집요강 PDF 13·14·15쪽, 입시결과 PDF 1~3쪽

학과별 프로필을 계산 코드에서 지원하므로 기존 예외 22행을 복원한다. 3차에서
새로 확인된 2026 면접·실기 점수의 GPA 필드 오배치 7개, 건축학과 원문명 3개,
2026의 노후화된 추정식 비고도 함께 정정한다. 복수 전적대 계산은 이번 범위에서
지원하지 않는다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

SOURCE_PAGES = {
    "2024": "13·18·19",
    "2025": "13·14",
    "2026": "13·14·15",
}

MISPLACED_2026 = {
    "디자인학과": {
        "최종합격_학점원점수_100점만점": 88.89,
        "최종합격_학점환산점수": 134.11,
        "비고": "공식 입시결과: 면접 88.89점, 실기 134.11점(전적대 성적 아님)",
    },
    "무용학과": {
        "최종합격_학점원점수_100점만점": 79.59,
        "최종합격_학점환산점수": 141.0,
        "비고": "공식 입시결과: 면접 79.59점, 실기 141.00점(전적대 성적 아님)",
    },
    "스포츠과학과": {
        "최종합격_학점원점수_100점만점": 94.0,
        "최종합격_학점환산점수": 131.33,
        "비고": "공식 입시결과: 면접 94.00점, 실기 131.33점(전적대 성적 아님)",
    },
    "수의학과": {
        "최종합격_학점원점수_100점만점": 84.39,
        "비고": "공식 입시결과: 면접 84.39점(전적대 성적 아님)",
    },
}


def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_gangwon(record: dict) -> bool:
    return record.get("대학명") == "강원대학교"


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    for record in formulas:
        if not is_gangwon(record):
            continue
        year = record["연도"]
        pages = SOURCE_PAGES[year]
        if year == "2026":
            english_weight = 150
            gpa_weight = None
            interview_weight = 100
            gpa_formula = {
                "공식유형": None,
                "수식원문": "일반 모집단위는 전적대학성적 미반영",
                "기본점수": None,
                "비례계수": None,
                "학점기준설명": "일반 모집단위 미반영",
            }
            standard = "일반 모집단위는 영어150+면접100=250"
        else:
            english_weight = 100
            gpa_weight = 75
            interview_weight = 75
            gpa_formula = {
                "공식유형": "비례식",
                "수식원문": "전적대학성적 = 100점 만점 평균점수 × 75 ÷ 100",
                "기본점수": None,
                "비례계수": 75,
                "학점기준설명": "백분율 × 0.75",
            }
            standard = "일반 모집단위는 영어100+GPA75+면접75=250"

        expected = {
            "전형구분": "일반 모집단위(대표 프로필)",
            "총점": 250,
            "배점": {
                "공인영어": english_weight,
                "면접구술": interview_weight,
                "전적대성적": gpa_weight,
            },
            "공인영어_환산공식": {
                "공식유형": "비례식",
                "수식원문": f"공인영어성적 = TOEIC 점수 ÷ 990 × {english_weight}",
                "배점": english_weight,
                "만점기준": 990,
            },
            "전적대성적_환산공식": gpa_formula,
            "비고": (
                f"출처: {year}학년도 모집요강 PDF {pages}쪽. {standard}. "
                "간호학과는 영어75+GPA75 뒤 면접100, 수의학과·약학과는 단계별 "
                "영어·필기 배점을 적용한다. 미술·디자인·음악·무용·스포츠과학은 "
                "실기150+면접100, 체육교육과는 영어50+실기100+면접100이다. "
                "2024 시설농업 및 2025~2026 스마트팜은 GPA150+면접100이고, "
                "2026 생태조경디자인은 영어100+GPA50+면접100이다."
            ),
        }
        for field, value in expected.items():
            if record.get(field) == value:
                continue
            record[field] = value
            changes.append(f"환산공식 {year} {field} 정정")


def fix_misplaced_2026_scores(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    records = {
        record["학과"]: record
        for record in [*standard, *exceptions]
        if is_gangwon(record) and record["연도"] == "2026"
    }
    for department, fields in MISPLACED_2026.items():
        record = records.get(department)
        if record is None:
            raise RuntimeError(f"강원대 2026 오배치 정정 대상 누락: {department}")
        note = fields["비고"]
        for field, previous in fields.items():
            if field == "비고":
                continue
            current = record.get(field)
            if current not in {previous, None}:
                raise RuntimeError(
                    f"강원대 2026 {department} {field} 예상 밖 값: {current}"
                )
            if current is not None:
                record[field] = None
                changes.append(f"2026 {department} {field} {current} → null")
        if record.get("비고") != note:
            record["비고"] = note
            changes.append(f"2026 {department} 면접·실기 원문값 비고 보존")


def fix_department_names(standard: list[dict], changes: list[str]) -> None:
    found_years: set[str] = set()
    for record in standard:
        if not is_gangwon(record) or record["학과"] != "건축학과(오년제)":
            continue
        year = record["연도"]
        record["학과"] = "건축학과(5년제)"
        record["학과_원본명"] = "건축학과(5년제)"
        found_years.add(year)
        changes.append(f"{year} 건축학과 원문명 오년제 → 5년제")

    existing = {
        record["연도"]
        for record in standard
        if is_gangwon(record) and record["학과"] == "건축학과(5년제)"
    }
    if existing != {"2024", "2025", "2026"}:
        raise RuntimeError(f"강원대 건축학과 원문명 연도 누락: {sorted(existing)}")


def remove_stale_2026_notes(standard: list[dict], changes: list[str]) -> None:
    stale_marker = "정확한 배율 공식은 이미지 형태라 확인 불가"
    for record in standard:
        if (
            is_gangwon(record)
            and record["연도"] == "2026"
            and stale_marker in str(record.get("비고") or "")
        ):
            record["비고"] = None
            changes.append(f"2026 {record['학과']} 확인 완료된 추정식 비고 제거")


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining: list[dict] = []
    for record in exceptions:
        if not is_gangwon(record):
            remaining.append(record)
            continue
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"강원대 복원 중 키 중복: {key}")
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
            if is_gangwon(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def validate(standard: list[dict], exceptions: list[dict]) -> None:
    by_year = {
        year: sum(is_gangwon(record) and record["연도"] == year for record in standard)
        for year in ("2024", "2025", "2026")
    }
    if by_year != {"2024": 85, "2025": 86, "2026": 85}:
        raise RuntimeError(f"강원대 지원 데이터 연도별 건수 불일치: {by_year}")
    if any(is_gangwon(record) for record in exceptions):
        raise RuntimeError("공식 지원이 끝난 강원대 예외 행이 남음")
    if any(
        "정확한 배율 공식은 이미지 형태라 확인 불가" in str(record.get("비고") or "")
        for record in standard
        if is_gangwon(record)
    ):
        raise RuntimeError("강원대 확인 완료된 추정식 비고가 남음")


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    fix_formula_records(formulas, changes)
    fix_misplaced_2026_scores(standard, exceptions, changes)
    fix_department_names(standard, changes)
    remove_stale_2026_notes(standard, changes)
    restore_supported_departments(standard, exceptions, changes)
    validate(standard, exceptions)

    print(f"=== 강원대 모집요강·입시결과 확정 수정 {len(changes)}건 ===")
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
