# -*- coding: utf-8 -*-
"""Netlify 무료 플랜의 월간 크레딧(300개, 프로덕션 배포 1회 = 15크레딧 = 월 20회) 중
**프로덕션 배포**가 몇 번 남았는지 세고, 다 썼으면 배포를 막는다.

    python tools/deploy_quota.py --check          # 남은 횟수 출력, 0 이하면 exit 1
    python tools/deploy_quota.py --check --force   # 0이어도 막지 않는다(그래도 출력은 한다)
    python tools/deploy_quota.py --record          # 성공한 프로덕션 배포를 1회 기록

왜 이 도구가 있는가 (2026-09-01, 사용자: *"막고 나만 할 수 있는거 풀고 컨트리뷰터로 같이
수정하고 푸시할 수 있는 사람은 배포 가능하게 하되 대신 제한이 걸려있다는 점과 지금 어느정도
횟수 남았는지 알 수 있게"*)
--------------------------------------------------------------------------------------
지금까지는 배포가 로컬 `netlify login`(사용자 개인 로그인)에 묶여 있어 사실상 사용자만
배포할 수 있었다. 그 문을 GitHub Actions(`workflow_dispatch`)로 열면 **push 권한이 있는
사람 누구나** 배포할 수 있는데, 그러면 "월 20회"라는 공용 한도를 여러 명이 나눠 쓰게 된다.
이 자가 없으면 한 사람이 모르고 다 써서 **사이트 전체가 다음 달까지 멈춘다**
(Netlify 공식 안내: 크레딧을 다 쓰면 사이트가 pause된다).

- **프리뷰 배포는 안 센다** — Netlify 프리뷰는 무료·무제한이다(공식 pricing 페이지).
  세는 것은 `-Production`/`--prod`로 실제 게시된 것뿐이다.
- **월 리셋은 달력 기준(1일)으로 어림한다** — 실제 Netlify 결제 주기는 계정마다 다를 수 있어
  정확히 일치하지 않을 수 있다(한계로 남겨 둔다).
- **기록은 리포에 커밋되는 평문 파일**(`기록/배포-횟수.txt`)이다 — 로컬·CI 양쪽에서 배포할
  수 있으므로 상태를 한 곳(git)에 안 두면 서로 다른 수를 본다.

☐ 못 보는 것
- Netlify가 실제로 몇 크레딧을 썼는지는 API로 확인하지 않는다(계정 결제 API 토큰이 필요해
  범위 밖으로 뒀다) — 이 자는 **우리가 스스로 기록한 배포 횟수**만 믿는다. 기록 없이(예:
  `netlify` CLI를 직접 쳐서) 배포하면 이 카운터가 실제보다 낮게 나온다.
- 동시에 두 사람이 동시에 배포하면 파일 쓰기 경합이 있을 수 있다(락 없음) — 이 리포 배포
  빈도로는 실사고 가능성이 낮다고 보고 잠금 장치는 안 만들었다.
"""
import argparse
import datetime
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "기록", "배포-횟수.txt")
CAP = 20               # 300크레딧 / 15크레딧 = 월 20회 (Netlify free, 2026-09-01 기준)
ROW_RE = re.compile(r"^(\d{4}-\d{2})\s*\|\s*(\d+)\s*$")


def this_month():
    return datetime.date.today().strftime("%Y-%m")


def load():
    """{월: 횟수}. 못 읽으면 빈 dict."""
    out = {}
    if not os.path.isfile(LEDGER):
        return out
    with open(LEDGER, encoding="utf-8") as fh:
        for line in fh:
            m = ROW_RE.match(line.strip())
            if m:
                out[m.group(1)] = int(m.group(2))
    return out


def save(rows):
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    with open(LEDGER, "w", encoding="utf-8") as fh:
        fh.write("# 월 | 프로덕션 배포 횟수 — tools/deploy_quota.py 가 관리한다. 손으로 고치지 않는다.\n")
        for month in sorted(rows):
            fh.write("%s | %d\n" % (month, rows[month]))


def used_this_month():
    return load().get(this_month(), 0)


def remaining():
    return CAP - used_this_month()


def record():
    rows = load()
    month = this_month()
    rows[month] = rows.get(month, 0) + 1
    save(rows)
    return rows[month]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--record", action="store_true")
    ap.add_argument("--force", action="store_true", help="0 이하여도 막지 않는다")
    a = ap.parse_args()

    if a.record:
        n = record()
        print("[배포 횟수] 이번 달 프로덕션 배포 %d회째 (한도 %d) — 남음 %d"
              % (n, CAP, CAP - n))
        return 0

    left = remaining()
    print("[배포 횟수] 이번 달 남은 프로덕션 배포: %d / %d"
          % (max(left, 0), CAP))
    if left <= 0:
        print("[배포 횟수] 이번 달 한도를 다 썼다 — 지금 배포하면 사이트가 다음 달까지 "
              "멈출 수 있다(Netlify 크레딧 소진 시 pause).", file=sys.stderr)
        if not a.force:
            return 1
        print("[배포 횟수] --force 로 넘어간다 — 그래도 위험은 그대로다.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
