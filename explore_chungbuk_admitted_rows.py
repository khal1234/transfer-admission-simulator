import pdfplumber

with pdfplumber.open("data/24_충북대_합격자.pdf") as pdf:
    for page_idx, page in enumerate(pdf.pages, start=1):
        print(f"=== PAGE {page_idx} ===")
        table = page.extract_tables()[0]
        # Skip row 0 and 1 which are headers, and check row 2 and 3 which are also sub-headers
        # We start from row index representing departments (typically index 4)
        for r_idx, row in enumerate(table):
            if r_idx < 4:
                continue
            dept = row[1]
            if not dept or dept.endswith("계"):
                continue
            dept = dept.replace("\n", "").strip()
            recruit = row[2]
            app = row[3]
            registered = row[5]
            print(f"  Row {r_idx}: {row[0]} | {dept} | 모집: {recruit} | 지원: {app} | 최종등록: {registered}")
