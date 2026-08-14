#!/usr/bin/env python
"""커밋 직전에 업데이트 알림 누락을 막는다 (2026-08-14 신설).

**왜 이 훅인가.** 규칙(`AGENTS.md` 「사이트 업데이트 알림 동기화」)과 검사
(`tools/check_update_notice.py`)는 2026-08-12 에 이미 세웠는데, 그 검사를 부르는
자리가 `tools/deploy.ps1` **하나뿐**이었다. 즉 **배포까지 가야 걸린다.**
알림 없이 커밋·푸시된 3건이 새어나간 경로가 정확히 그 틈이다 — 커밋은 되고,
푸시도 되고, 배포를 안 하면 아무도 모른다.

그래서 트리거를 **「반드시 하는 일」**로 옮겼다. 커밋은 반드시 한다.

★ 검사기가 **죽는 것**과 판정이 **실패하는 것**을 구별해 둘 다 막는다.
  죽었을 때 통과시키면 「검사가 있다」는 사실만 남고 아무것도 안 막는다.

★ 이 훅은 **Claude 세션의 Bash 호출만** 본다. 터미널에서 사람이 직접 치는
  `git commit` 은 못 막는다 — 그쪽까지 막으려면 git 쪽 pre-commit 이 따로 필요하다.
"""
import json
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

COMMIT = re.compile(r"\bgit\b(?:\s+-[^\s]+|\s+--[^\s]+)*\s+commit\b")


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return 0                      # 훅 입력을 못 읽으면 판정할 대상이 없다

    command = str((payload.get("tool_input") or {}).get("command", ""))
    if not COMMIT.search(command) or "--dry-run" in command:
        return 0

    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    checker = os.path.join(root, "tools", "check_update_notice.py")
    if not os.path.isfile(checker):
        print("커밋 보류 — 알림 검사기를 못 찾았다: %s" % checker, file=sys.stderr)
        return 2

    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    try:
        done = subprocess.run([sys.executable, checker, "--staged"],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", cwd=root, env=env, timeout=60)
    except (OSError, subprocess.SubprocessError) as exc:
        print("커밋 보류 — 알림 검사기가 돌지 못했다: %s" % exc, file=sys.stderr)
        return 2

    if done.returncode != 0:
        detail = (done.stdout + done.stderr).strip()
        print("커밋 보류 — 사이트가 바뀌었는데 업데이트 알림이 그대로다.\n"
              "%s\n"
              "web/src/components/updateNoticeContent.ts 의 날짜(작업 완료일, Asia/Seoul)와\n"
              "항목을 먼저 갱신하고 같이 스테이징한 뒤 다시 커밋할 것." % detail,
              file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
