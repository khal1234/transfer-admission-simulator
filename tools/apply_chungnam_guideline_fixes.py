"""충남대 2024~2026 편입학 모집요강·공식 결과를 반영한다.

근거 문서(충남대학교 입학정보 공식 첨부 PDF):
  - 2024: PDF 16쪽(책자 14쪽) 배점표, PDF 17쪽 산식, PDF 29쪽 환산표
  - 2025: PDF 18쪽(책자 16쪽) 배점표, PDF 32쪽(책자 30쪽) 환산표
  - 2026: PDF 20쪽(책자 16쪽) 배점표, PDF 34쪽(책자 30쪽) 환산표

근거 문서(충남대학교 입학정보 공식 편입학 결과 XLSX):
  - 2024: 일반편입학 최초합격자 평균 성적, 게시물 2016583
  - 2025: 일반편입학 최초 합격자 평균 성적, 게시물 2021489
  - 2026: 일반편입학 최초 합격자 평균 성적, 게시물 2025621

학과별 공식이 계산 코드에서 지원되므로 기존 예외 행을 지원 데이터로 복원한다.
대학이 공개한 환산 평균은 변경하지 않고, 과거 표준 배점과 직선식으로 잘못
되짚었던 TOEIC 근삿값과 전적대 백분율만 학과별 배점·실제 구간 폭에 맞게
재산출한다. data_artifacts의 원자적 저장 경로로 results/와 web/src/data/를
함께 갱신하고 JSON/CSV parity를 검증한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

ART_DEPARTMENT_PREFIXES = (
    "무용학과",
    "음악과",
    "관현악과",
    "회화과",
    "조소과",
    "디자인창의학과",
)

EXPECTED_ROWS_BY_YEAR = {"2024": 82, "2025": 83, "2026": 95}
EXPECTED_PUBLIC_ENGLISH_BY_YEAR = {"2024": 58, "2025": 57, "2026": 54}
EXPECTED_PUBLIC_GPA_BY_YEAR = {"2024": 59, "2025": 0, "2026": 0}

# 2025 환경공학과의 원본 셀 값은 40.275이고 표시 서식은 0.00이다.
# Excel 표시 규칙에 따라 공식 공개값은 40.28이지만, Python의 ties-to-even
# 반올림으로 추출한 과거 데이터에는 40.27이 저장되어 있었다.
EXPECTED_RESULT_CORRECTIONS = {
    ("2025", "환경공학과"): {"최종합격_토익환산점수": 40.28},
}

def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_chungnam(record: dict) -> bool:
    return record.get("대학명") == "충남대학교"


def is_art_department(name: str) -> bool:
    return name.startswith(ART_DEPARTMENT_PREFIXES)


def profile_weights(year: str, department: str) -> tuple[int, int]:
    """공인영어와 전적대성적 배점을 반환한다."""
    if is_art_department(department):
        return (0, 20) if year == "2024" else (0, 0)

    if year == "2024":
        if department == "한문학과":
            return 30, 10
        if department in {"화학과", "생물과학과"}:
            return 40, 20
        if department in {"컴퓨터융합학부", "인공지능학과", "식품공학과"}:
            return 20, 20
        if department in {"수의학과", "약학과"}:
            return 40, 10
        if department == "수학교육과":
            return 10, 30
        return 50, 10

    if department in {"컴퓨터융합학부", "인공지능학과", "식품공학과"}:
        return 20, 0
    if department in {"수의학과", "약학과"}:
        return 50, 0
    if year == "2026" and department == "수학교육과":
        return 10, 0
    return 60, 0


def reverse_toeic_average(year: str, converted: float, weight: int) -> float:
    """공개 환산 평균을 구간 중간값 기준 TOEIC 근삿값으로 되짚는다."""
    table_score = max(40.0, min(100.0, converted * 100 / weight))
    if year == "2024":
        return round(385 + (table_score - 40) * 10, 2)
    if table_score <= 40:
        return 435.5  # 381~490점 구간의 중간값
    if table_score <= 41:
        return round(435.5 + (table_score - 40) * 64.5, 2)
    if table_score <= 60:
        return round(500 + (table_score - 41) * 15, 2)
    if table_score <= 61:
        return round(785 + (table_score - 60) * 10, 2)
    return round(795 + (table_score - 61) * 5, 2)


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    for record in formulas:
        if not is_chungnam(record):
            continue

        year = record["연도"]
        english = record["공인영어_환산공식"]
        if year == "2024":
            source_text = (
                "[부록 1] 공인영어성적 환산표 배점 × 0.5(50점): "
                "TOEIC 981~990=50점, 971~980=49.5점, …, 381~390=20점"
            )
            note = (
                "출처: 2024학년도 모집요강 PDF 16쪽(책자 14쪽) 배점표, "
                "PDF 17쪽 전적대학성적 산식, PDF 29쪽(책자 27쪽) 환산표. "
                "표준전형은 공인영어 50점+전적대성적 10점+면접 40점=100점. "
                "한문·화학/생물·컴퓨터/AI·식품·수의/약학·수학교육·예술/무용은 "
                "모집단위별 별도 배점을 적용한다."
            )
        else:
            source_text = (
                "[부록 1] 공인영어성적 환산표 배점 × 0.6(60점): "
                "TOEIC 990=60점, 985=59.4점, …, 795=36.6점, "
                "780~790=36점, …, 381~490=24점"
            )
            pdf_page = "18" if year == "2025" else "20"
            appendix_page = "32" if year == "2025" else "34"
            note = (
                f"출처: {year}학년도 모집요강 PDF {pdf_page}쪽(책자 16쪽) 배점표, "
                f"PDF {appendix_page}쪽(책자 30쪽) 환산표. "
                "표준전형은 공인영어 60점+면접 40점=100점이며 전적대성적은 미반영. "
                "컴퓨터/AI·식품·수의/약학·예술/무용과 2026 수학교육과는 "
                "모집단위별 별도 배점을 적용한다."
            )

        if english["수식원문"] != source_text:
            english["수식원문"] = source_text
            changes.append(f"환산공식 {year} 공인영어 원문 설명 정정")
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
        if not is_chungnam(record):
            remaining.append(record)
            continue
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"충남대 복원 중 키 중복: {key}")
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
            if is_chungnam(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def fix_derived_scores(standard: list[dict], changes: list[str]) -> None:
    for record in standard:
        if not is_chungnam(record):
            continue
        year, department = record["연도"], record["학과"]
        english_weight, gpa_weight = profile_weights(year, department)

        converted_english = record.get("최종합격_토익환산점수")
        expected_toeic = (
            reverse_toeic_average(year, converted_english, english_weight)
            if converted_english is not None and english_weight > 0
            else None
        )
        if record.get("최종합격_토익원점수") != expected_toeic:
            previous = record.get("최종합격_토익원점수")
            record["최종합격_토익원점수"] = expected_toeic
            changes.append(
                f"{year} {department} TOEIC 역산 근삿값 {previous} → {expected_toeic}"
            )

        converted_gpa = record.get("최종합격_학점환산점수")
        expected_gpa = (
            round(converted_gpa * 100 / gpa_weight, 2)
            if converted_gpa is not None and gpa_weight > 0
            else None
        )
        if record.get("최종합격_학점원점수_100점만점") != expected_gpa:
            previous = record.get("최종합격_학점원점수_100점만점")
            record["최종합격_학점원점수_100점만점"] = expected_gpa
            changes.append(
                f"{year} {department} 학점 역산값 {previous} → {expected_gpa}"
            )


def fix_official_result_scores(standard: list[dict], changes: list[str]) -> None:
    for record in standard:
        if not is_chungnam(record):
            continue

        key = (record["연도"], record["학과"])
        for field, expected in EXPECTED_RESULT_CORRECTIONS.get(key, {}).items():
            current = record.get(field)
            if current != expected:
                record[field] = expected
                changes.append(
                    f"{record['연도']} {record['학과']} 공식 표시값 "
                    f"{field} {current} → {expected}"
                )


def validate(standard: list[dict], exceptions: list[dict]) -> None:
    chungnam = [record for record in standard if is_chungnam(record)]
    by_year = {
        year: [record for record in chungnam if record["연도"] == year]
        for year in EXPECTED_ROWS_BY_YEAR
    }
    row_counts = {year: len(rows) for year, rows in by_year.items()}
    if row_counts != EXPECTED_ROWS_BY_YEAR:
        raise RuntimeError(f"충남대 지원 데이터 연도별 건수 불일치: {row_counts}")
    remaining = [record for record in exceptions if is_chungnam(record)]
    if remaining:
        raise RuntimeError(f"공식 지원이 끝난 충남대 예외 행이 남음: {len(remaining)}")

    if any(record.get("합격자기준") != "최초" for record in chungnam):
        raise RuntimeError("충남대 공개 평균성적의 합격자기준은 모두 최초여야 함")

    public_english = {
        year: sum(record.get("최종합격_토익환산점수") is not None for record in rows)
        for year, rows in by_year.items()
    }
    if public_english != EXPECTED_PUBLIC_ENGLISH_BY_YEAR:
        raise RuntimeError(f"충남대 공개 공인영어 평균 행 수 불일치: {public_english}")

    public_gpa = {
        year: sum(record.get("최종합격_학점환산점수") is not None for record in rows)
        for year, rows in by_year.items()
    }
    if public_gpa != EXPECTED_PUBLIC_GPA_BY_YEAR:
        raise RuntimeError(f"충남대 공개 전적대 평균 행 수 불일치: {public_gpa}")

    by_key = {(record["연도"], record["학과"]): record for record in chungnam}
    for key, expected_fields in EXPECTED_RESULT_CORRECTIONS.items():
        record = by_key.get(key, {})
        for field, expected in expected_fields.items():
            actual = record.get(field)
            if actual != expected:
                raise RuntimeError(
                    f"충남대 공식 입시결과 정정값 검증 실패: "
                    f"{key} {field} {actual} != {expected}"
                )


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    fix_formula_records(formulas, changes)
    restore_supported_departments(standard, exceptions, changes)
    fix_official_result_scores(standard, changes)
    fix_derived_scores(standard, changes)
    validate(standard, exceptions)

    print(f"=== 충남대 모집요강 확정 수정 {len(changes)}건 ===")
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
