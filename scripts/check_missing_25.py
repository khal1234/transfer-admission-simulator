import json

with open("results/편입_성적_통합.json", "r", encoding="utf-8") as f:
    records = json.load(f)

# Search for "국어국문학과" or similar in 2025
korean_lit_25 = [r for r in records if r["연도"] == "2025" and "국어국문" in r["학과"]]
mobility_25 = [r for r in records if r["연도"] == "2025" and "모빌리티" in r["학과"]]

print("=== Search Results for 2025 ===")
print(f"1. '국어국문' in 2025: Found {len(korean_lit_25)} records")
for r in korean_lit_25:
    print(f"  - Univ: {r['대학명']} | Standard Dept: {r['학과']} | Orig: {r.get('학과_원본명')} | Recruit: {r.get('모집인원')}")

print(f"\n2. '모빌리티' in 2025: Found {len(mobility_25)} records")
for r in mobility_25:
    print(f"  - Univ: {r['대학명']} | Standard Dept: {r['학과']} | Orig: {r.get('학과_원본명')} | Recruit: {r.get('모집인원')}")
