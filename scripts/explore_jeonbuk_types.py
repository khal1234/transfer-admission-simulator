import pdfplumber

with pdfplumber.open("data/24_전북대_성적.pdf") as pdf:
    for idx, page in enumerate(pdf.pages, start=1):
        table = page.extract_tables()[0]
        # Check first column values
        val_0_list = [row[0] for row in table if row[0] is not None]
        print(f"Page {idx}: First column unique values: {set(val_0_list)}")
