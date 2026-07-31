"""입결 JSON/CSV/web 사본을 같은 데이터 세대로 저장하고 검증한다."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Mapping, Sequence


STANDARD = "편입_성적_통합.json"
EXCEPTION = "편입_예외학과_통합.json"
FORMULA = "편입_환산공식_통합.json"


class ArtifactValidationError(RuntimeError):
    """직렬화한 산출물이 데이터 계약을 만족하지 않는다."""


@dataclass(frozen=True)
class CsvLayout:
    columns: tuple[str, ...]
    newline: str
    has_bom: bool


@dataclass(frozen=True)
class ParityResult:
    json_rows: int
    csv_rows: int
    json_only: int
    csv_only: int
    value_mismatches: int
    duplicate_keys: int

    @property
    def is_clean(self) -> bool:
        return (
            self.json_only == 0
            and self.csv_only == 0
            and self.value_mismatches == 0
            and self.duplicate_keys == 0
            and self.json_rows == self.csv_rows
        )


def read_csv_layout(path: Path) -> CsvLayout:
    raw = path.read_bytes()
    has_bom = raw.startswith(b"\xef\xbb\xbf")
    newline = "\r\n" if b"\r\n" in raw else "\n"
    with io.StringIO(raw.decode("utf-8-sig"), newline="") as stream:
        reader = csv.reader(stream)
        try:
            columns = tuple(next(reader))
        except StopIteration as exc:
            raise ArtifactValidationError(f"CSV 헤더가 없다: {path}") from exc
    if not columns or any(not column for column in columns):
        raise ArtifactValidationError(f"CSV 헤더가 올바르지 않다: {path}")
    return CsvLayout(columns=columns, newline=newline, has_bom=has_bom)


def serialize_json(data: object) -> bytes:
    return (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def _csv_value(value: object) -> object:
    return "" if value is None else value


def serialize_csv(records: Sequence[Mapping[str, object]], layout: CsvLayout) -> bytes:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(
        stream,
        fieldnames=list(layout.columns),
        extrasaction="raise",
        lineterminator=layout.newline,
    )
    writer.writeheader()
    for record in records:
        writer.writerow({column: _csv_value(record.get(column)) for column in layout.columns})
    encoding = "utf-8-sig" if layout.has_bom else "utf-8"
    return stream.getvalue().encode(encoding)


def record_key(record: Mapping[str, object]) -> tuple[str, str, str]:
    return (
        str(record.get("대학명", "")),
        str(record.get("연도", "")),
        str(record.get("학과", "")),
    )


def _index_rows(
    rows: Iterable[Mapping[str, object]],
) -> tuple[dict[tuple[str, str, str], Mapping[str, object]], int]:
    indexed: dict[tuple[str, str, str], Mapping[str, object]] = {}
    duplicates = 0
    for row in rows:
        key = record_key(row)
        if key in indexed:
            duplicates += 1
        indexed[key] = row
    return indexed, duplicates


def audit_json_csv_pair(json_path: Path, csv_path: Path) -> ParityResult:
    with json_path.open(encoding="utf-8-sig") as stream:
        json_rows = json.load(stream)
    if not isinstance(json_rows, list) or not all(isinstance(row, dict) for row in json_rows):
        raise ArtifactValidationError(f"JSON 최상위가 레코드 배열이 아니다: {json_path}")

    with csv_path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        csv_rows = list(reader)
        columns = tuple(reader.fieldnames or ())
    if not columns:
        raise ArtifactValidationError(f"CSV 헤더가 없다: {csv_path}")

    json_index, json_duplicates = _index_rows(json_rows)
    csv_index, csv_duplicates = _index_rows(csv_rows)
    json_keys = set(json_index)
    csv_keys = set(csv_index)
    value_mismatches = 0

    for key in json_keys & csv_keys:
        json_row = json_index[key]
        csv_row = csv_index[key]
        for column in columns:
            expected = "" if json_row.get(column) is None else str(json_row.get(column))
            if csv_row.get(column, "") != expected:
                value_mismatches += 1

    return ParityResult(
        json_rows=len(json_rows),
        csv_rows=len(csv_rows),
        json_only=len(json_keys - csv_keys),
        csv_only=len(csv_keys - json_keys),
        value_mismatches=value_mismatches,
        duplicate_keys=json_duplicates + csv_duplicates,
    )


def _write_stage(target: Path, payload: bytes) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        mode="wb",
        prefix=f".{target.name}.",
        suffix=".tmp",
        dir=target.parent,
        delete=False,
    )
    try:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
        return Path(handle.name)
    finally:
        handle.close()


def build_staged_artifacts(
    results_dir: Path,
    web_data_dir: Path,
    datasets: Mapping[str, Sequence[Mapping[str, object]]],
) -> dict[Path, Path]:
    standard_layout = read_csv_layout(results_dir / STANDARD.replace(".json", ".csv"))
    exception_layout = read_csv_layout(results_dir / EXCEPTION.replace(".json", ".csv"))
    payloads: dict[Path, bytes] = {}

    for name in (STANDARD, EXCEPTION, FORMULA):
        payload = serialize_json(datasets[name])
        payloads[results_dir / name] = payload
        payloads[web_data_dir / name] = payload

    payloads[results_dir / STANDARD.replace(".json", ".csv")] = serialize_csv(
        datasets[STANDARD], standard_layout
    )
    payloads[results_dir / EXCEPTION.replace(".json", ".csv")] = serialize_csv(
        datasets[EXCEPTION], exception_layout
    )

    staged: dict[Path, Path] = {}
    try:
        for target, payload in payloads.items():
            staged[target] = _write_stage(target, payload)
    except Exception:
        for path in staged.values():
            path.unlink(missing_ok=True)
        raise
    return staged


def validate_staged_artifacts(
    staged: Mapping[Path, Path],
    results_dir: Path,
    web_data_dir: Path,
) -> dict[str, ParityResult]:
    parsed: dict[tuple[str, str], object] = {}
    for directory_name, directory in (("results", results_dir), ("web", web_data_dir)):
        for name in (STANDARD, EXCEPTION, FORMULA):
            path = staged[directory / name]
            try:
                with path.open(encoding="utf-8-sig") as stream:
                    parsed[(directory_name, name)] = json.load(stream)
            except (OSError, json.JSONDecodeError) as exc:
                raise ArtifactValidationError(f"JSON 재파싱 실패: {directory / name}: {exc}") from exc

            rows = parsed[(directory_name, name)]
            if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
                raise ArtifactValidationError(f"JSON 최상위가 레코드 배열이 아니다: {directory / name}")
            _, duplicates = _index_rows(rows)
            if duplicates:
                raise ArtifactValidationError(
                    f"JSON 키 중복 {duplicates}건: {directory / name}"
                )

            if parsed[(directory_name, name)] != parsed[("results", name)]:
                raise ArtifactValidationError(f"results↔web JSON 내용 불일치: {name}")
            if hashlib.sha256(path.read_bytes()).digest() != hashlib.sha256(
                staged[results_dir / name].read_bytes()
            ).digest():
                raise ArtifactValidationError(f"results↔web JSON 해시 불일치: {name}")

    parity: dict[str, ParityResult] = {}
    for name in (STANDARD, EXCEPTION):
        result = audit_json_csv_pair(
            staged[results_dir / name],
            staged[results_dir / name.replace(".json", ".csv")],
        )
        parity[name] = result
        if not result.is_clean:
            raise ArtifactValidationError(f"JSON↔CSV parity 실패: {name}: {result}")

    return parity


def atomic_replace_artifacts(
    staged: Mapping[Path, Path],
    replace: Callable[[Path, Path], object] = os.replace,
) -> None:
    """모든 교체가 끝나지 않으면 교체 전 파일 전부를 복원한다."""
    backups: dict[Path, Path | None] = {}
    replaced: list[Path] = []
    try:
        for target in staged:
            if target.exists():
                backup = _write_stage(target, target.read_bytes())
                backups[target] = backup
            else:
                backups[target] = None

        for target, temporary in staged.items():
            replace(temporary, target)
            replaced.append(target)
    except Exception:
        restore_errors: list[str] = []
        for target, backup in backups.items():
            try:
                if backup is None:
                    if target in replaced:
                        target.unlink(missing_ok=True)
                else:
                    try:
                        os.replace(backup, target)
                    except OSError:
                        shutil.copy2(backup, target)
                        backup.unlink(missing_ok=True)
            except OSError as restore_exc:
                restore_errors.append(f"{target}: {restore_exc}")
        if restore_errors:
            raise RuntimeError("산출물 교체 실패 후 복구도 실패: " + "; ".join(restore_errors))
        raise
    finally:
        for path in staged.values():
            path.unlink(missing_ok=True)
        for backup in backups.values():
            if backup is not None:
                backup.unlink(missing_ok=True)


def save_artifact_generation(
    results_dir: Path,
    web_data_dir: Path,
    datasets: Mapping[str, Sequence[Mapping[str, object]]],
) -> dict[str, ParityResult]:
    staged = build_staged_artifacts(results_dir, web_data_dir, datasets)
    try:
        parity = validate_staged_artifacts(staged, results_dir, web_data_dir)
        atomic_replace_artifacts(staged)
        return parity
    except Exception:
        for path in staged.values():
            path.unlink(missing_ok=True)
        raise
