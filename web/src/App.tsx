import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DepartmentExplorer from "./components/DepartmentExplorer";
import DecisionSupportPanel from "./components/DecisionSupportPanel";
import ChartErrorBoundary from "./components/ChartErrorBoundary";
import SpecInputPanel from "./components/SpecInputPanel";
import TargetBasket, { type TargetSummary } from "./components/TargetBasket";
import TransferReviewLinks from "./components/TransferReviewLinks";
import type { ChartMetric } from "./components/TrendChart";
import UniversityName from "./components/UniversityName";
import UpdateNotice from "./components/UpdateNotice";
import { 
  calculateScore, 
  calculateScoreDeficit,
  analyzeScoreDeficit,
  type DepartmentRecord
} from "./utils/converter";
import {
  getLatestComparableRecord,
  getLatestRecord,
  getRecordYear,
  isComparableRecord,
} from "./utils/records";
import { getDepartmentGroupKey } from "./utils/departmentSearch";
import {
  getComparisonYearNotice,
  pickBasisRecord,
} from "./utils/comparisonBasis";
import { getConversionFormula } from "./utils/formulaRegistry";
import {
  isGpaType,
  convertGpa100ToInput,
  getGpa100ForInput,
  limitGpaInput,
  limitToeicInput,
  normalizeGpaInput,
  normalizeToeicInput,
  parseGpaInput,
  parseToeicInput,
  restoreCanonicalGpa100,
  restoreGpaInput,
  restoreToeicInput,
  type GpaType,
} from "./utils/scoreInput";
import {
  getRecordKey,
  getTargetKey,
  isComparisonBasis,
  parseSavedTargets,
  type ComparisonBasis,
  type Target,
} from "./utils/targets";
import {
  readSimulatorStorageSnapshot,
  STORAGE_KEYS,
  writeSimulatorStorageValue,
  type SimulatorStorageKey,
} from "./utils/storage";
import {
  prepareDepartmentRecords,
  prepareExceptionDepartmentRecords,
  type ExceptionDepartmentRecord,
} from "./utils/dataValidation";
import { focusElement } from "./utils/focusManagement";
import {
  getDataConfidence,
  type DecisionCandidate,
} from "./utils/decisionSupport";

import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Moon,
  School,
  Star,
  Sun,
} from "lucide-react";

// Static database imports validated before use
import rawStandardData from "./data/편입_성적_통합.json";
import { TRANSFER_ADMISSION_LINKS } from "./data/admissionLinks";

const TrendChart = lazy(() => import("./components/TrendChart"));

type ChartTarget = {
  univ: string;
  dept: string;
};

type Theme = "light" | "dark";

function getInitialTheme(savedTheme: string | null): Theme {
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const DEFAULT_TARGETS: Target[] = [
  { univ: "부산대학교", dept: "기계공학부" },
  { univ: "경북대학교", dept: "기계공학과" },
];

function buildValidatedData() {
  const preparedStandardData = prepareDepartmentRecords(rawStandardData);
  const standardRecords = preparedStandardData.records;

  return {
    standardRecords,
    standardDataIssueCount: preparedStandardData.affectedRecordCount,
    standardTargetKeys: new Set(
      standardRecords.map((record) => getRecordKey(record.대학명, record.학과)),
    ),
  };
}

type ValidatedData = ReturnType<typeof buildValidatedData>;
let validatedDataCache: ValidatedData | null = null;

function getValidatedData(): ValidatedData {
  if (validatedDataCache === null) {
    validatedDataCache = buildValidatedData();
  }

  return validatedDataCache;
}

type ExceptionHistoryState = {
  status: "loading" | "ready" | "error";
  recordsByKeyAndYear: ReadonlyMap<string, ExceptionDepartmentRecord>;
};

const EMPTY_EXCEPTION_RECORDS = new Map<string, ExceptionDepartmentRecord>();

function buildExceptionRecordMap(
  records: ExceptionDepartmentRecord[],
): ReadonlyMap<string, ExceptionDepartmentRecord> {
  return new Map(
    records.map((record) => [
      `${getRecordKey(record.대학명, record.학과)}::${record.연도}`,
      record,
    ]),
  );
}

function getSortedRecordYears(records: DepartmentRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.연도))).sort(
    (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
  );
}

function getRenamedHistoryText(history: DepartmentRecord[]): string {
  return history
    .flatMap((record) => (
      record.학과 !== record.학과_원본명 ? [`[${record.연도}년] ${record.학과_원본명}`] : []
    ))
    .join(" ➔ ");
}

export default function App() {
  const {
    standardRecords,
    standardDataIssueCount,
    standardTargetKeys,
  } = getValidatedData();
  const [exceptionHistory, setExceptionHistory] = useState<ExceptionHistoryState>({
    status: "loading",
    recordsByKeyAndYear: EMPTY_EXCEPTION_RECORDS,
  });

  // =========================================================================
  // 1. Core State Management (LocalStorage synced with fallback protection)
  // =========================================================================
  const [initialStorage] = useState(readSimulatorStorageSnapshot);
  const [storageAvailable, setStorageAvailable] = useState(
    initialStorage.available,
  );
  const [theme, setTheme] = useState<Theme>(() => (
    getInitialTheme(initialStorage.values[STORAGE_KEYS.theme])
  ));
  const [toeicInput, setToeicInput] = useState<string>(() => (
    restoreToeicInput(initialStorage.values[STORAGE_KEYS.toeic])
  ));

  const [gpaType, setGpaType] = useState<GpaType>(() => {
    const saved = initialStorage.values[STORAGE_KEYS.gpaType];
    return isGpaType(saved) ? saved : "100";
  });

  const [gpaRawInput, setGpaRawInput] = useState<string>(() => (
    restoreGpaInput(initialStorage.values[STORAGE_KEYS.gpaRaw], gpaType)
  ));
  const [canonicalGpa100, setCanonicalGpa100] = useState<number | null>(() => (
    restoreCanonicalGpa100(
      initialStorage.values[STORAGE_KEYS.gpa100],
      gpaRawInput,
      gpaType,
    )
  ));

  const [targets, setTargets] = useState<Target[]>(() => (
    parseSavedTargets(
      initialStorage.values[STORAGE_KEYS.targets],
      standardTargetKeys,
      DEFAULT_TARGETS,
    )
  ));

  const [comparisonBasis, setComparisonBasis] = useState<ComparisonBasis>(() => {
    const saved = initialStorage.values[STORAGE_KEYS.comparisonBasis];
    return isComparisonBasis(saved) ? saved : "latest";
  });

  const toeic = useMemo(() => parseToeicInput(toeicInput), [toeicInput]);
  const gpaRaw = useMemo(
    () => parseGpaInput(gpaRawInput, gpaType),
    [gpaRawInput, gpaType]
  );
  const gpa100 = gpaRaw === null ? null : canonicalGpa100;
  const persistStorageValue = useCallback((
    key: SimulatorStorageKey,
    value: string,
  ) => {
    if (!writeSimulatorStorageValue(key, value)) {
      setStorageAvailable(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    import("./data/편입_예외학과_통합.json")
      .then(({ default: rawExceptionData }) => {
        const records = prepareExceptionDepartmentRecords(
          rawExceptionData,
        ).records;

        if (!isCancelled) {
          setExceptionHistory({
            status: "ready",
            recordsByKeyAndYear: buildExceptionRecordMap(records),
          });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setExceptionHistory({
            status: "error",
            recordsByKeyAndYear: EMPTY_EXCEPTION_RECORDS,
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (toeic === null) {
      return;
    }

    persistStorageValue(STORAGE_KEYS.toeic, toeic.toString());
  }, [persistStorageValue, toeic]);

  useEffect(() => {
    persistStorageValue(STORAGE_KEYS.gpaType, gpaType);
  }, [gpaType, persistStorageValue]);

  useEffect(() => {
    if (gpaRaw === null) {
      return;
    }

    persistStorageValue(STORAGE_KEYS.gpaRaw, gpaRaw.toString());
  }, [gpaRaw, persistStorageValue]);

  useEffect(() => {
    if (canonicalGpa100 === null) {
      return;
    }

    persistStorageValue(STORAGE_KEYS.gpa100, canonicalGpa100.toString());
  }, [canonicalGpa100, persistStorageValue]);

  useEffect(() => {
    persistStorageValue(STORAGE_KEYS.targets, JSON.stringify(targets));
  }, [persistStorageValue, targets]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#020617" : "#f5f7fb");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    persistStorageValue(STORAGE_KEYS.theme, nextTheme);
  }, [persistStorageValue, theme]);

  const changeComparisonBasis = useCallback((nextBasis: ComparisonBasis) => {
    setComparisonBasis(nextBasis);
    persistStorageValue(STORAGE_KEYS.comparisonBasis, nextBasis);
  }, [persistStorageValue]);

  // Selected major for chart visualization
  const [chartTarget, setChartTarget] = useState<ChartTarget | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("toeic_orig");
  const [isTargetBasketVisible, setIsTargetBasketVisible] = useState(true);
  const chartRegionRef = useRef<HTMLDivElement | null>(null);
  const chartTriggerRef = useRef<HTMLButtonElement | null>(null);

  const recordsByDepartment = useMemo(() => {
    const grouped = new Map<string, DepartmentRecord[]>();

    standardRecords.forEach((record) => {
      const key = getRecordKey(record.대학명, record.학과);
      const existing = grouped.get(key);

      if (existing) {
        existing.push(record);
        return;
      }

      grouped.set(key, [record]);
    });

    return grouped;
  }, [standardRecords]);

  const recentRecordYears = useMemo(
    () => getSortedRecordYears(standardRecords).slice(0, 3),
    [standardRecords],
  );

  /**
   * (대학, 표준명, 연도) → 그 해 실제로 뽑은 모집단위 이름들.
   *
   * 사용자는 보통 2026 학과명으로 찾아 담는데, 그 과가 24~25에 여러 전공으로
   * 쪼개져 있었으면 이력이 통째로 비어 '왜 없지, 이거 왜 따로 해놨냐'가 된다.
   * 표준명(학과/학부/전공 꼬리와 괄호를 뗀 이름)이 같은 모집단위를 그 해에서
   * 찾아 알려주면, 없는 게 아니라 다른 칸에 있다는 걸 짚어줄 수 있다.
   *
   * 이름이 바뀐 것인지 그 해에 그 세부전공만 안 뽑은 것인지는 이 데이터로
   * 구별하지 못한다. 그래서 화면 문구도 '같은 계열의 다른 모집단위'까지만
   * 말하고 승계 관계라고 단정하지 않는다.
   */
  const departmentsByGroupAndYear = useMemo(() => {
    const grouped = new Map<string, string[]>();

    standardRecords.forEach((record) => {
      const groupKey = [
        record.대학명,
        getDepartmentGroupKey(record.학과),
        record.연도,
      ].join("|");
      const existing = grouped.get(groupKey);

      if (existing === undefined) {
        grouped.set(groupKey, [record.학과]);
      } else if (!existing.includes(record.학과)) {
        existing.push(record.학과);
      }
    });

    return grouped;
  }, [standardRecords]);
  const targetKeySet = useMemo(() => new Set(targets.map(getTargetKey)), [targets]);

  const latestExplorerRecords = useMemo(() => {
    const latest = new Map<string, DepartmentRecord>();

    standardRecords.forEach((record) => {
      const key = getRecordKey(record.대학명, record.학과);
      const existing = latest.get(key);

      if (!existing || getRecordYear(record) > getRecordYear(existing)) {
        latest.set(key, record);
      }
    });

    return Array.from(latest.values());
  }, [standardRecords]);

  // =========================================================================
  // 3. Basket Management Helpers
  // =========================================================================
  const toggleTarget = useCallback((univ: string, dept: string) => {
    const target = { univ, dept };
    const targetKey = getTargetKey(target);

    setTargets((currentTargets) => (
      currentTargets.some((current) => getTargetKey(current) === targetKey)
        ? currentTargets.filter((current) => getTargetKey(current) !== targetKey)
        : [...currentTargets, target]
    ));
  }, []);
  const closeChart = useCallback(() => {
    setChartTarget(null);
    window.requestAnimationFrame(() => focusElement(chartTriggerRef.current));
  }, []);
  const selectChart = useCallback((univ: string, dept: string, trigger: HTMLButtonElement) => {
    chartTriggerRef.current = trigger;
    setChartTarget({ univ, dept });
  }, []);

  useEffect(() => {
    if (chartTarget !== null && !targetKeySet.has(getTargetKey(chartTarget))) {
      setChartTarget(null);
    }
  }, [chartTarget, targetKeySet]);

  useEffect(() => {
    if (chartTarget === null) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      focusElement(chartRegionRef.current);
      chartRegionRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [chartTarget]);

  useEffect(() => {
    const targetBasket = document.getElementById("target-basket");

    if (targetBasket === null || typeof window.IntersectionObserver === "undefined") {
      setIsTargetBasketVisible(false);
      return;
    }

    const observer = new window.IntersectionObserver(([entry]) => {
      setIsTargetBasketVisible(entry?.isIntersecting ?? false);
    }, { threshold: 0.01 });

    observer.observe(targetBasket);
    return () => observer.disconnect();
  }, []);

  const handleToeicInputChange = useCallback((value: string) => {
    setToeicInput(limitToeicInput(value));
  }, []);
  const handleToeicInputBlur = useCallback(() => {
    setToeicInput((current) => normalizeToeicInput(current));
  }, []);
  const handleGpaRawInputChange = useCallback((value: string) => {
    const limitedInput = limitGpaInput(value, gpaType);
    setGpaRawInput(limitedInput);

    const parsedGpa = parseGpaInput(limitedInput, gpaType);
    if (parsedGpa !== null) {
      setCanonicalGpa100(getGpa100ForInput(gpaType, parsedGpa));
    }
  }, [gpaType]);
  const handleGpaRawInputBlur = useCallback(() => {
    const normalizedInput = normalizeGpaInput(gpaRawInput, gpaType);
    const parsedGpa = parseGpaInput(normalizedInput, gpaType);

    setGpaRawInput(normalizedInput);
    if (parsedGpa !== null) {
      setCanonicalGpa100(getGpa100ForInput(gpaType, parsedGpa));
    }
  }, [gpaRawInput, gpaType]);
  const handleGpaTypeChange = useCallback((nextType: GpaType) => {
    if (nextType === gpaType) return;

    if (gpaRaw === null || canonicalGpa100 === null) {
      setGpaType(nextType);
      setGpaRawInput("");
      return;
    }

    const convertedGpa = convertGpa100ToInput(canonicalGpa100, nextType);
    setGpaType(nextType);
    setGpaRawInput(convertedGpa === null ? "" : convertedGpa.toString());
  }, [canonicalGpa100, gpaRaw, gpaType]);

  const targetSummaries = useMemo<TargetSummary[]>(() => {
    return targets.flatMap((target) => {
      const key = getTargetKey(target);
      const history = recordsByDepartment.get(key) ?? [];
      const latestRecord = getLatestRecord(history);

      if (!latestRecord) {
        return [];
      }

      const historyByYear = new Map(history.map((record) => [record.연도, record]));

      // 최신 한 해만 대조하면 그 해가 유독 빡셌는지 무른 해였는지 알 수 없다.
      // 연도마다 배점과 환산식이 달라(강원대 2026은 전적대 미반영 등) 합격선만
      // 갈아끼우면 안 되고 내 지표합도 그 해 식으로 다시 계산해야 한다.
      const yearlyComparisons = recentRecordYears.map((year) => {
        const yearRecord = historyByYear.get(year) ?? null;
        const comparableYearRecord = yearRecord !== null
          && isComparableRecord(yearRecord)
          ? yearRecord
          : null;

        return {
          year,
          hasRecord: yearRecord !== null,
          siblingDepartments: yearRecord !== null
            ? []
            : (departmentsByGroupAndYear.get([
              target.univ,
              getDepartmentGroupKey(target.dept),
              year,
            ].join("|")) ?? []).filter((dept) => dept !== target.dept),
          score: calculateScore(
            target.univ,
            year,
            toeic,
            gpa100,
            comparableYearRecord,
            target.dept,
          ),
        };
      });

      const comparableRecord = pickBasisRecord(
        yearlyComparisons,
        historyByYear,
        comparisonBasis,
      ) ?? getLatestComparableRecord(history);
      const referenceRecord = comparableRecord ?? latestRecord;
      const score = calculateScore(
        target.univ,
        referenceRecord.연도,
        toeic,
        gpa100,
        comparableRecord ?? null,
        target.dept,
      );
      const deficit = calculateScoreDeficit(score.diff);
      const analysis = deficit === null
        ? null
        : analyzeScoreDeficit(
          target.univ,
          referenceRecord.연도,
          gpaType,
          deficit,
          gpaRaw,
          toeic,
          target.dept,
        );
      const formula = getConversionFormula(
        target.univ,
        referenceRecord.연도,
        target.dept,
      );
      const formulaNotices = [
        formula?.provenance === "assumed-from-other-year"
          ? "이 연도의 모집요강을 확보하지 못해 인접 연도와 동일한 공식으로 가정했습니다."
          : null,
        formula?.confidence === "estimated"
          ? "이 연도의 환산식은 확인 가능한 배점을 바탕으로 한 추정값이 포함되어 있습니다."
          : formula?.confidence === "lookup-approximation"
            ? "이 대학의 구간 환산표는 연속식으로 근사한 참고값이며 실제 환산점수와 차이가 날 수 있습니다."
            : null,
      ].filter((notice): notice is string => notice !== null);

      return [{
        key,
        target,
        referenceRecord,
        score,
        deficit,
        analysis,
        comparisonYearNotice: getComparisonYearNotice(
          comparisonBasis,
          comparableRecord,
          latestRecord,
        ),
        formulaNotice: formulaNotices.length > 0
          ? formulaNotices.join(" ")
          : null,
        renamedHistoryText: getRenamedHistoryText(history),
        yearlyComparisons,
        recentHistoryRows: recentRecordYears.map((year) => ({
          year,
          record: historyByYear.get(year) ?? null,
          siblingDepartments: yearlyComparisons.find(
            (comparison) => comparison.year === year,
          )?.siblingDepartments ?? [],
          exclusionReason: exceptionHistory.recordsByKeyAndYear.get(
            `${key}::${year}`
          )?.제거사유 ?? null,
          exceptionLookupStatus: exceptionHistory.status,
        })),
      }];
    });
  }, [
    comparisonBasis,
    departmentsByGroupAndYear,
    exceptionHistory,
    gpaRaw,
    gpa100,
    gpaType,
    recentRecordYears,
    recordsByDepartment,
    targets,
    toeic,
  ]);

  const decisionCandidates = useMemo<DecisionCandidate[]>(() => (
    targetSummaries.map((summary) => ({
      key: summary.key,
      target: summary.target,
      referenceRecord: summary.referenceRecord,
      score: summary.score,
      comparableYearCount: summary.yearlyComparisons.filter(
        (comparison) => comparison.score.acceptedIndexSum !== null,
      ).length,
      dataConfidence: getDataConfidence(summary.referenceRecord),
    }))
  ), [targetSummaries]);

  return (
    <div className="app-container">
      {/* ===================================================================
          AESTHETIC HEADER BANNER
          =================================================================== */}
      <header className="app-header">
        <div className="header-title-block">
          <h1>
            지역거점국립대 다용도 편입 플랫폼
            <span className="badge-2026">3개년 통합</span>
          </h1>
          <p>
            <span className="header-description-desktop">
              전국 9대 거점국립대학의 2024~2026학년도 일반편입{" "}
              {standardRecords.length.toLocaleString("ko-KR")}개 입결 레코드 /{" "}
              {standardTargetKeys.size.toLocaleString("ko-KR")}개 모집단위 동적 비교 플랫폼
            </span>
            <span className="header-description-mobile">
              2024~2026학년도 ·{" "}
              {standardRecords.length.toLocaleString("ko-KR")}개 입결 ·{" "}
              {standardTargetKeys.size.toLocaleString("ko-KR")}개 모집단위
            </span>
          </p>
          <aside className="ai-disclaimer" aria-label="서비스 이용 주의사항">
            <div className="ai-disclaimer-title">
              <AlertTriangle size={17} aria-hidden="true" />
              AI 참고용 · 지원 전 공식 모집요강 확인
            </div>
            <p>
              본 서비스는 AI를 활용해 제작된 참고용 시뮬레이터로, 데이터·환산식·계산
              결과가 부정확하거나 최신 모집요강과 다를 수 있습니다. 지원 전 각 대학
              입학처의 공식 모집요강과 공지를 통한 2차 검증은 필수입니다. 본 서비스는
              합격 가능성이나 정보의 완전성·정확성을 보증하지 않으며, 최종 지원 판단과
              그 결과에 대한 책임은 이용자에게 있습니다.
            </p>
          </aside>
          <details className="admission-links">
            <summary>
              <span>
                <School size={17} aria-hidden="true" />
                편입학 홈페이지 확인
              </span>
              <ChevronDown size={17} aria-hidden="true" />
            </summary>
            <div
              className="admission-links-grid"
              aria-label="대학교별 공식 편입학 홈페이지"
            >
              {TRANSFER_ADMISSION_LINKS.map(({ university, url }) => (
                <a
                  key={university}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${university} 편입학 홈페이지 새 탭에서 열기`}
                >
                  <UniversityName university={university} logoSize="small" />
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              ))}
            </div>
          </details>
        </div>
        <div className="header-actions">
          <UpdateNotice />
          <button
            type="button"
            className="theme-toggle"
            aria-label={`${theme === "dark" ? "라이트" : "다크"} 모드로 전환`}
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
            <span>{theme === "dark" ? "라이트 모드" : "다크 모드"}</span>
          </button>
          <div className="header-status">
            <School size={20} color="#10b981" />
            <span>9개 대학교 연동 중</span>
          </div>
        </div>
      </header>

      {standardDataIssueCount > 0 && (
        <div className="data-quality-warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            데이터 품질 검사에서 {standardDataIssueCount}개 입결 레코드의 비정상 값을
            자동으로 제외하거나 비공개 처리했습니다.
          </p>
        </div>
      )}

      {!storageAvailable && (
        <div className="storage-warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            브라우저 저장소를 사용할 수 없어 현재 입력과 지망 목록은 이번 세션에서만
            유지됩니다.
          </p>
        </div>
      )}

      {exceptionHistory.status === "error" && (
        <div className="storage-warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            예외 전형 이력을 불러오지 못해 일부 연도의 모집 여부를 표시할 수 없습니다.
          </p>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="spec-area">
          <SpecInputPanel
            toeicInput={toeicInput}
            toeic={toeic}
            gpaType={gpaType}
            gpaRawInput={gpaRawInput}
            gpaRaw={gpaRaw}
            gpa100={gpa100}
            onToeicInputChange={handleToeicInputChange}
            onToeicInputBlur={handleToeicInputBlur}
            onGpaRawInputChange={handleGpaRawInputChange}
            onGpaRawInputBlur={handleGpaRawInputBlur}
            onGpaTypeChange={handleGpaTypeChange}
          />
        </div>

        <DepartmentExplorer
          records={latestExplorerRecords}
          targetKeys={targetKeySet}
          onToggleTarget={toggleTarget}
        />

        <a
          className={`mobile-target-dock ${isTargetBasketVisible ? "mobile-target-dock--hidden" : ""}`}
          href="#target-basket"
          aria-hidden={isTargetBasketVisible}
          aria-label={`지망 대학 장바구니 보기, 현재 ${targets.length}개`}
          tabIndex={isTargetBasketVisible ? -1 : undefined}
        >
          <Star size={18} fill="currentColor" aria-hidden="true" />
          <span>지망 보기</span>
          <strong>{targets.length}</strong>
        </a>

        <section className="dashboard-column results-area">
          <DecisionSupportPanel
            candidates={decisionCandidates}
            toeic={toeic}
            gpaRaw={gpaRaw}
            gpaType={gpaType}
          />

          {chartTarget !== null && (
            <div className="chart-region" ref={chartRegionRef} tabIndex={-1}>
              <ChartErrorBoundary
                key={`${chartTarget.univ}::${chartTarget.dept}`}
                onClose={closeChart}
              >
                <Suspense
                  fallback={(
                    <div className="chart-card" role="status">
                      입결 차트를 불러오는 중입니다.
                    </div>
                  )}
                >
                  <TrendChart
                    focusedTarget={chartTarget}
                    targets={targets}
                    recordsByDepartment={recordsByDepartment}
                    metric={chartMetric}
                    onMetricChange={setChartMetric}
                    onClose={closeChart}
                  />
                </Suspense>
              </ChartErrorBoundary>
            </div>
          )}

          <TargetBasket
            summaries={targetSummaries}
            targetCount={targets.length}
            toeic={toeic}
            gpaRaw={gpaRaw}
            gpaType={gpaType}
            comparisonBasis={comparisonBasis}
            onComparisonBasisChange={changeComparisonBasis}
            onToggleTarget={toggleTarget}
            onSelectChart={selectChart}
          />
        </section>
      </div>

      <TransferReviewLinks />
    </div>
  );
}
