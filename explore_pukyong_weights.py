import pandas as pd

excel_path = "data/24_부경대_성적.xlsx"
df = pd.read_excel(excel_path, sheet_name="일반편입 평균성적 현황")

for idx, row in df.iterrows():
    dept = row['모집단위']
    if pd.isna(dept):
        continue
    # If it is design, sports, art, etc.
    dept_str = str(dept).strip()
    if any(k in dept_str for k in ["디자인", "스포츠", "예술", "체육", "음악", "미술"]):
        print(f"[{idx}] {dept_str} | GPA: {row.iloc[6]} | Interview: {row.iloc[7]} | TOEIC: {row.iloc[8]} / {row.iloc[9]} | Note: {row.iloc[10]}")
