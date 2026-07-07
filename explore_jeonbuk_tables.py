import pdfplumber

with pdfplumber.open("data/24_전북대_성적.pdf") as pdf:
    for idx, page in enumerate(pdf.pages, start=1):
        tables = page.extract_tables()
        print(f"=== PAGE {idx}: Found {len(tables)} tables ===")
        for t_idx, t in enumerate(tables, start=1):
            print(f"  Table {t_idx} has {len(t)} rows, {len(t[0]) if t else 0} columns")
            print(f"  Header of Table {t_idx}: {t[0] if t else None}")
            for r_idx, row in enumerate(t[:5]):
                print(f"    [{r_idx}] {row}")
