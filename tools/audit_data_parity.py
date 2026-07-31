"""results JSON/CSV와 web JSON이 같은 데이터 세대인지 감사한다."""

import hashlib
import json
import sys
from pathlib import Path

from data_artifacts import (
    EXCEPTION,
    FORMULA,
    STANDARD,
    audit_json_csv_pair,
    save_artifact_generation,
)


ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
WEB_DATA_DIR = ROOT / "web" / "src" / "data"


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    if "--repair-csv" in sys.argv:
        datasets = {}
        for name in (STANDARD, EXCEPTION, FORMULA):
            with (RESULTS_DIR / name).open(encoding="utf-8-sig") as stream:
                datasets[name] = json.load(stream)
        save_artifact_generation(RESULTS_DIR, WEB_DATA_DIR, datasets)
        print("JSON을 기준으로 CSV를 재생성하고 전체 산출물을 원자적으로 검증했습니다.")

    failed = False

    for name in (STANDARD, EXCEPTION):
        result = audit_json_csv_pair(
            RESULTS_DIR / name,
            RESULTS_DIR / name.replace(".json", ".csv"),
        )
        print(
            f"{name}: JSON {result.json_rows}행 / CSV {result.csv_rows}행 / "
            f"JSON-only {result.json_only} / CSV-only {result.csv_only} / "
            f"값 차이 {result.value_mismatches} / 키 중복 {result.duplicate_keys}"
        )
        failed = failed or not result.is_clean

    for name in (STANDARD, EXCEPTION, FORMULA):
        results_hash = hashlib.sha256((RESULTS_DIR / name).read_bytes()).hexdigest()
        web_hash = hashlib.sha256((WEB_DATA_DIR / name).read_bytes()).hexdigest()
        matches = results_hash == web_hash
        print(f"{name}: results↔web SHA-256 {'일치' if matches else '불일치'}")
        failed = failed or not matches

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
