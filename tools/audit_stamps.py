# -*- coding: utf-8 -*-
"""**근거 없는 「확정」 도장을 막는다** — 공용 「규칙/증거의-정직.md」 ⑶ 의 자.

    python 도구/audit_stamps.py            # 판정 (넘으면 exit 1)
    python 도구/audit_stamps.py --selftest # 자를 먼저 잰다 (양성·음성 대조군)
    python 도구/audit_stamps.py --quiet    # 걸린 게 없으면 침묵

왜 또 만드나 (2026-08-25, 같은 날 두 번째 판)
---------------------------------------------
첫 판은 **`exit 0` 이었다.** 실행 규율 17 이 글자 그대로 금지한 것이다 —
*"항상 exit 0 인 진단자만 있으면 숫자가 나와도 아무 일도 안 일어난다 →
「이 수가 얼마를 넘으면 마감이 막히나」를 같이 정한다."*
규칙을 쓴 손으로 그 규칙을 어겼고, 그래서 이 자는 하루도 못 가 이미 뚫려 있었다.

계기는 XSanity 아케이드 존 지도다 — **관측 6칸으로 62칸 전부에 「확정」을 찍었다.**
사용자가 검수에서 찾았고, 그게 곧 *"잘 된 걸 확인하는 게 아니라 잘 안 된 걸 확인하고 있다"* 다.

판정선 — **뺄셈 하나**
----------------------
「확정」을 내는 행은 그것을 만든 **관측을 같은 행에서** 가리켜야 한다.
못 가리키면 그 행은 **「예측」이지 확정이 아니다.**

    막는 선: 근거 없는 확정 **1칸이라도 있으면 exit 1.**

★ 0 을 선으로 두는 이유는 엄해서가 아니라 **중간값이 뜻이 없어서**다. 「확정 90%」 같은
  것은 없다 — 한 칸이 근거 없이 확정이면 **읽는 사람은 그 칸을 다시 안 본다.**

무엇을 안 재나 — **적어 두는 것이 이 자의 절반이다**
--------------------------------------------------
- **옳은가는 안 본다.** 근거가 붙어 있어도 그 근거가 틀릴 수 있다. 이 자가 보증하는 것은
  «근거를 가리키고 있나» 하나다(그 이상을 적으면 과잉 주장이다).
- **근거의 「분포」는 세되 막지 않는다.** 한 값이 N행을 덮으면 그 N행은 **한 번 관측한 것**이다
  (실측: XSanity `arcade_zone_final_merged` 632행 중 한 관측창이 81행을 덮었다).
  그런데 정당한 경우가 있다 — 한 화면에 여러 곡이 같이 보이면 같은 시각이 붙는다.
  **얼마를 넘으면 막을지 정할 수 없으므로 막지 않고 찍기만 한다**(규율 17 의 뒷문장:
  *"정할 수 없으면 아직 판정에 못 쓴다는 뜻이고 그 사실을 적어 둔다"*). 사람이 본다.
- ★★ **근거 칸이 아예 없는 파일은 이 자가 못 본다.** 실측(XSanity 뉴튠즈):
  정본 `arcade_dedicated_order.csv` 는 칸이 `존이름,종류,번호,곡` 뿐이라
  **「확인함」과 「안 함」이 구조상 같은 모양**이다. 그래서 선언에 적힌 파일에 근거 칸이
  없으면 **그 자체를 실패로 낸다** — 조용히 건너뛰면 그게 곧 「자가 못 본 0건」이다.

선언은 자료가 갖는다 — 코드에 파일 이름을 안 적는다
-----------------------------------------------------
프로젝트마다 칸 이름이 다르므로 **`기록/도장-감사.txt` 가 정본**이다(`게이트-목록.txt` ·
`월간-점검.txt` 와 같은 배치). 한 줄에 하나:

    <경로> | <도장칸> | <확정으로 치는 값들, 쉼표> | <근거칸들, 쉼표>

    out/arcade_zone_final_merged.csv | 확정도 | 정확,시각확정 | VOD시각,판독

- `#` 은 주석. **사유 없는 줄은 선언으로 안 친다.**
- 선언 파일이 없으면 **「해당 없음」으로 exit 0** 이다 — 대상이 없는 프로젝트에서 exit 1 을
  내면 배치와 사람 둘 다 «실패했다» 로 읽는다(공용 「알려진 함정」).
"""
import argparse
import csv
import io
import os
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECL_NAME = "도장-감사.txt"


def decl_path(root):
    for folder in ("기록", "docs", "_log"):
        p = os.path.join(root, folder, DECL_NAME)
        if os.path.isfile(p):
            return p
    return None


def parse_decl(text):
    """`(경로, 도장칸, 확정값들, 근거칸들)` 목록. 순수 함수 — 테스트 대상."""
    out = []
    for ln in text.splitlines():
        ln = ln.split("#")[0].strip()
        if not ln:
            continue
        parts = [p.strip() for p in ln.split("|")]
        if len(parts) != 4 or not all(parts):
            continue                      # 형식이 깨진 줄은 선언으로 안 친다
        path, stamp, vals, evid = parts
        out.append((path, stamp,
                    [v.strip() for v in vals.split(",") if v.strip()],
                    [e.strip() for e in evid.split(",") if e.strip()]))
    return out


def read_rows(path):
    with io.open(path, encoding="utf-8-sig", errors="replace", newline="") as fh:
        lines = [l for l in fh if not l.lstrip().startswith("#") and l.strip()]
    if not lines:
        return [], []
    r = csv.DictReader(io.StringIO("".join(lines)))
    return (r.fieldnames or []), list(r)


def audit_one(cols, rows, stamp, vals, evid):
    """`(확정수, 근거없음, 최다반복, 서로다른값, 없는칸)`. 순수 함수 — 테스트 대상."""
    missing = [c for c in ([stamp] + evid) if c not in cols]
    if missing:
        return 0, 0, 0, 0, missing
    conf = [r for r in rows if str(r.get(stamp) or "").strip() in vals]
    unbacked = [r for r in conf
                if not any(str(r.get(c) or "").strip() for c in evid)]
    seen = Counter()
    for r in conf:
        key = " | ".join(str(r.get(c) or "").strip() for c in evid)
        if key.strip(" |"):
            seen[key] += 1
    top = seen.most_common(1)[0][1] if seen else 0
    return len(conf), len(unbacked), top, len(seen), []


# ── 자기 검정 — **이 자의 첫 두 판이 틀렸다. 그래서 이게 붙는다** ────────────────
SELFTEST = [
    # (설명, 칸, 행, 도장칸, 확정값, 근거칸, 근거없음이 몇이어야 하나)
    ("양성 — 근거 없이 확정 3칸",
     ["확정도", "VOD시각"],
     [{"확정도": "정확", "VOD시각": ""}, {"확정도": "정확", "VOD시각": ""},
      {"확정도": "정확", "VOD시각": ""}, {"확정도": "정확", "VOD시각": "12:30"}],
     "확정도", ["정확"], ["VOD시각"], 3),
    ("음성 — 전부 근거 있음",
     ["확정도", "VOD시각"],
     [{"확정도": "정확", "VOD시각": "1:00"}, {"확정도": "정확", "VOD시각": "2:00"}],
     "확정도", ["정확"], ["VOD시각"], 0),
    ("음성 — 확정이 아닌 행은 안 센다",
     ["확정도", "VOD시각"],
     [{"확정도": "예측", "VOD시각": ""}, {"확정도": "미확인", "VOD시각": ""}],
     "확정도", ["정확"], ["VOD시각"], 0),
    ("★ 도장 값이 안 맞으면 0이 나온다 — 첫 판이 여기서 틀렸다",
     ["확정도", "VOD시각"],
     [{"확정도": "정확", "VOD시각": ""}],
     "확정도", ["확정"], ["VOD시각"], 0),          # 「확정」으로 찾으면 「정확」을 못 본다
]


def selftest():
    bad = 0
    print("[자기 검정] 이 자가 무엇을 보고 무엇을 못 보나")
    for desc, cols, rows, stamp, vals, evid, want in SELFTEST:
        _, unbacked, _, _, missing = audit_one(cols, rows, stamp, vals, evid)
        ok = (not missing) and unbacked == want
        bad += 0 if ok else 1
        print("  %s %-46s 근거없음 %d (기대 %d)"
              % ("OK  " if ok else "**틀림**", desc, unbacked, want))

    _, _, _, _, missing = audit_one(["곡"], [{"곡": "x"}], "확정도", ["정확"], ["VOD시각"])
    ok = bool(missing)
    bad += 0 if ok else 1
    print("  %s %-46s 없는칸 %s"
          % ("OK  " if ok else "**틀림**", "★ 근거 칸이 없는 파일은 실패로 낸다", missing))

    print("\n  ※ 넷째 줄이 이 자의 사각지대다 — **도장 값을 잘못 선언하면 「0칸」이 나온다.**")
    print("     그 0 은 «없다» 가 아니라 «자가 못 봤다» 이므로, 선언을 고칠 때 이 줄을 본다.")
    print("[자기 검정] %s" % ("전부 통과" if not bad else "**%d건 틀림**" % bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=ROOT)
    ap.add_argument("--quiet", action="store_true", help="걸린 게 없으면 침묵")
    ap.add_argument("--selftest", action="store_true", help="대조군으로 자를 먼저 잰다")
    a = ap.parse_args()
    if a.selftest:
        return selftest()

    root = os.path.abspath(a.root)
    dp = decl_path(root)
    if not dp:
        if not a.quiet:
            print("[도장 감사] 선언이 없다 — **해당 없음** 0건 (실패가 아니다)")
            print("  대상이 있으면 `기록/%s` 에 한 줄씩:" % DECL_NAME)
            print("    <경로> | <도장칸> | <확정으로 치는 값들> | <근거칸들>")
        return 0

    decls = parse_decl(io.open(dp, encoding="utf-8", errors="replace").read())
    if not decls:
        print("[도장 감사] 선언 파일은 있는데 **성립하는 줄이 0개다** — 형식을 본다: %s" % dp,
              file=sys.stderr)
        return 1                      # 빈 선언을 통과로 읽으면 그게 조용한 구멍이다

    rows_out, fail = [], 0
    for path, stamp, vals, evid in decls:
        full = path if os.path.isabs(path) else os.path.join(root, path)
        if not os.path.isfile(full):
            rows_out.append((path, "**파일 없음**", 0, 0, 0, 0))
            fail += 1
            continue
        cols, rows = read_rows(full)
        conf, unbacked, top, distinct, missing = audit_one(cols, rows, stamp, vals, evid)
        if missing:
            rows_out.append((path, "**칸 없음: " + ",".join(missing) + "**", 0, 0, 0, 0))
            fail += 1
            continue
        rows_out.append((path, "", len(rows), conf, unbacked, top))
        fail += 1 if unbacked else 0

    if a.quiet and not fail:
        return 0
    print("[도장 감사] 근거 없는 「확정」 — 공용 `규칙/증거의-정직.md` ⑶")
    print("%-44s %6s %6s %9s %8s" % ("파일", "전체", "확정", "근거없음", "최다반복"))
    for path, note, total, conf, unbacked, top in rows_out:
        if note:
            print("%-44s %s" % (path[:44], note))
            continue
        mark = "  ← **막는다**" if unbacked else ""
        print("%-44s %6d %6d %9d %8d%s" % (path[:44], total, conf, unbacked, top, mark))
    print()
    print("  ※ **최다반복** 은 한 근거값이 덮는 행 수다 — 크면 «한 번 관측한 것»이라는 뜻이지만")
    print("     한 화면에 여러 개가 같이 보이는 정당한 경우가 있어 **막지 않고 찍기만 한다.**")
    if fail:
        print("\nFAIL — 근거 없는 확정이 있다. **그 행은 「예측」이지 확정이 아니다.**",
              file=sys.stderr)
        print("  표시를 바꾸거나, 관측을 붙이거나, 내보내지 않는다 — 셋 중 하나다.",
              file=sys.stderr)
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
