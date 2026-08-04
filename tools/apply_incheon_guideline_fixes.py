"""인천대 2024~2026 편입학 모집요강·공식 결과를 반영한다.

근거 문서(인천대학교 입학안내 공식 편입학전형 모집요강):
  - 2024: PDF 17~18쪽(책자 15~16쪽)
  - 2025: PDF 14쪽(책자 11쪽)
  - 2026: PDF 17~18쪽(책자 14~15쪽)

근거 문서(인천대학교 입학안내 공식 편입학전형 결과 PDF):
  - 2024: 입학전형 결과_공개용, 게시물 8823
  - 2025: 최종 결과(250404), 게시물 12297
  - 2026: 최종 결과, 게시물 15131

학과별 공식이 계산 코드에서 지원되므로 기존 인천대 예외 행을 모두 지원
데이터로 복원한다. 일반·디자인은 영어120+면접80, 예체능 실기형은
실기120+면접80, 2025~2026 운동건강학부는 영어60+실기60+면접80,
2026 조형예술학부는 면접200을 적용한다. 공식 결과의 일반편입 154개
모집단위에 공개된 모집·지원인원과 최종합격자 TOEIC 평균도 검증한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

SOURCE_PAGES = {
    "2024": "PDF 17~18쪽(책자 15~16쪽)",
    "2025": "PDF 14쪽(책자 11쪽)",
    "2026": "PDF 17~18쪽(책자 14~15쪽)",
}

EXPECTED_ROWS_BY_YEAR = {"2024": 53, "2025": 49, "2026": 52}
EXPECTED_PUBLIC_ENGLISH_BY_YEAR = {"2024": 45, "2025": 46, "2026": 47}
EXPECTED_RESULT_VALUES = {
    ("2024", "영어영문학과"): {
        "모집인원": 8, "지원인원": 33, "최종합격_토익원점수": 899.0,
    },
    ("2024", "공연예술학과"): {
        "모집인원": 2, "지원인원": 127, "최종합격_토익원점수": None,
    },
    ("2025", "국어국문학과"): {
        "모집인원": 5, "지원인원": 33, "최종합격_토익원점수": 734.0,
    },
    ("2025", "운동건강학부"): {
        "모집인원": 5, "지원인원": 20, "최종합격_토익원점수": 735.0,
    },
    ("2026", "영어영문학과"): {
        "모집인원": 10, "지원인원": 63, "최종합격_토익원점수": 937.5,
    },
    ("2026", "디자인학부"): {
        "모집인원": 6, "지원인원": 41, "최종합격_토익원점수": 882.5,
    },
}


def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_incheon(record: dict) -> bool:
    return record.get("대학명") == "인천대학교"


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining: list[dict] = []

    for record in exceptions:
        if not is_incheon(record):
            remaining.append(record)
            continue
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"인천대 복원 중 키 중복: {key}")
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
            if is_incheon(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    for record in formulas:
        if not is_incheon(record):
            continue
        year = record["연도"]
        expected_note = (
            f"출처: {year}학년도 모집요강 {SOURCE_PAGES[year]}. "
            "인문·자연·디자인학부는 공인영어120+면접80, 예체능 실기형은 "
            "실기120+면접80이다. 2025~2026 운동건강학부는 "
            "공인영어60(기본점수 없음)+실기60+면접80, 2026 조형예술학부는 "
            "면접200을 적용한다. 전적대 성적은 면접 참고자료이며 총점에 미반영."
        )
        updates = {
            "총점": 200,
            "배점": {
                "공인영어": 120,
                "면접구술": 80,
                "전적대성적": None,
            },
            "비고": expected_note,
        }
        for field, expected in updates.items():
            if record.get(field) == expected:
                continue
            record[field] = expected
            changes.append(f"환산공식 {year} {field} 정정")


def validate(standard: list[dict], exceptions: list[dict]) -> None:
    incheon = [record for record in standard if is_incheon(record)]
    rows_by_year = {
        year: [record for record in incheon if record["연도"] == year]
        for year in EXPECTED_ROWS_BY_YEAR
    }
    row_counts = {year: len(rows) for year, rows in rows_by_year.items()}
    if row_counts != EXPECTED_ROWS_BY_YEAR:
        raise RuntimeError(f"인천대 지원 데이터 연도별 건수 불일치: {row_counts}")
    remaining = [record for record in exceptions if is_incheon(record)]
    if remaining:
        raise RuntimeError(f"공식 지원이 끝난 인천대 예외 행이 남음: {len(remaining)}")

    if any(record.get("합격자기준") != "최종" for record in incheon):
        raise RuntimeError("인천대 공개 TOEIC 평균의 합격자기준은 모두 최종이어야 함")

    public_english = {
        year: sum(record.get("최종합격_토익원점수") is not None for record in rows)
        for year, rows in rows_by_year.items()
    }
    if public_english != EXPECTED_PUBLIC_ENGLISH_BY_YEAR:
        raise RuntimeError(f"인천대 공개 TOEIC 평균 행 수 불일치: {public_english}")

    for field in ("모집인원", "지원인원"):
        incomplete = [
            (record["연도"], record["학과"])
            for record in incheon if record.get(field) is None
        ]
        if incomplete:
            raise RuntimeError(f"인천대 {field} 누락: {incomplete}")

    if any(record.get("합격인원") is not None for record in incheon):
        raise RuntimeError("공식 결과가 미공개한 인천대 합격인원을 임의 저장하면 안 됨")
    if any(record.get("최종합격_토익환산점수") is not None for record in incheon):
        raise RuntimeError("인천대 공식 결과는 TOEIC 원점수 평균으로 저장해야 함")
    if any(
        record.get("최종합격_학점환산점수") is not None
        or record.get("최종합격_학점원점수_100점만점") is not None
        for record in incheon
    ):
        raise RuntimeError("인천대는 전적대 성적 평균을 공개하지 않음")

    by_key = {(record["연도"], record["학과"]): record for record in incheon}
    for key, expected_fields in EXPECTED_RESULT_VALUES.items():
        record = by_key.get(key, {})
        for field, expected in expected_fields.items():
            actual = record.get(field)
            if actual != expected:
                raise RuntimeError(
                    f"인천대 공식 입시결과 검증 실패: "
                    f"{key} {field} {actual} != {expected}"
                )


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    restore_supported_departments(standard, exceptions, changes)
    fix_formula_records(formulas, changes)
    validate(standard, exceptions)

    print(f"=== 인천대 모집요강 학과별 공식 반영 {len(changes)}건 ===")
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
