"""전남대 2024~2026 모집요강·입시결과 원본 대조 결과를 반영한다.

근거 문서(전남대학교 입학처 공식 첨부 PDF):
  - 2024 모집요강 PDF 11·12·35쪽, 결과 PDF 1~5쪽
  - 2025 모집요강 PDF 12·13·43쪽, 결과 PDF 1~7쪽
  - 2026 모집요강 PDF 12·13·38쪽, 결과 PDF 1~6쪽

학과별 전형 프로필을 계산 코드에서 지원하므로 전남대 예외 행을 지원 데이터로
복원한다. 3차 원본 대조에서 확인한 2024 공개 점수 11필드와 결과표의 빈
등록자수 10필드를 유지하고, 2024·2025에서 누락된 등록자수 1건씩을 복원한다.
세 결과 PDF가 모두 등록자 기준임을 명시하므로 합격자기준은 최종으로 통일한다.
results/와 web/src/data/를 동시에 저장하고 JSON/CSV parity를 검증한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from data_artifacts import EXCEPTION, FORMULA, STANDARD, save_artifact_generation


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"

OFFICIAL_2024_SCORE_CORRECTIONS: dict[str, dict[str, float]] = {
    "이론전공": {
        "최종합격_토익원점수": 835.0,
        "최종합격_학점원점수_100점만점": 96.35,
    },
    "관현악전공": {"최종합격_학점원점수_100점만점": 86.5},
    "체육교육과": {"최종합격_학점원점수_100점만점": 92.86},
    "건축디자인학과": {"최종합격_학점원점수_100점만점": 86.72},
    "환경시스템공학과": {"최종합격_학점원점수_100점만점": 90.7},
    "산업기술융합공학과(야간)": {
        "최종합격_학점원점수_100점만점": 97.59
    },
    "멀티미디어전공": {"최종합격_학점원점수_100점만점": 92.12},
    "전자상거래전공": {"최종합격_학점원점수_100점만점": 84.87},
    "수산생명의학과": {"최종합격_학점원점수_100점만점": 94.96},
    "해양경찰학과": {"최종합격_학점원점수_100점만점": 83.1},
}

OFFICIAL_2024_BLANK_REGISTERED = {
    "냉동공조공학과",
    "문화관광경영학과",
    "석유화학소재공학과",
    "양식생물학과",
    "의공학과",
    "전기및반도체공학전공",
    "지질환경전공",
    "컴퓨터공학전공",
    "헬스케어메디컬공학부",
    "화공안전전공",
}

OFFICIAL_REGISTERED_CORRECTIONS = {
    ("2024", "역사교육과"): 1,
    ("2025", "한국화전공"): 1,
}


def load(name: str) -> list[dict]:
    with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def record_key(record: dict) -> tuple[str, str, str]:
    return record["대학명"], record["연도"], record["학과"]


def is_chonnam(record: dict) -> bool:
    return record.get("대학명") == "전남대학교"


def fix_formula_records(formulas: list[dict], changes: list[str]) -> None:
    for record in formulas:
        if not is_chonnam(record):
            continue

        year = record["연도"]
        if year == "2024":
            pages = "11·12·35"
            special = (
                "수의학과는 1단계 4배수 뒤 표준 최종배점, 약학부는 "
                "영어300+GPA200+필기500, 여수캠퍼스는 GPA600+면접400, "
                "예체능은 GPA300+면접200+실기500이다. 미술학과 이론전공은 "
                "실기 예외에서 제외되어 표준형이다."
            )
            gpa_rule = "백분율 성적을 배점 비율로 반영"
        elif year == "2025":
            pages = "12·13·43"
            special = (
                "수의학과는 1단계 3배수 뒤 표준 최종배점, 약학부는 "
                "영어300+GPA200+필기500, 여수캠퍼스는 GPA600+면접400, "
                "예체능은 GPA300+면접200+실기500이다. 미술학과 이론전공은 "
                "실기 예외에서 제외되어 표준형이다."
            )
            gpa_rule = "백분율 성적을 배점 비율로 반영"
        elif year == "2026":
            pages = "12·13·38"
            special = (
                "간호학과는 영어400+GPA200+필기400, 수의학과는 "
                "영어300+GPA100+필기300+면접300, 약학부는 "
                "영어300+GPA200+필기500, 디자인학과는 "
                "GPA200+면접400+실기400, 여수캠퍼스는 GPA600+면접400, "
                "그 밖의 예체능은 GPA300+면접200+실기500이다. 미술학과 "
                "이론전공은 실기 예외에서 제외되어 표준형이다."
            )
            gpa_rule = "백분율 성적을 배점 비율로 반영"
        else:
            continue

        note = (
            f"출처: {year}학년도 모집요강 PDF {pages}쪽. 광주캠퍼스 표준형은 "
            "공인영어400+전적대200+면접400=1,000점이고 영어는 "
            "(TOEIC÷990)×400, 전적대는 백분율×2이다. "
            f"{special} {gpa_rule}."
        )
        if record.get("비고") != note:
            record["비고"] = note
            changes.append(f"환산공식 {year} 학과별 배점·공식 근거 추가")

        gpa = record["전적대성적_환산공식"]
        if gpa.get("학점기준설명") != gpa_rule:
            gpa["학점기준설명"] = gpa_rule
            changes.append(f"환산공식 {year} 전적대 처리 규칙 추가")


def fix_official_results(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    records = [
        record
        for record in [*standard, *exceptions]
        if is_chonnam(record)
    ]
    by_key = {(record["연도"], record["학과"]): record for record in records}
    by_2024_department = {
        department: record
        for (year, department), record in by_key.items()
        if year == "2024"
    }

    required = set(OFFICIAL_2024_SCORE_CORRECTIONS)
    required.update(OFFICIAL_2024_BLANK_REGISTERED)
    missing = sorted(required - set(by_2024_department))
    if missing:
        raise RuntimeError(f"전남대 2024 공식 결과 정정 대상 누락: {missing}")
    missing_keys = sorted(set(OFFICIAL_REGISTERED_CORRECTIONS) - set(by_key))
    if missing_keys:
        raise RuntimeError(f"전남대 공식 등록자수 정정 대상 누락: {missing_keys}")

    for record in records:
        if record.get("합격자기준") == "최종":
            continue
        record["합격자기준"] = "최종"
        changes.append(f"{record['연도']} {record['학과']} 합격자기준 → 최종")

    for department, corrections in OFFICIAL_2024_SCORE_CORRECTIONS.items():
        record = by_2024_department[department]
        for field, expected in corrections.items():
            if record.get(field) == expected:
                continue
            previous = record.get(field)
            record[field] = expected
            changes.append(f"2024 {department} {field} {previous} → {expected}")

    for department in sorted(OFFICIAL_2024_BLANK_REGISTERED):
        record = by_2024_department[department]
        if record.get("합격인원") is None:
            continue
        previous = record.get("합격인원")
        record["합격인원"] = None
        changes.append(f"2024 {department} 빈 등록자수 {previous} → null")

    for key, expected in OFFICIAL_REGISTERED_CORRECTIONS.items():
        record = by_key[key]
        if record.get("합격인원") == expected:
            continue
        previous = record.get("합격인원")
        record["합격인원"] = expected
        changes.append(
            f"{key[0]} {key[1]} 등록자수 {previous} → {expected}"
        )


def restore_supported_departments(
    standard: list[dict], exceptions: list[dict], changes: list[str]
) -> None:
    existing = {record_key(record) for record in standard}
    moved_by_year: dict[str, list[dict]] = {"2024": [], "2025": [], "2026": []}
    remaining: list[dict] = []

    for record in exceptions:
        if not is_chonnam(record):
            remaining.append(record)
            continue
        key = record_key(record)
        if key in existing:
            raise RuntimeError(f"전남대 복원 중 키 중복: {key}")
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
            if is_chonnam(record) and record["연도"] == year
        ) + 1
        standard[insertion_index:insertion_index] = rows


def validate(standard: list[dict], exceptions: list[dict]) -> None:
    by_year = {
        year: sum(
            is_chonnam(record) and record["연도"] == year
            for record in standard
        )
        for year in ("2024", "2025", "2026")
    }
    if by_year != {"2024": 129, "2025": 129, "2026": 125}:
        raise RuntimeError(f"전남대 지원 데이터 연도별 건수 불일치: {by_year}")
    remaining = [record for record in exceptions if is_chonnam(record)]
    if remaining:
        raise RuntimeError(f"공식 지원이 끝난 전남대 예외 행이 남음: {len(remaining)}")
    chonnam = [record for record in standard if is_chonnam(record)]
    if any(record.get("합격자기준") != "최종" for record in chonnam):
        raise RuntimeError("전남대 등록자 평균의 합격자기준은 모두 최종이어야 함")
    for key, expected in OFFICIAL_REGISTERED_CORRECTIONS.items():
        record = next(
            record
            for record in chonnam
            if (record["연도"], record["학과"]) == key
        )
        if record.get("합격인원") != expected:
            raise RuntimeError(
                f"전남대 {key[0]} {key[1]} 등록자수 불일치: "
                f"{record.get('합격인원')}"
            )


def main() -> int:
    standard = load(STANDARD)
    exceptions = load(EXCEPTION)
    formulas = load(FORMULA)
    changes: list[str] = []

    fix_formula_records(formulas, changes)
    fix_official_results(standard, exceptions, changes)
    restore_supported_departments(standard, exceptions, changes)
    validate(standard, exceptions)

    print(f"=== 전남대 모집요강·입시결과 확정 수정 {len(changes)}건 ===")
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
