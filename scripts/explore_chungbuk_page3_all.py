import pdfplumber
import re

with pdfplumber.open("data/24_충북대_성적.pdf") as pdf:
    # Page 3 is index 2
    text = pdf.pages[2].extract_text() or ""
    print("=== PAGE 3 ALL LINES ===")
    for line in text.split("\n"):
        print(line)
