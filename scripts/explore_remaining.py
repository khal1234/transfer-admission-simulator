import pdfplumber
import pandas as pd
import os

print("=== 1. 인천대 성적 탐색 ===")
incheon_path = "data/24_인천대_성적.pdf"
if os.path.exists(incheon_path):
    with pdfplumber.open(incheon_path) as pdf:
        print(f"인천대 PDF 페이지 수: {len(pdf.pages)}")
        # Check first page
        p1_text = pdf.pages[0].extract_text() or ""
        print("Page 1 first 500 chars:")
        print(p1_text[:500])
        print("...")
        # Check footnotes/formulas
        for line in p1_text.split("\n"):
            if any(k in line for k in ["배점", "환산", "공식", "토익", "TOEIC", "전적대"]):
                print("  [Note]", line.strip())
                
print("\n=== 2. 전남대 성적 탐색 ===")
jeonnam_path = "data/24_전남대_성적.pdf"
if os.path.exists(jeonnam_path):
    with pdfplumber.open(jeonnam_path) as pdf:
        print(f"전남대 PDF 페이지 수: {len(pdf.pages)}")
        p1_text = pdf.pages[0].extract_text() or ""
        print("Page 1 first 500 chars:")
        print(p1_text[:500])
        print("...")
        for line in p1_text.split("\n"):
            if any(k in line for k in ["배점", "환산", "공식", "토익", "TOEIC", "전적대"]):
                print("  [Note]", line.strip())

print("\n=== 3. 전북대 성적 탐색 ===")
jeonbuk_path = "data/24_전북대_성적.pdf"
if os.path.exists(jeonbuk_path):
    with pdfplumber.open(jeonbuk_path) as pdf:
        print(f"전북대 PDF 페이지 수: {len(pdf.pages)}")
        p1_text = pdf.pages[0].extract_text() or ""
        print("Page 1 first 500 chars:")
        print(p1_text[:500])
        print("...")
        for line in p1_text.split("\n"):
            if any(k in line for k in ["배점", "환산", "공식", "토익", "TOEIC", "전적대"]):
                print("  [Note]", line.strip())

print("\n=== 4. 충남대 성적 탐색 ===")
chungnam_path = "data/24_충남대_성적.xlsx"
if os.path.exists(chungnam_path):
    xls = pd.ExcelFile(chungnam_path)
    print(f"충남대 시트 목록: {xls.sheet_names}")
    for sheet in xls.sheet_names[:2]:
        df = pd.read_excel(chungnam_path, sheet_name=sheet)
        print(f"  시트 [{sheet}] 크기: {df.shape}")
        print("  시트 헤더:", df.columns.tolist()[:8])
        print("  상위 3행:")
        print(df.head(3).to_string())

print("\n=== 5. 충북대 성적 탐색 ===")
chungbuk_path = "data/24_충북대_성적.pdf"
if os.path.exists(chungbuk_path):
    with pdfplumber.open(chungbuk_path) as pdf:
        print(f"충북대 PDF 페이지 수: {len(pdf.pages)}")
        p1_text = pdf.pages[0].extract_text() or ""
        print("Page 1 first 500 chars:")
        print(p1_text[:500])
        print("...")
        for line in p1_text.split("\n"):
            if any(k in line for k in ["배점", "환산", "공식", "토익", "TOEIC", "전적대"]):
                print("  [Note]", line.strip())
