"""합격자 성적 데이터에서 환산식을 역산해 문서화된 공식과 대조한다. 읽기 전용.

성적 자료에는 (원점수, 환산점수)가 함께 실린 레코드가 많다. 환산식이 비례식이면
평균의 환산과 환산의 평균이 같으므로, 그 쌍들에 직선을 맞추면 계수가 그대로
복원된다. 그래서 이 스크립트는 공식을 다시 구현하지 않고 **데이터에서 유도**한다.

쓰임은 둘이다.
  1. 모집요강 원본이 없는 칸(2024 강원대/부산대/전북대, 2025 전북대)의 역산.
  2. 원본이 있는 칸에서도, 유도된 계수가 편입_환산공식_통합.json과 어긋나면
     둘 중 하나가 틀린 것이므로 원문을 다시 봐야 할 지점을 짚어준다.

R²가 1에 가깝지 않으면 그 칸은 비례식이 아니거나(구간식-환산표), 추출이
섞였다는 뜻이다. 어느 쪽인지는 이 스크립트가 판정하지 않는다.

    python tools/derive_formulas.py
"""
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"

TOEIC_MAX = 990.0

# (원점수 필드, 환산점수 필드, 표시 이름)
PAIRS = [
    ("최종합격_토익원점수", "최종합격_토익환산점수", "영어"),
    ("최종합격_학점원점수_100점만점", "최종합격_학점환산점수", "학점"),
]


def load_json(path):
    with io.open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def linear_fit(points):
    """최소제곱 직선 맞춤. (기울기, 절편, R2, 최대잔차) 를 돌려준다."""
    n = len(points)
    if n < 2:
        return None

    sx = sum(x for x, _ in points)
    sy = sum(y for _, y in points)
    mx = sx / n
    my = sy / n

    sxx = sum((x - mx) ** 2 for x, _ in points)
    sxy = sum((x - mx) * (y - my) for x, y in points)

    if sxx == 0:
        return None

    slope = sxy / sxx
    intercept = my - slope * mx

    ss_tot = sum((y - my) ** 2 for _, y in points)
    residuals = [y - (slope * x + intercept) for x, y in points]
    ss_res = sum(r * r for r in residuals)
    r2 = 1.0 if ss_tot == 0 else 1 - ss_res / ss_tot
    max_res = max(abs(r) for r in residuals)

    return slope, intercept, r2, max_res


def documented_english_max(record):
    """만점(990)일 때 나와야 하는 영어 환산점수 = 배점.

    기울기로 대조하면 구간식-환산표 대학(충남-충북-전북)이 전부 가짜 불일치로
    잡힌다. 그 식들은 절편이 0이 아니라서 기울기가 배점/990이 아니기 때문이다.
    반면 '만점이면 배점 만점'은 식의 종류와 무관하게 성립한다.
    """
    f = record["공인영어_환산공식"]
    return f.get("배점")


def documented_gpa_slope(record):
    f = record["전적대성적_환산공식"]
    if f.get("공식유형") is None or f.get("비례계수") is None:
        return None
    return f["비례계수"] / 100.0


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    records = load_json(RESULTS_DIR / "편입_성적_통합.json")
    formulas = {
        (r["대학명"], r["연도"]): r
        for r in load_json(RESULTS_DIR / "편입_환산공식_통합.json")
    }

    # 쌍이 0건인 칸도 표에 남아야 한다. buckets에만 의존하면 그런 칸이
    # 조용히 사라져 "역산해봤더니 다 맞더라"는 잘못된 인상을 준다.
    all_keys = sorted({(r["대학명"], r["연도"]) for r in records})

    buckets = defaultdict(lambda: defaultdict(list))
    for r in records:
        key = (r["대학명"], r["연도"])
        for raw_field, conv_field, label in PAIRS:
            raw = r.get(raw_field)
            conv = r.get(conv_field)
            if raw is not None and conv is not None:
                buckets[key][label].append((float(raw), float(conv)))

    header = "{:<8}{:<6}{:<6}{:>5}{:>10}{:>10}{:>9}{:>9}   {}".format(
        "대학", "연도", "항목", "n", "유도기울기", "절편", "R2", "최대잔차", "문서값 대조"
    )
    print(header)
    print("-" * (len(header) + 6))

    conflicts = []
    no_data = []

    imperfect = []

    for key in all_keys:
        univ, year = key
        doc = formulas.get(key)

        for _, _, label in PAIRS:
            points = buckets[key][label]
            if len(points) < 2:
                no_data.append(f"{year} {univ} {label} — 쌍 {len(points)}건, 역산 불가")
                print("{:<8}{:<6}{:<6}{:>5}{:>10}{:>10}{:>9}{:>9}   {}".format(
                    univ.replace("대학교", "대"), year, label, len(points),
                    "-", "-", "-", "-", "역산 불가"
                ))
                continue

            fit = linear_fit(points)
            if fit is None:
                no_data.append(f"{year} {univ} {label} — 원점수가 모두 같아 역산 불가")
                continue

            slope, intercept, r2, max_res = fit

            # 영어는 '만점이면 배점 만점'으로, 학점은 기울기(비례계수/100)로 본다.
            if label == "영어":
                documented = documented_english_max(doc) if doc else None
                derived = slope * TOEIC_MAX + intercept
                unit = "만점환산"
            else:
                documented = documented_gpa_slope(doc) if doc else None
                derived = slope
                unit = "기울기"

            if documented is None:
                verdict = "문서값 없음"
            elif abs(derived - documented) <= max(0.05, abs(documented) * 0.02):
                verdict = "일치 ({} {:.3f})".format(unit, documented)
            else:
                verdict = "★ 불일치 ({} 문서 {:.3f} / 데이터 {:.3f})".format(
                    unit, documented, derived
                )
                conflicts.append(
                    "{} {} {} — {} 데이터 {:.3f} vs 문서 {:.3f} (n={}, R2={:.4f})".format(
                        year, univ, label, unit, derived, documented, len(points), r2
                    )
                )

            if r2 < 0.9999:
                imperfect.append((key, label, r2, max_res, points, slope, intercept))

            print("{:<8}{:<6}{:<6}{:>5}{:>10.4f}{:>10.3f}{:>9.4f}{:>9.3f}   {}".format(
                univ.replace("대학교", "대"), year, label, len(points),
                slope, intercept, r2, max_res, verdict
            ))

    print()
    print("=== 문서값과 어긋나는 칸 ===")
    if conflicts:
        for line in conflicts:
            print(" -", line)
    else:
        print(" 없음")

    print()
    print("=== 역산할 데이터가 없는 칸 ===")
    if no_data:
        for line in no_data:
            print(" -", line)
    else:
        print(" 없음")

    print()
    print("!! R2가 1.0000이라고 해서 추출이 옳다는 뜻이 아니다.")
    print("   원본이 환산점수만 공개하는 대학은 원점수가 환산식을 뒤집어 만들어진")
    print("   값이라, 이 대조가 순환 논증이 된다(실측: 14칸 중 13칸). 어느 칸이")
    print("   그런지는 `python tools/audit_circularity.py` 가 가른다. 먼저 볼 것.")


if __name__ == "__main__":
    main()
