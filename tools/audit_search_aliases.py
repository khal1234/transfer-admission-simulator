"""줄임말 표가 실제 학과명을 덮는지 검사한다. 읽기 전용.

`web/src/utils/departmentSearch.ts` 의 DEPARTMENT_ALIASES 는 사람이 기억으로
적은 표라, 실제 데이터에 없는 이름을 가리키고 있을 수 있다. 그런 항목은
검색해도 아무것도 안 나오면서 표만 길게 만든다. 반대로 레코드가 많은데
줄임말이 없는 학과도 있다.

  ⑴ 죽은 별칭 — 어떤 학과명에도 걸리지 않는 항목
  ⑵ 줄임말이 없는 흔한 학과 — 같은 이름이 여러 대학에 있는데 표에 없는 것

    python tools/audit_search_aliases.py
"""
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
SEARCH_TS = ROOT / "web" / "src" / "utils" / "departmentSearch.ts"


def load_names():
    names = []
    for name in ("편입_성적_통합.json", "편입_예외학과_통합.json"):
        with io.open(RESULTS_DIR / name, encoding="utf-8-sig") as f:
            for record in json.load(f):
                names.append((record["학과"], record["대학명"]))
                if record.get("학과_원본명"):
                    names.append((record["학과_원본명"], record["대학명"]))
    return names


def load_aliases():
    """TS 소스에서 별칭 표를 읽는다. 표가 한 곳에만 있도록 하기 위해서다."""
    text = SEARCH_TS.read_text(encoding="utf-8")
    block = re.search(
        r"DEPARTMENT_ALIASES[^=]*=\s*\{(.*?)\n\};", text, re.S
    )
    if block is None:
        raise SystemExit("DEPARTMENT_ALIASES 를 찾지 못했다")

    aliases = {}
    for line in block.group(1).splitlines():
        m = re.match(r'\s*([^\s:]+):\s*\[(.*)\],?\s*$', line)
        if m:
            key = m.group(1).strip('"')
            values = re.findall(r'"([^"]+)"', m.group(2))
            aliases[key] = values
    return aliases


def squash(value):
    return re.sub(r"\s+", "", value)


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    names = load_names()
    squashed = [squash(n) for n, _ in names]
    aliases = load_aliases()

    print(f"학과명 {len(set(squashed))}종 / 별칭 {len(aliases)}개")
    print()

    dead = []
    print("{:<12}{:>6}  {}".format("줄임말", "적중", "걸리는 학과 예시"))
    print("-" * 72)
    for alias in sorted(aliases):
        hit_names = set()
        for target in aliases[alias]:
            t = squash(target)
            for name in squashed:
                if t in name:
                    hit_names.add(name)

        if not hit_names:
            dead.append(alias)

        sample = ", ".join(sorted(hit_names)[:3])
        print("{:<12}{:>6}  {}".format(alias, len(hit_names), sample[:52]))

    print()
    print("=== 죽은 별칭 (아무 학과에도 안 걸림) ===")
    if dead:
        for alias in dead:
            print(" -", alias, "→", aliases[alias])
    else:
        print(" 없음")

    print()
    print("=== 별칭이 없는 흔한 학과 (참고) ===")
    print("  이름이 짧으면 그대로 쳐도 나오므로 별칭이 없어도 된다.")
    print("  줄여 부르는 관행이 있는데 표에 없는 것만 추가 대상이다.")
    covered = set()
    for expansions in aliases.values():
        for target in expansions:
            covered.add(squash(target))

    per_name = Counter()
    for name, univ in names:
        per_name[squash(name)] += 1

    missing = []
    for name, count in per_name.most_common(40):
        if count < 4:
            continue
        if any(target in name for target in covered):
            continue
        missing.append((name, count))

    if missing:
        for name, count in missing[:20]:
            print(f" - {name}  ({count}회)")
    else:
        print(" 없음")


if __name__ == "__main__":
    main()
