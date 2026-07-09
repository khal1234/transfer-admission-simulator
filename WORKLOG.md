# Worklog

## Current Status

- 저장소 루트에 프로젝트 전용 `AGENTS.md`를 추가해 로컬 작업 규칙을 정리했다.
- 프론트엔드 앱은 `web/`에 있고, 결과 데이터 산출물은 `results/`와 `web/src/data/`에 분리돼 있다.
- `results/`와 `web/src/data/`는 건드리지 않고 `web/src/App.tsx` 코드 최적화를 이어가고 있다.

## Recent Changes

- 지망 카드별 합격 계산, 결핍 분석, 최근 연도 히스토리 생성을 렌더 JSX 밖의 `targetSummaries` 메모로 이동했다.
- 지망/대학 선택 여부 lookup을 반복 배열 탐색 대신 메모된 `Set` 기반으로 바꿨다.
- 경쟁률 계산과 학과명 변경 이력 문자열 생성을 helper로 분리해 중복 계산을 줄였다.
- state 업데이트 일부를 함수형 업데이트로 바꿔 연속 클릭 시 stale state 가능성을 낮췄다.
- 숫자 파싱을 `Number.parseInt`/`Number.parseFloat`와 `Number.isNaN`으로 통일했다.
- `web/`에서 `npm run lint`와 `npm run build`를 통과했다.

## Next Tasks

- 추가 코드 작업 시 `results/`는 계속 제외하고, `web/src/data/` 수정은 사용자가 명시한 경우에만 진행한다.
- 다음 최적화 후보는 큰 `App.tsx`를 UI 섹션 단위 컴포넌트로 분리하고 inline style을 CSS class로 옮기는 작업이다.

## Update Rules

- 작업이 끝난 뒤 이 파일에는 긴 대화 로그 대신 결과 중심 요약만 남긴다.
- 한 번 업데이트할 때는 현재 상태, 최근 변경, 다음 작업 위주로 3개에서 7개 정도의 짧은 항목만 유지한다.
- 이미 끝난 세부 이력보다 다음 대화에 필요한 맥락과 주의사항이 우선이다.
