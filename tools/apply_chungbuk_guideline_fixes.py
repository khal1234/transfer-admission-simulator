"""충북대 2024~2026 편입학 모집요강 2차 대조 결과를 반영한다.

근거 문서(충북대학교 입학정보 공식 첨부 PDF):
  - 2024: PDF 31쪽 배점·영어 환산표, PDF 33쪽 전적대 성적 산식
  - 2025: PDF 27쪽 배점·영어 환산표, PDF 28쪽 전적대 성적 산식
  - 2026: PDF 26쪽 배점·영어 환산표, PDF 31쪽 동점자·전적대 산식

입결 평균값은 바꾸지 않는다. 학과별 공식이 계산 코드에서 지원되므로 기존
예외 행을 지원 데이터로 복원하고, 산식 설명을 보완한 뒤 results/와
web/src/data/를 동시에 저장해 JSON/CSV parity를 검증한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_chungbuk(record: dict) -> bool:
    return record.get("대학명") == "충북대학교"


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    for record in formulas:
        if not is_chungbuk(record):
            continue

        year = record["연도"]
        gpa = record["전적대성적_환산공식"]
        if year in {"2024", "2025"}:
            description = (
                "전적대 1곳: 10 + (백분율점수 × 0.2). 전적대 2곳 이상: "
                "10 + {0.2 × [Σ(대학별 백분율점수 × 해당 대학 취득학점) "
                "/ Σ(대학별 취득학점)]}"
            )
            note = (
                f"출처: {year}학년도 모집요강 PDF "
                f"{'31·33' if year == '2024' else '27·28'}쪽. "
                "일반학과는 공인영어 30점+전적대성적 30점+면접 40점=100점. "
                "수의·약학 등은 면접20+전공필기20, 건축·예술 등은 "
                "면접10+실기30의 학과별 배점을 적용. "
                "최초 합격자가 2명 이하인 학과는 성적 미산출."
            )
        else:
            description = (
                "총점에는 미반영. 최종 동점자 판단에는 전적대 백분율점수와 "
                "취득학점을 사용하며, 전적대 2곳 이상은 "
                "Σ(대학별 백분율점수 × 해당 대학 취득학점) / "
                "Σ(대학별 취득학점)으로 산출"
            )
            note = (
                "출처: 2026학년도 모집요강 PDF 26·31쪽. 일반학과는 "
                "공인영어 60점+면접 40점=100점이며 전적대성적은 총점 미반영, "
                "수의·간호는 면접20+전공필기20, 건축·미술·디자인은 "
                "면접10+실기30의 학과별 배점을 적용. "
                "최종 동점자 판단에 사용. 최초 합격자가 2명 이하인 학과는 "
                "성적 미산출."
            )

        if gpa.get("학점기준설명") != description:
            gpa["학점기준설명"] = description
            changes.append(f"{year} 전적대 성적 산식 설명 보완")
        if record.get("비고") != note:
            record["비고"] = note
            changes.append(f"{year} 공식 PDF 페이지 근거 추가")


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining: list[dict] = []

    for record in exceptions:
        if not is_chungbuk(record):
            remaining.append(record)
            continue
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"충북대 복원 중 키 중복: {key}")
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
            if is_chungbuk(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def validate_classification(standard: list[dict], exceptions: list[dict]) -> None:
    by_year = {
        year: sum(
            is_chungbuk(record) and record["연도"] == year
            for record in standard
        )
        for year in ("2024", "2025", "2026")
    }
    if by_year != {"2024": 57, "2025": 45, "2026": 48}:
        raise RuntimeError(f"충북대 지원 데이터 연도별 건수 불일치: {by_year}")
    remaining = [record for record in exceptions if is_chungbuk(record)]
    if remaining:
        raise RuntimeError(f"공식 지원이 끝난 충북대 예외 행이 남음: {len(remaining)}")


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    fix_formula_records(formulas, changes)
    restore_supported_departments(standard, exceptions, changes)
    validate_classification(standard, exceptions)

    print(f"=== 충북대 모집요강 2차 수정 {len(changes)}건 ===")
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
