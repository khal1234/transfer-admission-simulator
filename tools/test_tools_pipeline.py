import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


TOOLS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS_DIR))

import apply_fixes  # noqa: E402
import derive_formulas  # noqa: E402
import extract_spreadsheets  # noqa: E402
from data_artifacts import (  # noqa: E402
    EXCEPTION,
    FORMULA,
    STANDARD,
    atomic_replace_artifacts,
    build_staged_artifacts,
    save_artifact_generation,
)
from extract_spreadsheets import extract_all, make_record  # noqa: E402


def sample_record(university="테스트대학교", year="2026", department="기계공학과"):
    return {
        "대학명": university,
        "연도": year,
        "학과": department,
        "학과_원본명": department,
        "모집인원": 2,
        "지원인원": 10,
        "합격인원": 2,
        "최종합격_토익환산점수": 50.5,
        "최종합격_토익원점수": 800.0,
        "최종합격_학점환산점수": 40.0,
        "최종합격_학점원점수_100점만점": 90.0,
        "비고": None,
        "합격자기준": "최종",
    }


class ExtractionFailureTests(unittest.TestCase):
    def test_pukyong_gpa_column_is_published_converted_score(self):
        rows = [
            ["대학명", "모집단위", "모집인원", "지원인원", "등록인원"],
            ["인문사회과학대학", "국어국문학과", 3, 14, 3, 0, 97.71, 135.33,
             753.33, 152.19],
        ]
        with mock.patch.object(extract_spreadsheets, "read_xlsx_rows", return_value=rows):
            record = extract_spreadsheets.extract_pukyong("2024")[0]

        self.assertEqual(record["최종합격_학점환산점수"], 97.71)
        self.assertIsNone(record["최종합격_학점원점수_100점만점"])
        self.assertEqual(record["최종합격_토익원점수"], 753.33)
        self.assertEqual(record["최종합격_토익환산점수"], 152.19)

    def test_records_and_failures_are_separate_and_only_success_is_covered(self):
        good = lambda year: [make_record("성공대학교", year, "기계공학과")]

        def missing_dependency(_year):
            raise ModuleNotFoundError("No module named 'openpyxl'")

        def missing_source(_year):
            raise FileNotFoundError("missing.xlsx")

        result = extract_all([
            ("성공대학교", "2026", good),
            ("의존성대학교", "2026", missing_dependency),
            ("원본대학교", "2026", missing_source),
        ])

        self.assertEqual(len(result.records), 1)
        self.assertEqual(result.covered, {("성공대학교", "2026")})
        self.assertEqual(
            [failure.error_type for failure in result.failures],
            ["ModuleNotFoundError", "FileNotFoundError"],
        )

    def test_zero_rows_and_schema_errors_are_failures(self):
        result = extract_all([
            ("빈대학교", "2026", lambda _year: []),
            ("손상대학교", "2026", lambda _year: [{"대학명": "손상대학교"}]),
        ])

        self.assertEqual(result.records, [])
        self.assertEqual(result.covered, set())
        self.assertEqual(len(result.failures), 2)
        self.assertEqual(result.failures[0].error_type, "ValueError")


class ArtifactGenerationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.results = root / "results"
        self.web = root / "web"
        self.results.mkdir()
        self.web.mkdir()
        self.standard_columns = tuple(sample_record().keys())
        exception = sample_record()
        exception.pop("비고")
        exception["제거사유"] = "별도 전형"
        self.exception = exception

        for name, columns, newline in (
            (STANDARD, self.standard_columns, "\n"),
            (EXCEPTION, tuple(exception.keys()), "\r\n"),
        ):
            csv_path = self.results / name.replace(".json", ".csv")
            csv_path.write_bytes(
                b"\xef\xbb\xbf" + (",".join(columns) + newline).encode("utf-8")
            )

        old = [{"old": True}]
        for directory in (self.results, self.web):
            for name in (STANDARD, EXCEPTION, FORMULA):
                (directory / name).write_text(json.dumps(old), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def datasets(self):
        return {
            STANDARD: [sample_record()],
            EXCEPTION: [self.exception],
            FORMULA: [{"대학명": "테스트대학교", "연도": "2026"}],
        }

    def test_atomic_save_preserves_csv_layout_and_validates_parity(self):
        parity = save_artifact_generation(self.results, self.web, self.datasets())

        standard_csv = (self.results / STANDARD.replace(".json", ".csv")).read_bytes()
        exception_csv = (self.results / EXCEPTION.replace(".json", ".csv")).read_bytes()
        self.assertTrue(standard_csv.startswith(b"\xef\xbb\xbf"))
        self.assertNotIn(b"\r\n", standard_csv)
        self.assertIn(b"\r\n", exception_csv)
        self.assertTrue(parity[STANDARD].is_clean)
        self.assertTrue(parity[EXCEPTION].is_clean)
        for name in (STANDARD, EXCEPTION, FORMULA):
            self.assertEqual(
                (self.results / name).read_bytes(),
                (self.web / name).read_bytes(),
            )

    def test_replacement_failure_restores_every_original_file(self):
        staged = build_staged_artifacts(self.results, self.web, self.datasets())
        originals = {
            target: target.read_bytes()
            for target in staged
        }
        calls = 0

        def fail_once(source, target):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("injected replacement failure")
            return os.replace(source, target)

        with self.assertRaisesRegex(OSError, "injected"):
            atomic_replace_artifacts(staged, replace=fail_once)

        for target, content in originals.items():
            self.assertEqual(target.read_bytes(), content)


class ApplyFixesFailClosedTests(unittest.TestCase):
    def test_dry_run_does_not_save_when_extraction_failed(self):
        with (
            mock.patch.object(apply_fixes, "index_extracted", side_effect=RuntimeError("missing")),
            mock.patch.object(apply_fixes, "save_artifact_generation") as save,
            mock.patch.object(sys, "argv", ["apply_fixes.py", "--dry-run"]),
            mock.patch("sys.stderr", new_callable=io.StringIO),
        ):
            self.assertEqual(apply_fixes.main(), 1)
        save.assert_not_called()


class FormulaAuditTests(unittest.TestCase):
    def test_pukyong_2026_english_is_not_reported_as_a_simple_match(self):
        records = json.loads(
            (apply_fixes.RESULTS_DIR / STANDARD).read_text(encoding="utf-8-sig")
        )
        formulas = json.loads(
            (apply_fixes.RESULTS_DIR / FORMULA).read_text(encoding="utf-8-sig")
        )
        points = [
            (float(row["최종합격_토익원점수"]), float(row["최종합격_토익환산점수"]))
            for row in records
            if row["대학명"] == "부경대학교"
            and row["연도"] == "2026"
            and row["최종합격_토익원점수"] is not None
            and row["최종합격_토익환산점수"] is not None
        ]
        formula = next(
            row for row in formulas
            if row["대학명"] == "부경대학교" and row["연도"] == "2026"
        )
        slope, intercept, r2, max_res = derive_formulas.linear_fit(points)
        verdict, conflict = derive_formulas.classify_verdict(
            formula,
            "영어",
            200,
            slope * derive_formulas.TOEIC_MAX + intercept,
            "만점환산",
            r2,
            max_res,
        )

        # 실기형(영어 100점)까지 지원 데이터로 복원했으므로 대표 200점식에
        # 전체 학과를 한꺼번에 맞추면 혼합 프로필이 더 분명하게 드러난다.
        self.assertAlmostEqual(r2, 0.7736, places=4)
        self.assertAlmostEqual(max_res, 66.069, places=3)
        self.assertTrue(conflict)
        self.assertIn("비선형/혼합 의심", verdict)
        self.assertNotIn("일치", verdict)

    def test_piecewise_formula_is_separated_from_general_mismatch(self):
        documented = {
            "공인영어_환산공식": {"공식유형": "구간식"},
            "전적대성적_환산공식": {"공식유형": None},
        }
        verdict, conflict = derive_formulas.classify_verdict(
            documented, "영어", 60, 60, "만점환산", 0.98, 3.0
        )

        self.assertFalse(conflict)
        self.assertIn("구간식 특성", verdict)
        self.assertNotIn("일치", verdict)


if __name__ == "__main__":
    unittest.main()
