import pdfplumber

with pdfplumber.open("data/24_충북대_합격자.pdf") as pdf:
    print(f"충북대 합격자 PDF 페이지 수: {len(pdf.pages)}")
    for i in range(min(3, len(pdf.pages))):
        print(f"\n=== PAGE {i+1} ===")
        text = pdf.pages[i].extract_text() or ""
        print(text[:800])
        tables = pdf.pages[i].extract_tables()
        print(f"Found {len(tables)} tables on Page {i+1}")
        for t_idx, t in enumerate(tables, start=1):
            print(f"  Table {t_idx} has {len(t)} rows, {len(t[0]) if t else 0} columns")
            print(f"  Header of Table {t_idx}: {t[0] if t else None}")
            for r_idx, row in enumerate(t[:5]):
                print(f"    [{r_idx}] {row}")
