import pdfplumber

with pdfplumber.open("data/24_경북대_성적.pdf") as pdf:
    for idx, page in enumerate(pdf.pages, start=1):
        text = page.extract_text() or ""
        print(f"=== PAGE {idx} ===")
        for line in text.split('\n'):
            line_str = line.strip()
            if line_str.startswith("일반편입"):
                # Split and check values
                parts = line_str.split()
                # If there are 11 values or if the 10th value represents a non-empty practical test score (실기성적)
                # Let's print the row to examine
                print(parts)
