"""PDF 성적 자료에서 합격자 성적을 다시 뽑는다. 읽기 전용(파일을 쓰지 않는다).

스프레드시트 10칸은 `extract_spreadsheets.py` 가 맡고, 여기는 나머지 17칸이다.
  강원대-부산대-인천대-전남대-충북대 각 3개년, 경북대 2024, 전북대 2024.

설계 원칙은 스프레드시트 쪽과 같다.
  - 열 번호를 박지 않고 **헤더 글자로 찾는다**. 연도마다 구성이 바뀐다.
  - 병합셀은 앞 값을 이어받는다(전형구분-대학-캠퍼스).
  - **원본이 싣지 않은 값은 만들지 않는다.** 어떤 대학은 TOEIC 원점수를,
    어떤 대학은 환산점수만 싣는다. 없는 쪽은 None 으로 둔다.

PDF 고유의 함정이 하나 더 있다. 학과명이 셀 폭을 넘치면 옆 칸으로 흘러넘쳐
행 전체가 밀린다(실측: 경북대 2024 농업토목ㆍ생물산업공학부 2건이 그렇게
'2', '4' 라는 학과로 results 에 들어갔다). 이런 행은 **고쳐서 통과시키지 않고
의심 행으로 따로 보고한다** — 자동 교정은 조용히 틀릴 수 있어서다.

    python tools/extract_pdfs.py
    python tools/extract_pdfs.py --suspect   # 의심 행만
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract_spreadsheets import make_record, normalize_name  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


def squash(value):
    return re.sub(r"\s+", "", str(value)) if value is not None else ""


def to_number(value):
    """숫자만. 빈칸-'-'-0 은 값 없음으로 본다."""
    if value is None:
        return None
    text = squash(value).replace(",", "")
    if text in ("", "-", "–", "—"):
        return None
    if not re.fullmatch(r"-?\d+(\.\d+)?", text):
        return None
    number = float(text)
    return None if number == 0 else number


def to_count(value):
    if value is None:
        return None
    text = squash(value).replace(",", "")
    if text in ("", "-", "–", "—"):
        return None
    if not re.fullmatch(r"-?\d+(\.\d+)?", text):
        return None
    return int(float(text))


def read_tables(path):
    """pdfplumber 로 표를 읽고, 실패하면 pymupdf 로 넘어간다.

    강원대 모집요강처럼 폰트 딕셔너리가 깨진 PDF에서 pdfminer 가 예외로 죽는다.
    """
    try:
        import pdfplumber

        tables = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                tables.extend(page.extract_tables())
        if tables:
            return tables
    except Exception as exc:  # noqa: BLE001
        print(f"   pdfplumber 실패({exc.__class__.__name__}) → pymupdf 로 전환",
              file=sys.stderr)

    import pymupdf

    tables = []
    doc = pymupdf.open(path)
    for page in doc:
        for table in page.find_tables().tables:
            tables.append(table.extract())
    doc.close()
    return tables


# ── 대학별 사양 ───────────────────────────────────────────────
# labels: 필드 -> 헤더에서 찾을 글자(공백 제거 후 '시작하는지'로 판정)
# raw/conv: 그 대학이 원점수를 싣는지 환산점수를 싣는지 — 없는 쪽은 만들지 않는다.

SPECS = {
    "강원대학교": {
        "file": "{yy}_강원대_성적.pdf",
        "years": ["2024", "2025", "2026"],
        "type_labels": ["전형구분"],
        "type_keep": "일반편입",
        "type_column": 0,
        # 2024는 헤더 첫 줄이 병합돼 '모집단위명' 이 독립 셀로 안 잡힌다.
        "unit_column": 2,
        "labels": {
            "unit": ["모집단위명", "모집단위"],
            "recruit": ["모집인원"],
            "applied": ["지원인원"],
            "enrolled": ["최종등록인원", "등록인원"],
            # 2024는 '성적'(환산)과 '변환'(원점수)을 나란히 싣는다.
            # 2025-2026은 '성적' 한 열뿐이고 그 값이 원점수다.
            "english_conv": ["공인영어성적"],
            "english_raw": ["공인영어변환"],
            "gpa_conv": ["전적대학성적"],
            "gpa_raw": ["전적대학변환"],
        },
        "english_is_raw": True,
        "gpa_is_raw": True,
    },
    "부산대학교": {
        "file": "{yy}_부산대_성적.pdf",
        "years": ["2024", "2025", "2026"],
        "type_labels": [],
        "type_keep": None,
        "labels": {
            "unit": ["모집단위"],
            "recruit": ["모집인원"],
            "applied": ["지원인원"],
            "enrolled": ["합격인원"],
            "english": ["공인영어성적", "공인영어"],
            "gpa": ["대학성적"],
        },
        "english_is_raw": True,
        "gpa_is_raw": True,
    },
    "인천대학교": {
        "file": "{yy}_인천대_성적.pdf",
        "years": ["2024", "2025", "2026"],
        "type_labels": [],
        "type_keep": None,
        "header_depth": 3,
        "labels": {
            "unit": ["모집단위"],
            "recruit": ["모집인원"],
            "applied": ["지원인원"],
            "enrolled": [],
            "english": ["최종합격자토익점수평균", "토익점수평균", "TOEIC성적", "TOEIC"],
            "gpa": [],
        },
        "english_is_raw": True,
        "gpa_is_raw": True,
    },
    "전남대학교": {
        "file": "{yy}_전남대_성적.pdf",
        "years": ["2024", "2025", "2026"],
        "type_labels": ["전형구분"],
        "type_keep": "일반편입",
        "labels": {
            "unit": ["모집단위"],
            "recruit": ["모집인원"],
            "applied": ["지원자수", "지원인원"],
            "enrolled": ["등록자수", "등록인원"],
            "english": ["TOEIC"],
            "gpa": ["전적대학"],
        },
        "english_is_raw": True,
        "gpa_is_raw": True,
        "campus_labels": ["캠퍼스"],
    },
    "충북대학교": {
        "file": "{yy}_충북대_성적.pdf",
        "years": ["2024", "2025", "2026"],
        "type_labels": ["편입유형"],
        "type_keep": "일반편입",
        "header_depth": 1,
        "labels": {
            "unit": ["모집단위"],
            "recruit": [],
            "applied": [],
            "enrolled": [],
            "english": ["공인영어성적", "공인영어"],
            "gpa": ["전적대학성적", "학점"],
        },
        "english_is_raw": False,   # 60점 만점 환산점수를 싣는다
        "gpa_is_raw": False,
    },
    "경북대학교": {
        "file": "{yy}_경북대_성적.pdf",
        "years": ["2024"],
        "type_labels": ["전형구분"],
        "type_keep": "일반편입",
        "labels": {
            "unit": ["모집단위"],
            "recruit": ["모집인원"],
            "applied": ["지원인원"],
            "enrolled": ["입학인원"],
            "english": ["공인영어"],
            "gpa": ["전적대학성적"],
        },
        "english_is_raw": False,   # 환산점수(100점 만점)
        "gpa_is_raw": False,
    },
    "전북대학교": {
        "file": "{yy}_전북대_성적.pdf",
        "years": ["2024"],
        "type_labels": ["전형구분"],
        "type_keep": "일반편입",
        "header_depth": 1,
        "labels": {
            "unit": ["모집단위"],
            "recruit": ["모집인원"],
            "applied": ["지원인원"],
            "enrolled": ["등록인원"],
            "english": ["토익점수평균", "토익"],
            "gpa": ["전적대학성적", "전적대학"],
        },
        "english_is_raw": True,
        "gpa_is_raw": True,
    },
}


def resolve_columns(table, spec):
    """헤더 행을 찾아 {필드: 열번호} 를 만든다. 못 찾으면 None."""
    wanted = dict(spec["labels"])
    if spec.get("campus_labels"):
        wanted["campus"] = spec["campus_labels"]
    if spec.get("type_labels"):
        wanted["type"] = spec["type_labels"]

    for i, row in enumerate(table[:6]):
        texts = [squash(c) for c in row]
        # 헤더 후보: '모집단위' 가 보이거나, 인원 열 이름이 나란히 있는 행.
        # 강원대 2024는 헤더 첫 줄이 통째로 병합돼 '모집단위명' 이 독립 셀로
        # 잡히지 않는다. 그래서 '모집인원'+'지원인원' 도 헤더 신호로 본다.
        is_header = (
            any("모집단위" in t for t in texts)
            or (any(t.startswith("모집인원") for t in texts)
                and any(t.startswith("지원인원") for t in texts))
        )
        if not is_header:
            continue

        found = {}
        # 헤더가 세 줄까지 겹치는 표가 있다(인천대: 대분류-중분류-실제 열이름).
        for offset in (0, 1, 2):
            if i + offset >= len(table):
                break
            for j, c in enumerate(table[i + offset]):
                text = squash(c)
                if not text:
                    continue
                for field, labels in wanted.items():
                    if field in found:
                        continue
                    for label in labels:
                        if text.startswith(squash(label)):
                            found[field] = j
                            break

        if "unit" not in found and spec.get("unit_column") is not None:
            found["unit"] = spec["unit_column"]
        # 강원대 2024는 '전형구분'이 병합된 헤더 문구 안에 묻혀 독립 셀로 안 잡힌다.
        # 못 찾으면 전형 필터가 통째로 죽어 학사편입이 섞여 들어간다.
        if "type" not in found and spec.get("type_column") is not None:
            found["type"] = spec["type_column"]

        if "unit" in found:
            # 헤더가 몇 줄인지는 표마다 다르다(충북대 1줄, 인천대 2026은 3줄,
            # 같은 인천대라도 2024는 2줄이다). 고정하면 데이터 첫 줄을 먹거나
            # 헤더를 데이터로 읽는다. 그래서 '학과명 칸에 진짜 이름이 나오는
            # 첫 줄'을 찾아 거기서부터 데이터로 본다.
            unit_col = found["unit"]
            last_header = i
            for k in range(i, min(i + 4, len(table))):
                cell_text = squash(table[k][unit_col]) if unit_col < len(table[k]) else ""
                if cell_text and not any(
                    word in cell_text for word in
                    ("모집단위", "학과(부)", "지원현황", "구분", "평균")
                ):
                    last_header = k - 1
                    break
                last_header = k
            return found, last_header

    return None, None


def looks_shifted(row, cols):
    """셀 넘침으로 행이 밀렸는지 본다.

    ⑴ 학과명 칸이 숫자뿐이거나 한 글자다.
    ⑵ 숫자여야 할 칸에 글자가 섞여 있다('공 4' 처럼).
    """
    unit = squash(row[cols["unit"]]) if cols["unit"] < len(row) else ""
    if unit.isdigit() or len(unit) <= 1:
        return True

    for field in ("recruit", "applied", "enrolled"):
        j = cols.get(field)
        if j is None or j >= len(row):
            continue
        text = squash(row[j])
        if text and not re.fullmatch(r"-?\d+(\.\d+)?|[-–—]", text):
            return True

    return False


def extract_one(univ, year, spec):
    path = DATA_DIR / spec["file"].format(yy=year[2:])
    if not path.exists():
        return [], [f"{year} {univ}: 원본 파일 없음 ({path.name})"]

    tables = read_tables(path)
    records = []
    suspects = []
    carried = {}

    for table in tables:
        cols, header_row = resolve_columns(table, spec)
        if cols is None:
            continue

        for row in table[header_row + 1:]:
            if cols["unit"] >= len(row):
                continue

            # 병합셀 이어받기
            for field in ("type", "campus"):
                j = cols.get(field)
                if j is None or j >= len(row):
                    continue
                text = squash(row[j])
                if text:
                    carried[field] = text

            unit = row[cols["unit"]]
            unit_text = str(unit).strip() if unit else ""
            if not unit_text or squash(unit_text).startswith("모집단위"):
                continue

            # 전형 필터가 걸린 대학인데 아직 구분을 못 읽었으면 넣지 않는다.
            # 예전에는 비어 있으면 통과시켰는데, 그 탓에 헤더를 잘못 세어
            # 구분이 안 잡힌 표가 통째로 섞여 들어갔다(강원대-전북대 2024).
            keep = spec.get("type_keep")
            if keep and keep not in carried.get("type", ""):
                continue

            if looks_shifted(row, cols):
                suspects.append((year, univ, [
                    "" if c is None else str(c).replace("\n", "/") for c in row
                ]))
                continue

            def value(field, caster):
                j = cols.get(field)
                if j is None or j >= len(row):
                    return None
                return caster(row[j])

            # '성적'과 '변환'이 둘 다 있으면 각각 환산-원점수다.
            # 하나뿐이면 그 대학이 무엇을 싣는지(english_is_raw)로 정한다.
            if "english_raw" in cols:
                english_raw = value("english_raw", to_number)
                english_conv = value("english_conv", to_number)
            else:
                single = value("english_conv", to_number) or value("english", to_number)
                english_raw = single if spec["english_is_raw"] else None
                english_conv = None if spec["english_is_raw"] else single

            if "gpa_raw" in cols:
                gpa_raw = value("gpa_raw", to_number)
                gpa_conv = value("gpa_conv", to_number)
            else:
                single = value("gpa_conv", to_number) or value("gpa", to_number)
                gpa_raw = single if spec["gpa_is_raw"] else None
                gpa_conv = None if spec["gpa_is_raw"] else single

            records.append(make_record(
                univ, year, unit_text,
                모집인원=value("recruit", to_count),
                지원인원=value("applied", to_count),
                합격인원=value("enrolled", to_count),
                최종합격_토익원점수=english_raw,
                최종합격_토익환산점수=english_conv,
                최종합격_학점원점수_100점만점=gpa_raw,
                최종합격_학점환산점수=gpa_conv,
                캠퍼스=carried.get("campus"),
            ))

    # 같은 모집단위가 두 번 나오면 뒤엣것은 다른 전형(학사편입 등)이 새어든
    # 것이다. 전북대 2024는 학사편입 구간 표시가 마지막 쪽에만 렌더링돼서
    # 앞쪽 학사편입 페이지가 일반편입으로 넘어온다. 앞 것을 남기고 뒤엣것은
    # 의심 행으로 돌린다 — 어느 쪽이 맞는지 기계가 단정하지 않는다.
    seen = set()
    deduped = []
    for record in records:
        key = record["학과_정규화"]
        if key in seen:
            suspects.append((year, univ, [
                f"중복 모집단위 '{record['학과_원본명']}'",
                f"모집 {record['모집인원']}",
                f"지원 {record['지원인원']}",
                f"합격 {record['합격인원']}",
            ]))
            continue
        seen.add(key)
        deduped.append(record)

    return deduped, suspects


def extract_all_pdfs():
    records = []
    suspects = []
    for univ, spec in SPECS.items():
        for year in spec["years"]:
            got, bad = extract_one(univ, year, spec)
            records.extend(got)
            suspects.extend(bad if isinstance(bad[0] if bad else "", str) else [])
            if bad and not isinstance(bad[0], str):
                suspects.extend(bad)
    return records, suspects


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    all_records = []
    all_suspects = []
    for univ, spec in SPECS.items():
        for year in spec["years"]:
            records, suspects = extract_one(univ, year, spec)
            all_records.extend(records)
            all_suspects.extend(suspects)

    if "--suspect" in sys.argv:
        print(f"=== 의심 행 {len(all_suspects)}건 ===")
        for item in all_suspects:
            if isinstance(item, str):
                print(" -", item)
            else:
                year, univ, cells = item
                print(f" - {year} {univ}: " + " | ".join(
                    f"[{j}]{c}" for j, c in enumerate(cells)))
        return

    from collections import Counter

    counts = Counter((r["대학명"], r["연도"]) for r in all_records)
    print("{:<10}{:<6}{:>7}{:>9}{:>10}{:>9}{:>10}".format(
        "대학", "연도", "레코드", "토익원", "토익환산", "학점원", "학점환산"))
    print("-" * 61)
    for key in sorted(counts):
        rows = [r for r in all_records if (r["대학명"], r["연도"]) == key]

        def filled(field):
            return sum(1 for r in rows if r.get(field) is not None)

        print("{:<10}{:<6}{:>7}{:>9}{:>10}{:>9}{:>10}".format(
            key[0].replace("대학교", "대"), key[1], len(rows),
            filled("최종합격_토익원점수"), filled("최종합격_토익환산점수"),
            filled("최종합격_학점원점수_100점만점"), filled("최종합격_학점환산점수"),
        ))

    print()
    print(f"합계 {len(all_records)}건 / {len(counts)}칸 / 의심 행 {len(all_suspects)}건")
    if all_suspects:
        print("의심 행은 `--suspect` 로 본다. 자동 교정하지 않는다.")


if __name__ == "__main__":
    main()
