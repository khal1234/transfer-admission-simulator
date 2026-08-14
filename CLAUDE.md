# CLAUDE.md

이 리포의 작업 규칙은 `AGENTS.md` 에 있다. 아래 import 로 매 세션 자동 적용된다 —
별도로 Read 하지 않아도 된다.

@AGENTS.md

> **왜 이 파일이 생겼나 (2026-08-14).** 규칙은 `AGENTS.md` 하나에만 있었는데 그 파일은
> Codex 쪽 진입점이라 **Claude 세션은 이 프로젝트의 규칙을 자동으로 읽은 적이 없었다.**
> 2026-08-12 에 업데이트 알림 없이 커밋·푸시된 3건이 그 결과다(그 경위는 `AGENTS.md`
> 「기계 검사」 절에 있다). 규칙을 새로 만든 것이 아니라 **읽히게 만든 것**이다.

## 검증 명령

판정에는 그것을 낸 명령을 붙인다. 이 리포에서 자주 쓰는 것은 넷이다.

```bash
python tools/check_update_notice.py --staged   # 커밋 직전 알림 누락
cd web && npm test && npm run lint && npm run build
python3 tools/diff_extraction.py               # 원본 대조 (data/ 가 있어야 돈다)
python3 tools/audit_data_parity.py             # results/ ↔ web/src/data/ 대조
```

`data/`(원본 PDF·엑셀)는 `.gitignore` 대상이라 **클론한 사람은 대조를 돌릴 수 없다.**
협업자에게 "검증 돌려봐"라고 말하지 않는다 — 대조 결과 건수를 커밋 메시지에 남긴다.

## 공용 시스템

공용 규칙·도구 폴더가 로컬에 따로 있고, 이 프로젝트가 그중 무엇을 가져가고 무엇을
안 가져갔는지는 **공용 도입 대장의 `편입` 13행**에 사유와 함께 적혀 있다.
공용 규칙을 이 리포로 이식하거나 이 리포의 규칙을 공용으로 올릴 때는 그 대장을 먼저 본다.
