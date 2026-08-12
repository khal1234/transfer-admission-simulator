"""사이트가 바뀌었는데 업데이트 알림이 안 바뀌었으면 막는다. 읽기 전용.

AGENTS.md 「사이트 업데이트 알림 동기화」의 기계 쪽 짝이다. 그 규칙은 문서에만
있어서 지켜지지 않았다 — 2026-08-12 에 데이터 수정 3건이 알림 없이 커밋·푸시됐고
아무것도 걸리지 않았다. 사람이 기억해야 하는 규칙은 결국 잊는다.

**판정 방식.** 사용자에게 보이는 것을 건드린 마지막 커밋을 찾아, 그 날짜가
`UPDATE_NOTICE_DATE.iso` 보다 최신이면 알림이 뒤처진 것이다.

  사용자에게 보이는 것 = web/src/**  ·  web/public/**  ·  results/**
  단, *.test.ts(x) 와 알림 파일 자신은 제외한다.

테스트로 만들지 않은 이유 — 알림이 최신인지는 파일 내용만 봐서는 알 수 없다.
커밋 이력과 견줘야 하는데 그건 단위 테스트가 할 일이 아니다. 대신 배포
스크립트가 이 검사를 부른다. 사이트가 실제로 바뀌는 자리가 거기라서다.

    python tools/check_update_notice.py          # 커밋된 것 기준
    python tools/check_update_notice.py --staged # 커밋 직전(스테이징 포함)
"""
import io
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTICE = ROOT / "web" / "src" / "components" / "updateNoticeContent.ts"

WATCHED_PREFIXES = ("web/src/", "web/public/", "results/")
IGNORED_SUFFIXES = (".test.ts", ".test.tsx", ".md")
NOTICE_PATH = "web/src/components/updateNoticeContent.ts"


def git(*args):
    out = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    return out.stdout.strip()


def is_user_visible(path):
    if path == NOTICE_PATH:
        return False
    if not path.startswith(WATCHED_PREFIXES):
        return False
    return not path.endswith(IGNORED_SUFFIXES)


def notice_date():
    text = io.open(NOTICE, encoding="utf-8").read()
    m = re.search(r'iso:\s*"(\d{4}-\d{2}-\d{2})"', text)
    if m is None:
        raise SystemExit(f"{NOTICE_PATH} 에서 iso 날짜를 못 찾았다.")
    return m.group(1)


def last_visible_change():
    """사용자에게 보이는 것을 건드린 마지막 커밋 (날짜, 해시, 제목)."""
    # --name-only 로 커밋마다 파일을 받아 우리 기준으로 직접 거른다.
    # 구분자에 NUL 을 못 쓴다 — Windows 는 argv 에 NUL 이 들어가면 거부한다.
    REC, SEP = "@@REC@@", "@@F@@"
    log = git("log", "-40", "--date=short",
              f"--format={REC}%h{SEP}%ad{SEP}%s", "--name-only")
    for chunk in log.split(REC):
        if not chunk.strip():
            continue
        head, _, files = chunk.partition("\n")
        parts = head.split(SEP)
        if len(parts) < 3:
            continue
        sha, date, subject = parts[0], parts[1], parts[2]
        if any(is_user_visible(f.strip()) for f in files.splitlines() if f.strip()):
            return date, sha, subject
    return None


def staged_visible_files():
    changed = git("diff", "--cached", "--name-only").splitlines()
    return [f for f in changed if is_user_visible(f.strip())]


def main():
    # 리포 관례 — 콘솔 코드페이지가 cp949 라 한글·em dash 가 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

    staged_mode = "--staged" in sys.argv
    current = notice_date()

    if staged_mode:
        visible = staged_visible_files()
        notice_staged = NOTICE_PATH in git(
            "diff", "--cached", "--name-only").splitlines()
        if visible and not notice_staged:
            print("업데이트 알림이 빠졌다.")
            print(f"  사용자에게 보이는 변경 {len(visible)}건이 스테이징돼 있는데")
            print(f"  {NOTICE_PATH} 는 그대로다.")
            for f in visible[:10]:
                print("   -", f)
            print()
            print("AGENTS.md 「사이트 업데이트 알림 동기화」 참조.")
            return 1
        print("업데이트 알림 OK (스테이징 기준).")
        return 0

    latest = last_visible_change()
    if latest is None:
        print("최근 커밋에 사용자에게 보이는 변경이 없다.")
        return 0

    date, sha, subject = latest
    if date > current:
        print("업데이트 알림이 뒤처져 있다.")
        print(f"  알림 날짜          {current}")
        print(f"  마지막 화면 변경   {date}  {sha}  {subject}")
        print()
        print(f"{NOTICE_PATH} 의 UPDATE_NOTICE_DATE 를 {date} 로 바꾸고")
        print("사용자가 읽을 문장을 UPDATE_ITEMS 맨 위에 넣을 것.")
        print("AGENTS.md 「사이트 업데이트 알림 동기화」 참조.")
        return 1

    print(f"업데이트 알림 OK — 알림 {current} / 마지막 화면 변경 {date} ({sha}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
