# -*- coding: utf-8 -*-
"""공용 시스템(`Documents/Claude`)이 바뀌었는지 **해시로만** 확인해 한 줄로 알린다.

    settings.json 의 SessionStart 훅으로 건다:
        python .claude/hooks/shared_sync_check.py

왜 이 형태인가 (2026-08-12, 사용자: *"매 채팅이나 매 세션마다 공통 시스템 확인해서 괜찮은 거
있으면 가져오게 하는 건 너무 토큰 낭비려나 … 그래도 주기적으로 확인은 하게 해야 할 것 같은데.
안 그러면 만든 이유가 없으니"*):

  ★ **평소 비용이 0이어야 확인을 매 세션 돌릴 수 있다.** 그래서 내용을 읽지 않고 **해시만**
    비교하고, **달라진 것이 없으면 아무것도 출력하지 않는다.** 달라졌을 때만 한 줄 —
    그 줄을 본 세션이 `변경일지.md` 의 해당 줄만 읽고 가져올지 판정한다.
  ★ **자동 복사는 하지 않는다.** 프로젝트마다 경로·이름·구조가 달라 덮어쓰면 깨진다.
    이 훅은 *알리는 것*까지만 하고 판정은 사람·에이전트가 한다.
  ★ **주기 제한을 두지 않는다.** 비용이 0이라 매 세션 돌려도 되고, 그래야 올린 다음 세션에
    바로 알려진다(주 1회로 묶으면 그만큼 늦게 안다).

lock 파일(`.claude/hooks/.shared-system.lock`)은 **프로젝트마다 따로** 갖는다 — 가져간 시점이 다르다.

★ **자리를 2026-08-14 에 옮겼다: `.claude/` 밑 → `.claude/hooks/` 밑 + dot 접두.**
  옛 자리는 **추적되는 파일**이라 미러가 돌 때마다 작업 트리가 더러워졌고, 그러면
  「기준선 이동은 깨끗한 트리에서만」 게이트가 매번 걸린다. 게다가 이건 **워크트리 로컬 상태**라
  브랜치에 실려 다닐 것이 아니다. `.gitignore` 에 이름을 하나 더 **열거하지 않고** 옮긴 이유는
  그 파일 50~57행에 적힌 그대로다 — *"열거(denylist)라 새 파일이 기본 추적"* 이라서 훅이 로그를
  하나 더 만들 때마다 샜고, 그래서 **기본값을 안전한 쪽으로 뒤집어** `/.claude/hooks/.*` 로
  막아 두었다. 그 뒤집힌 기본값 안으로 들어가는 것이 맞다.
공용 폴더가 없는 환경(다른 PC)에서는 **조용히 아무것도 안 한다.**
"""
import hashlib
import json
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SHARED = Path(os.environ.get("CLAUDE_SHARED_SYSTEM")
              or Path.home() / "Documents" / "Claude")
LOCK = Path(__file__).resolve().parent / ".shared-system.lock"   # dot 접두 = 이미 무시되는 자리
# 해시를 뜰 대상. 산출물·캐시는 세지 않는다.
SUFFIXES = (".md", ".py", ".ps1", ".txt", ".json")
SKIP_DIRS = {"__pycache__", ".git"}


def fingerprint(root):
    """{상대경로: 해시 앞 12자}. 순수 함수 — 테스트가 직접 부른다."""
    out = {}
    if not root.is_dir():
        return out
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        out[path.relative_to(root).as_posix()] = digest(path.read_bytes())
    return out


def digest(data):
    """파일 내용 → 지문 12자.

    `tools/sync_common.py` 의 미러가 **이 함수를 그대로 가져다 쓴다** — 지문 방식이 두 벌이면
    같은 파일을 두고 lock 이 서로 다른 것을 가리켜 「공용 쪽이 바뀌었나」 판정이 통째로
    거짓말이 된다(이 리포가 여러 번 겪은 «같은 질문에 답하는 자가 둘» 부류).
    """
    return hashlib.sha256(data).hexdigest()[:12]


def diff(now, before):
    """(새로 생긴 것, 바뀐 것, 사라진 것). 순수 함수."""
    added = [k for k in now if k not in before]
    changed = [k for k in now if k in before and now[k] != before[k]]
    gone = [k for k in before if k not in now]
    return added, changed, gone


def main():
    now = fingerprint(SHARED)
    if not now:
        return 0                      # 공용 폴더가 없는 환경 — 조용히 넘어간다
    before = {}
    if LOCK.is_file():
        try:
            before = json.loads(LOCK.read_text(encoding="utf-8")).get("files") or {}
        except ValueError:
            before = {}
    added, changed, gone = diff(now, before)
    if not LOCK.is_file():
        # 첫 실행 — 지금 상태를 기준으로 삼고 알리지 않는다(전부 '새것' 으로 뜨면 소음이다).
        LOCK.write_text(json.dumps({"files": now}, ensure_ascii=False, indent=1) + "\n",
                        encoding="utf-8")
        return 0
    if not (added or changed):
        return 0                      # ★ 평소: 출력 0
    names = [*(f"+{k}" for k in added), *changed]
    print("[공용 시스템] 변경 %d건 — %s%s · `Documents/Claude/변경일지.md` 의 그 줄만 읽고"
          " 가져올지 판정할 것 (가져왔으면 `--accept <경로…>` 로 표시)"
          % (len(names), ", ".join(names[:5]), " …" if len(names) > 5 else ""))
    return 0


def accept(only=None):
    """가져오기를 마쳤을 때 lock 을 지금 상태로 민다 — `python … --accept [경로…]`.

    ★ **경로를 주면 그것만 민다 (2026-08-14).** 통째로 미는 길만 있으면, 한 파일을 확인했을 뿐인데
    **아직 판정 안 한 파일까지 «확인함» 이 된다** — 그다음 미러가 그것들을 조용히 덮는다.
    확인은 파일 단위로 하는 일이라 표시도 파일 단위여야 한다.
    """
    now = fingerprint(SHARED)
    if only:
        keep = {}
        if LOCK.is_file():
            try:
                keep = json.loads(LOCK.read_text(encoding="utf-8")).get("files") or {}
            except ValueError:
                keep = {}
        unknown = [p for p in only if p not in now]
        for path in only:
            if path in now:
                keep[path] = now[path]
        now = keep
        if unknown:
            print("[공용 시스템] 공용 폴더에 없는 경로는 건너뛴다: " + ", ".join(unknown))
    LOCK.write_text(json.dumps({"files": now}, ensure_ascii=False, indent=1) + "\n",
                    encoding="utf-8")
    print("[공용 시스템] 확인 완료로 표시했다" +
          (" — " + str(len(only)) + "개만" if only else " — 다음 세션부터 이 상태가 기준이다"))
    return 0


if __name__ == "__main__":
    if "--accept" in sys.argv:
        paths = [a for a in sys.argv[1:] if not a.startswith("--")]
        raise SystemExit(accept(paths or None))
    raise SystemExit(main())
