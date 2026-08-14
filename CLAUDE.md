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

## 데이터는 손으로 고치지 않는다

`results/` 가 정본이고 `web/src/data/**.json` 은 거기서 동기화된 산출물이다.
**둘 중 어느 쪽도 편집기로 직접 고치지 않는다.**

- 값을 바꿀 일이 생기면 고칠 곳은 `tools/apply_fixes.py` 다. 그 도구는 JSON 재파싱 ·
  행 수 · 키 중복 · JSON↔CSV parity · `results/` ↔ `web/src/data/` SHA-256 대조를
  전부 통과한 뒤에만 파일을 교체하고, 실패하면 원래 파일로 되돌린다.
- 손으로 고치면 `audit_data_parity.py` 가 SHA-256 에서 걸린다. 검사가 틀린 것이
  아니라 정본과 산출물이 갈라진 것이다 — 검사를 끄지 말고 도구로 다시 만든다.
- 원본 데이터의 이상값은 **원본을 고쳐서** 지우지 않는다. 런타임 검증에서 제외하거나
  비공개로 표시하고 보정 건수를 화면에 알린다.
