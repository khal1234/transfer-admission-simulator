import json
import csv
import os
import pdfplumber
import pandas as pd

def round_val(v):
    if v is None:
        return None
    try:
        return round(float(v), 2)
    except (ValueError, TypeError):
        return None

def parse_int(v):
    if v is None:
        return None
    try:
        return int(float(str(v).replace(",", "")))
    except (ValueError, TypeError):
        return None

print("Starting reprocess and sort with exceptions isolation...")

# =========================================================================
# A. Process 경북대학교 (2024학년도)
# =========================================================================
kyungpook_records = []
with pdfplumber.open("data/24_경북대_성적.pdf") as pdf:
    # We re-extract to ensure maximum freshness
    # 24_경북대_성적 has 4 pages
    # Let's use the exact parsing rules from Chapter 1 but implemented programmatically
    # Standard general transfer formula:
    # TOEIC_orig = TOEIC_conv * 990 / 100
    # GPA_orig = (GPA_conv - 30) * 100 / 20 = (GPA_conv - 30) * 5
    for page in pdf.pages:
        text = page.extract_text() or ""
        for line in text.split("\n"):
            line_str = line.strip()
            if line_str.startswith("일반편입"):
                parts = line_str.split()
                # Row format on Page 1 & 2 & 3 & 4:
                # parts[0]: 전형구분 ('일반편입')
                # parts[1]: 대학 ('인문대학' 등)
                # parts[2]: 모집단위 ('국어국문학과' 등)
                # parts[3]: 모집인원
                # parts[4]: 지원인원
                # parts[5]: 입학인원 (합격인원)
                # parts[6]: 경쟁률 (e.g. '1:3.2')
                # parts[7]: 공인영어환산 (float-like)
                # parts[8]: 전적대학성적환산 (float-like)
                # parts[9]: 면접성적 (float-like)
                # parts[10]: 만약 예체능이라면 실기성적, 아니면 총점!
                
                dept = parts[2].strip()
                recruit = parse_int(parts[3])
                app = parse_int(parts[4])
                passed = parse_int(parts[5])
                
                toeic_conv = round_val(parts[7])
                gpa_conv = round_val(parts[8])
                
                # Inverse calculation
                toeic_orig = round_val(toeic_conv * 990 / 100) if toeic_conv is not None else None
                gpa_orig = round_val((gpa_conv - 30) * 5) if gpa_conv is not None else None
                
                kyungpook_records.append({
                    "대학명": "경북대학교",
                    "연도": "2024",
                    "학과": dept,
                    "모집인원": recruit,
                    "지원인원": app,
                    "합격인원": passed,
                    "최종합격_토익환산점수": toeic_conv,
                    "최종합격_토익원점수": toeic_orig,
                    "최종합격_학점환산점수": gpa_conv,
                    "최종합격_학점원점수_100점만점": gpa_orig
                })

# =========================================================================
# B. Process 강원대학교 (2024학년도)
# =========================================================================
kangwon_records = []
with pdfplumber.open("data/24_강원대_성적.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text() or ""
        for line in text.split('\n'):
            line_str = line.strip()
            if line_str.startswith("일반편입학"):
                parts = line_str.split()
                if len(parts) < 12:
                    continue
                
                if parts[1].startswith("문화예술·공과대학"):
                    college = "문화예술·공과대학"
                    dept = parts[1].replace("문화예술·공과대학", "")
                    shift = -1
                else:
                    college = parts[1]
                    dept = parts[2]
                    shift = 0
                
                dept = dept.replace("5년제", "오년제").strip()
                
                recruit = parse_int(parts[3 + shift])
                applicants = parse_int(parts[4 + shift])
                registered = parse_int(parts[6 + shift])
                
                toeic_conv_str = parts[8 + shift]
                toeic_orig_str = parts[9 + shift]
                gpa_conv_str = parts[10 + shift]
                gpa_orig_str = parts[11 + shift]
                
                def parse_str_val(v_str):
                    if v_str in ["비공개", "해당없음", "-", "nan", ""]:
                        return None
                    return round_val(v_str)
                
                toeic_conv = parse_str_val(toeic_conv_str)
                toeic_orig = parse_str_val(toeic_orig_str)
                gpa_conv = parse_str_val(gpa_conv_str)
                gpa_orig = parse_str_val(gpa_orig_str)
                
                kangwon_records.append({
                    "대학명": "강원대학교",
                    "연도": "2024",
                    "학과": dept,
                    "모집인원": recruit,
                    "지원인원": applicants,
                    "합격인원": registered,
                    "최종합격_토익환산점수": toeic_conv,
                    "최종합격_토익원점수": toeic_orig,
                    "최종합격_학점환산점수": gpa_conv,
                    "최종합격_학점원점수_100점만점": gpa_orig
                })

# =========================================================================
# C. Process 부경대학교 (2024학년도)
# =========================================================================
pukyong_records = []
df_pukyong = pd.read_excel("data/24_부경대_성적.xlsx", sheet_name="일반편입 평균성적 현황")
for idx in range(1, len(df_pukyong)):
    row = df_pukyong.iloc[idx]
    dept = row['모집단위']
    if pd.isna(dept):
        continue
        
    recruit = parse_int(row['모집\n인원'])
    if recruit is None:
        continue
        
    app = parse_int(row['지원\n인원'])
    reg = parse_int(row['등록\n인원'])
    
    gpa_conv_raw = row['2024학년도 일반편입(최종등록자)']
    toeic_orig_raw = row['Unnamed: 8']
    toeic_conv_raw = row['Unnamed: 9']
    
    gpa_conv = round_val(gpa_conv_raw) if pd.notna(gpa_conv_raw) else None
    toeic_orig = round_val(toeic_orig_raw) if pd.notna(toeic_orig_raw) else None
    toeic_conv = round_val(toeic_conv_raw) if pd.notna(toeic_conv_raw) else None
    gpa_orig = gpa_conv
    
    pukyong_records.append({
        "대학명": "부경대학교",
        "연도": "2024",
        "학과": str(dept).strip(),
        "모집인원": recruit,
        "지원인원": app,
        "합격인원": reg,
        "최종합격_토익환산점수": toeic_conv,
        "최종합격_토익원점수": toeic_orig,
        "최종합격_학점환산점수": gpa_conv,
        "최종합격_학점원점수_100점만점": gpa_orig
    })

# =========================================================================
# D. Process 부산대학교 (2024학년도)
# =========================================================================
pusan_records = []
with pdfplumber.open("data/24_부산대_성적.pdf") as pdf:
    pages_to_extract = [(0, 1), (1, 0), (2, 0)]
    for page_idx, table_idx in pages_to_extract:
        table = pdf.pages[page_idx].extract_tables()[table_idx]
        for row in table[1:]:
            dept = row[1]
            if not dept:
                continue
            dept = dept.replace("\n", "").strip()
            
            recruit = parse_int(row[2])
            app = parse_int(row[3])
            passed = parse_int(row[4])
            
            gpa_orig_str = row[5]
            toeic_orig_str = row[6]
            
            def parse_pusan_val(v_str):
                if v_str in ["-", "", None]:
                    return None
                return round_val(v_str)
            
            gpa_orig = parse_pusan_val(gpa_orig_str)
            toeic_orig = parse_pusan_val(toeic_orig_str)
            
            pusan_records.append({
                "대학명": "부산대학교",
                "연도": "2024",
                "학과": dept,
                "모집인원": recruit,
                "지원인원": app,
                "합격인원": passed,
                "최종합격_토익환산점수": None,
                "최종합격_토익원점수": toeic_orig,
                "최종합격_학점환산점수": None,
                "최종합격_학점원점수_100점만점": gpa_orig
            })

# =========================================================================
# E. Combine, Filter Exceptions, and Sort
# =========================================================================
all_extracted = kyungpook_records + kangwon_records + pukyong_records + pusan_records

exceptions = {
    "경북대학교": {
        "디자인학과": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "체육학과": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)"
    },
    "강원대학교": {
        "약학과": "2단계 면접 및 필기고사 반영 다단계 학과 (일반학과 표준 배점/산식 불일치)",
        "수의학과": "3단계 다단계 전형 및 배점 가중치 불일치 학과 (일반학과 표준 배점/산식 불일치)",
        "간호학과": "2단계 전형 및 배점 가중치 불일치 학과 (일반학과 표준 배점/산식 불일치)",
        "시설농업학전공": "면접 및 전적대 성적 가중 반영 학부 (공인영어 미반영)",
        "디자인학과": "실기고사 가중 반영 예체능 학과 (공인영어 미반영)",
        "무용학과": "실기고사 가중 반영 예체능 학과 (공인영어 미반영)",
        "미술학과": "실기고사 가중 반영 예체능 학과 (공인영어 미반영)",
        "스포츠과학과": "실기고사 가중 반영 예체능 학과 (공인영어 미반영)",
        "음악학과": "실기고사 가중 반영 예체능 학과 (공인영어 미반영)"
    },
    "부경대학교": {
        "해양스포츠전공": "실기고사 반영 및 공인영어 배점 가중치 불일치 학과 (일반학과 표준 배점/산식 불일치)",
        "패션디자인학과": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "시각디자인전공": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "공업디자인전공": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)"
    },
    "부산대학교": {
        "약학부": "필기고사 가중 반영 및 전형요소 배점 불일치 학과 (일반학과 표준 배점/산식 불일치)",
        "스포츠과학과": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "음악학과(성악전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "음악학과(피아노전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "음악학과(관현악전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "미술학과(한국화전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "미술학과(서양화전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "한국음악학과(이론작곡전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "디자인학과(시각디자인전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "디자인학과(애니메이션전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "디자인학과(디자인앤테크놀리저전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)",
        "디자인학과(디자인앤테크놀러지전공)": "실기고사 반영 예체능 학과 (일반학과 표준 배점/산식 불일치)"
    }
}

clean_records = []
except_records = []

for r in all_extracted:
    univ = r["대학명"]
    dept = r["학과"]
    
    # Check if is an exception
    if univ in exceptions and dept in exceptions[univ]:
        reason = exceptions[univ][dept]
        r_except = dict(r)
        r_except["제거사유"] = reason
        except_records.append(r_except)
    else:
        clean_records.append(r)

# Sort function: Sort by university in file listing order:
# 1. 강원대학교, 2. 경북대학교, 3. 부경대학교, 4. 부산대학교
# Within each university, sort alphabetically by 학과
univ_order = {
    "강원대학교": 1,
    "경북대학교": 2,
    "부경대학교": 3,
    "부산대학교": 4
}

def sort_key(rec):
    order = univ_order.get(rec["대학명"], 99)
    return (order, rec["학과"])

clean_records_sorted = sorted(clean_records, key=sort_key)
except_records_sorted = sorted(except_records, key=sort_key)

# Save standard database (편입_성적_통합.json & .csv)
with open("results/편입_성적_통합.json", "w", encoding="utf-8") as f:
    json.dump(clean_records_sorted, f, ensure_ascii=False, indent=2)

csv_headers = [
    "대학명", "연도", "학과", "모집인원", "지원인원", "합격인원",
    "최종합격_토익환산점수", "최종합격_토익원점수",
    "최종합격_학점환산점수", "최종합격_학점원점수_100점만점"
]

with open("results/편입_성적_통합.csv", "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(csv_headers)
    for r in clean_records_sorted:
        writer.writerow([
            r.get("대학명"),
            r.get("연도"),
            r.get("학과"),
            r.get("모집인원"),
            r.get("지원인원"),
            r.get("합격인원"),
            r.get("최종합격_토익환산점수"),
            r.get("최종합격_토익원점수"),
            r.get("최종합격_학점환산점수"),
            r.get("최종합격_학점원점수_100점만점")
        ])

# Save exception database (편입_예외학과_통합.json & .csv)
with open("results/편입_예외학과_통합.json", "w", encoding="utf-8") as f:
    json.dump(except_records_sorted, f, ensure_ascii=False, indent=2)

except_headers = [
    "대학명", "연도", "학과", "모집인원", "지원인원", "합격인원",
    "최종합격_토익환산점수", "최종합격_토익원점수",
    "최종합격_학점환산점수", "최종합격_학점원점수_100점만점",
    "제거사유"
]

with open("results/편입_예외학과_통합.csv", "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(except_headers)
    for r in except_records_sorted:
        writer.writerow([
            r.get("대학명"),
            r.get("연도"),
            r.get("학과"),
            r.get("모집인원"),
            r.get("지원인원"),
            r.get("합격인원"),
            r.get("최종합격_토익환산점수"),
            r.get("최종합격_토익원점수"),
            r.get("최종합격_학점환산점수"),
            r.get("최종합격_학점원점수_100점만점"),
            r.get("제거사유")
        ])

# Update and sort formula files as well
with open("results/편입_환산공식_통합.json", "r", encoding="utf-8-sig") as f:
    formulas = json.load(f)

# Sort formulas by university file name order
formulas_sorted = sorted(formulas, key=lambda fm: univ_order.get(fm["대학명"], 99))

with open("results/편입_환산공식_통합.json", "w", encoding="utf-8-sig") as f:
    json.dump(formulas_sorted, f, ensure_ascii=False, indent=2)

print("\nProcessing complete!")
print(f"Cleaned integrated records: {len(clean_records_sorted)}")
print(f"Isolated exception records: {len(except_records_sorted)}")
for univ, order in sorted(univ_order.items(), key=lambda item: item[1]):
    cnt_clean = len([r for r in clean_records_sorted if r["대학명"] == univ])
    cnt_except = len([r for r in except_records_sorted if r["대학명"] == univ])
    print(f"  - [{univ}] 일반학과: {cnt_clean}개, 예외학과: {cnt_except}개")
