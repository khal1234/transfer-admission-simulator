"""부산대 2024~2026 편입학 모집요강의 학과별 배점을 반영한다.

근거 문서(부산대학교 입학처 공식 모집요강):
  - 2024: 10쪽 전형요소별 배점, 11쪽 환산식
  - 2025: 14쪽 일반·학사 배점/환산식, 15쪽 계약학과 배점
  - 2026: 12쪽 전형요소별 배점/환산식, 13쪽 평가방법

학과별 공식이 코드에서 지원되므로, 기존에 배점 차이만으로 격리했던 부산대
레코드는 모두 표준 데이터로 복원한다. 입결 원값은 바꾸지 않는다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

TYPO_DEPARTMENT = "디자인학과(디자인앤테크놀리저전공)"
OFFICIAL_DEPARTMENT = "디자인학과(디자인앤테크놀로지전공)"

FORMULA_NOTES = {
    "2024": (
        "출처: 2024학년도 모집요강 10~11쪽. 모집단위별로 "
        "① 공인영어30+전적대30+면접40, "
        "② 공인영어30+전적대30+서류20+면접20, "
        "③ 공인영어30+전적대20+지필50, "
        "④ 스포츠과학과 공인영어30+전적대20+서류30+지필20, "
        "⑤ 예술 실기형 공인영어30+전적대20+실기50, "
        "⑥ 정보의생명공학대학 공인영어20+전적대20+서류20+지필40을 적용한다. "
        "공인영어와 전적대성적은 각 배점에 비례 환산하고 소수점 셋째 자리에서 반올림한다."
    ),
    "2025": (
        "출처: 2025학년도 모집요강 14~15쪽. 일반 면접형은 "
        "공인영어30+전적대30+면접40, 서류·면접형은 "
        "공인영어30+전적대30+서류20+면접20, 예술 실기형은 "
        "공인영어30+전적대20+실기50이다. 계약학과 발전공학과 편입은 "
        "전적대30+산업체근무경력30+면접40으로 공인영어를 반영하지 않는다. "
        "공인영어와 전적대성적은 각 배점에 비례 환산하고 소수점 셋째 자리에서 반올림한다."
    ),
    "2026": (
        "출처: 2026학년도 모집요강 12~13쪽. 일반 면접형은 "
        "공인영어30+전적대30+면접40, 서류·면접형은 "
        "공인영어30+전적대30+서류20+면접20, 예술 실기형은 "
        "공인영어30+전적대20+실기50이다. 공인영어와 전적대성적은 "
        "각 배점에 비례 환산하고 소수점 셋째 자리에서 반올림한다."
    ),
}


def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_pusan(record: dict) -> bool:
    return record.get("대학명") == "부산대학교"


def fix_department_typo(record: dict) -> bool:
    changed = False
    for field in ("학과", "학과_원본명"):
        if record.get(field) == TYPO_DEPARTMENT:
            record[field] = OFFICIAL_DEPARTMENT
            changed = True
    return changed


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining_exceptions: list[dict] = []

    for record in exceptions:
        if not is_pusan(record):
            remaining_exceptions.append(record)
            continue

        original_department = record["학과"]
        if fix_department_typo(record):
            changes.append(f"{record['연도']} {original_department} 학과명 오탈자 정정")
        record.pop("제거사유", None)
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"부산대 복원 중 키 중복: {key}")
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
            if is_pusan(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def fix_formula_notes(formulas: list[dict], changes: list[str]) -> None:
    for record in formulas:
        if not is_pusan(record):
            continue
        year = record["연도"]
        note = FORMULA_NOTES[year]
        if record.get("비고") != note:
            record["비고"] = note
            changes.append(f"{year} 학과별 배점·공식 근거 보완")


def validate(standard: list[dict], exceptions: list[dict]) -> None:
    pusan_standard = [record for record in standard if is_pusan(record)]
    pusan_exceptions = [record for record in exceptions if is_pusan(record)]
    if len(pusan_standard) != 236:
        raise RuntimeError(f"부산대 지원 데이터는 236행이어야 함: {len(pusan_standard)}")
    if pusan_exceptions:
        raise RuntimeError(f"공식 지원이 끝난 부산대 예외 행이 남음: {len(pusan_exceptions)}")

    keys = {record_key(record) for record in pusan_standard}
    required = {
        ("부산대학교", "2024", "스포츠과학과"),
        ("부산대학교", "2024", "디자인학과(시각디자인전공)"),
        ("부산대학교", "2025", "조형학과(도예전공)"),
        ("부산대학교", "2026", "약학부"),
        ("부산대학교", "2026", "무용학과 한국무용전공"),
    }
    missing = required - keys
    if missing:
        raise RuntimeError(f"부산대 대표 특수 배점 행이 없음: {sorted(missing)}")


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    restore_supported_departments(standard, exceptions, changes)
    fix_formula_notes(formulas, changes)
    validate(standard, exceptions)

    print(f"=== 부산대 모집요강 학과별 공식 반영 {len(changes)}건 ===")
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
