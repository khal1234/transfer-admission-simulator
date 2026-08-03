"""전북대 2024~2026 편입학 모집요강 대조 결과를 데이터 산출물에 반영한다.

근거 문서(전북대학교 공식 모집요강 PDF):
  - 2024: PDF 24쪽(책자 22쪽) 배점표, PDF 25쪽 산식, PDF 43~46쪽 환산표
  - 2025: PDF 28쪽(책자 26쪽) 배점표, PDF 29쪽 산식, PDF 54~57쪽 환산표
  - 2026: PDF 25쪽(책자 23쪽) 배점표, PDF 26쪽 산식, PDF 50~53쪽 환산표

세 연도의 표준전형은 전적대성적 60점+공인영어 80점+면접 60점이며,
TOEIC 환산표도 동일하다. 학과별 공식이 계산 코드에서 지원되므로 기존 예외
행을 지원 데이터로 복원한다. 입결 평균값은 바꾸지 않고 results/와
web/src/data/를 동시에 저장해 JSON/CSV parity를 검증한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

PAGE_EVIDENCE = {
    "2024": (24, 22, 25, "43~46", "41~44"),
    "2025": (28, 26, 29, "54~57", "52~55"),
    "2026": (25, 23, 26, "50~53", "48~51"),
}


def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_jeonbuk(record: dict) -> bool:
    return record.get("대학명") == "전북대학교"


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    source_text = (
        "[별첨 1] 공인영어성적 환산표 백분율 환산점수 × 0.8(80점): "
        "TOEIC 990=80점, 985=79.596점, … (2024~2026 동일 표)"
    )
    for record in formulas:
        if not is_jeonbuk(record):
            continue

        year = record["연도"]
        if year not in PAGE_EVIDENCE:
            continue
        score_pdf, score_book, formula_pdf, english_pdf, english_book = PAGE_EVIDENCE[year]
        special_profiles = (
            "예술대학은 GPA120+면접20+실기60, 수의학과는 "
            "GPA20+영어80+필답80+면접20, "
            f"{'약학과' if year == '2024' else '약학과·치의학과'}는 "
            "GPA20+영어60+필답80+면접40"
        )
        if year in {"2024", "2026"}:
            special_profiles += ", 스포츠과학과는 GPA50+영어50+면접50+실기50"
        if year == "2026":
            special_profiles += ", 한옥학과는 GPA100"
        note = (
            f"출처: {year}학년도 모집요강 PDF {score_pdf}쪽(책자 {score_book}쪽) "
            f"배점표, PDF {formula_pdf}쪽 환산식, PDF {english_pdf}쪽"
            f"(책자 {english_book}쪽) 공인영어 환산표. 표준전형은 전적대성적 "
            "60점+공인영어 80점+면접 60점=200점이며, 전적대성적은 "
            f"백분율×0.6, 공인영어는 환산표 백분율×0.8이다. {special_profiles}."
        )

        english = record["공인영어_환산공식"]
        if english.get("수식원문") != source_text:
            english["수식원문"] = source_text
            changes.append(f"환산공식 {year} 공인영어 원문 설명 확정")
        if record.get("비고") != note:
            record["비고"] = note
            changes.append(f"환산공식 {year} 공식 PDF 페이지 근거 추가")


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining: list[dict] = []

    for record in exceptions:
        if not is_jeonbuk(record):
            remaining.append(record)
            continue
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"전북대 복원 중 키 중복: {key}")
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
            if is_jeonbuk(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def validate_classification(standard: list[dict], exceptions: list[dict]) -> None:
    by_year = {
        year: sum(
            is_jeonbuk(record) and record["연도"] == year
            for record in standard
        )
        for year in ("2024", "2025", "2026")
    }
    if by_year != {"2024": 87, "2025": 89, "2026": 89}:
        raise RuntimeError(f"전북대 지원 데이터 연도별 건수 불일치: {by_year}")
    remaining = [record for record in exceptions if is_jeonbuk(record)]
    if remaining:
        raise RuntimeError(f"공식 지원이 끝난 전북대 예외 행이 남음: {len(remaining)}")


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    fix_formula_records(formulas, changes)
    restore_supported_departments(standard, exceptions, changes)
    validate_classification(standard, exceptions)

    print(f"=== 전북대 모집요강 확정 수정 {len(changes)}건 ===")
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
