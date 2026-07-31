# 지역거점국립대 다용도 편입 플랫폼

2024~2026학년도 일반편입 입결을 바탕으로 TOEIC과 전적대 성적을 대학별
환산식에 적용하고, 관심 모집단위의 합격 평균과 비교하는 웹 시뮬레이터입니다.

> [!WARNING]
> 이 프로젝트는 AI를 활용해 제작된 참고용 도구입니다. 데이터, 환산식 및 계산
> 결과가 부정확하거나 최신 모집요강과 다를 수 있으므로 지원 전 반드시 각 대학
> 입학처의 공식 모집요강과 공지를 통해 다시 확인해야 합니다. 실제 지원 판단과
> 그 결과에 대한 책임은 이용자에게 있습니다.

## 주요 기능

- TOEIC 및 GPA 입력값 검증
- 100점, 4.5점, 4.3점 GPA 입력 방식 지원
- 대학·연도별 환산점수 계산
- 관심 모집단위 장바구니 및 브라우저 저장
- 최신 비교 가능 합격 평균과의 점수 차이 표시
- TOEIC·GPA 보완 점수 역산 참고값 제공
- 대학과 학과명·초성 검색 및 필터링
- 3개년 모집인원, 경쟁률, TOEIC 및 GPA 이력 비교
- 입결 추이를 직선으로 연결한 지표별 차트
- 데이터 이상값, 비공개 성적 및 계산 불가 상태 구분
- 데이터·차트 오류가 전체 화면으로 전파되지 않도록 오류 경계 적용

## 기술 구성

- React 19
- TypeScript
- Vite
- Recharts
- Vitest
- Oxlint

## 시작하기

### 요구 환경

- Node.js `^20.19.0` 또는 `>=22.12.0`
- npm
- 데이터 추출 도구 사용 시 Python 3.11 이상

### 설치 및 실행

```bash
git clone https://github.com/khal1234/transfer-admission-simulator.git
cd transfer-admission-simulator/web
npm ci
npm run dev
```

개발 서버가 표시하는 로컬 주소를 브라우저에서 열면 됩니다.

### 프로덕션 빌드

```bash
cd web
npm run build
npm run preview
```

## 검증

```bash
cd web
npm test
npm run lint
npm run build
npm audit
```

현재 기준으로 웹 테스트 168건과 TypeScript strict 검사, 린트 및
프로덕션 빌드를 통과합니다.

### 데이터 추출·감사 도구

Python 도구의 외부 패키지는 루트의 `requirements-tools.txt`에 버전을
고정했습니다. 원본 스프레드시트와 PDF는 저장소 루트의 `data/`에 두어야 하며,
누락 의존성·누락/손상 원본·0행 추출·스키마 오류가 하나라도 있으면 추출과
대조는 nonzero로 종료합니다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-tools.txt

python3 tools/extract_spreadsheets.py
python3 tools/extract_pdfs.py
python3 tools/diff_extraction.py
python3 tools/audit_data_parity.py
python3 tools/apply_fixes.py --dry-run
```

`tools/apply_fixes.py`의 실제 쓰기 모드는 표준·예외 CSV를 인메모리 JSON에서
재생성합니다. JSON 재파싱, 행 수, 키 중복, JSON↔CSV parity 및
`results/`↔`web/src/data/` SHA-256 검증이 모두 끝난 뒤에만 같은 디렉터리의
임시 파일을 교체하며, 교체 실패 시 기존 파일 전체를 복구합니다. 현재 JSON을
기준으로 CSV만 다시 맞춰야 할 때는 다음 명령을 사용합니다.

```bash
python3 tools/audit_data_parity.py --repair-csv
```

Python 도구의 격리 단위 테스트는 원본 파일 없이 실행할 수 있습니다.

```bash
python3 -m unittest tools/test_tools_pipeline.py tools/test_deployment_config.py -v
```

## 프로젝트 구조

```text
.
├── README.md
├── WORKLOG.md
├── results/                  # 데이터 처리 결과 산출물
└── web/
    ├── src/
    │   ├── components/       # 입력, 모집단위 탐색, 장바구니, 차트 UI
    │   ├── data/             # 입결 데이터 스냅샷
    │   ├── utils/            # 검증, 환산, 검색, 저장 및 레코드 로직
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

## 계산 및 데이터 처리 원칙

- 대학·연도별 환산식은 `web/src/utils/formulaRegistry.ts`에서 관리합니다.
- 공식 지원 범위는 2024~2026학년도입니다.
- 원본 데이터는 직접 보정하지 않고 런타임 검증을 거쳐 이상값을 제외하거나
  비공개 상태로 처리합니다.
- 비교 가능한 최신 합격 평균이 없으면 임의로 성공 상태를 표시하지 않습니다.
- 구간 환산표를 연속식으로 근사하거나 다른 연도 공식을 가정한 경우 화면에
  별도 안내를 표시합니다.
- 4.5점 및 4.3점 GPA의 100점 변환은 참고용 선형 근사치입니다.

## 알려진 제한사항

- 이 도구는 합격 가능성을 예측하거나 보장하지 않습니다.
- 면접, 서류, 대학별 고사 및 모집인원 변동은 계산 결과에 반영되지 않을 수 있습니다.
- 일부 대학·연도는 공개 자료 부족으로 추정식 또는 근사식이 적용됩니다.
- 성적 비공개 또는 비교 가능한 합격자 평균이 없는 모집단위는 점수 비교가 제한됩니다.
- 메인 번들에는 표준 입결 데이터가 포함되어 있어 초기 로딩 환경에 따라 시간이
  더 걸릴 수 있습니다.
