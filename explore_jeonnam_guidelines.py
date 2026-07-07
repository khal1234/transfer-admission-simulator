import pdfplumber

guideline_path = "data/24_전남대_모집요강.pdf"
with pdfplumber.open(guideline_path) as pdf:
    print(f"전남대 모집요강 페이지 수: {len(pdf.pages)}")
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        if "배점" in text or "전형요소" in text:
            print(f"Page {i+1} might contain weights:")
            for line in text.split("\n"):
                if any(k in line for k in ["일반편입", "배점", "영어", "토익", "TOEIC", "전적대"]):
                    print(f"  {line.strip()}")
