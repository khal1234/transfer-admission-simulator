import pdfplumber

with pdfplumber.open("data/24_전남대_성적.pdf") as pdf:
    for idx, page in enumerate(pdf.pages):
        for line in page.extract_text().split("\n"):
            line_str = line.strip()
            if line_str.startswith("일반편입"):
                # Search for arts, sports, music, etc. or college names
                if any(k in line_str for k in ["예술", "체육", "스포츠", "음악", "미술", "디자인"]):
                    print(f"[Page {idx+1}] {line_str}")
