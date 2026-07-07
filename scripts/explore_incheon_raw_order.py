import pdfplumber

with pdfplumber.open("data/24_인천대_성적.pdf") as pdf:
    for idx, page in enumerate(pdf.pages):
        print(f"=== PAGE {idx+1} ===")
        text = page.extract_text() or ""
        for line in text.split("\n"):
            print(line)
