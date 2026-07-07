import pdfplumber

with pdfplumber.open("data/24_인천대_성적.pdf") as pdf:
    for idx, page in enumerate(pdf.pages):
        print(f"=== PAGE {idx+1} ===")
        text = page.extract_text() or ""
        lines = text.split("\n")
        print("\n".join(lines[:15]))
