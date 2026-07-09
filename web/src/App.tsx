import { useState, useEffect, useMemo } from "react";
import { 
  calculateScore, 
  calculateAcceptedScoreBreakdown,
  convertGpaTo100Scale, 
  analyzeScoreDeficit,
  type DepartmentRecord
} from "./utils/converter";

import { 
  Search, 
  Star, 
  Trash2, 
  TrendingUp, 
  AlertTriangle, 
  School, 
  BookOpen, 
  UserCheck, 
  X, 
  ChevronLeft, 
  ChevronRight,
  HelpCircle
} from "lucide-react";

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

// Static database imports (casted for TS safety)
import rawStandardData from "./data/편입_성적_통합.json";

const standardRecords = rawStandardData as DepartmentRecord[];

type GpaType = "100" | "4.5" | "4.3";
type Target = { univ: string; dept: string };
type ChartDataPoint = {
  year: string;
  "영어 원점수 (TOEIC)": number | null;
  "영어 환산점수": number | null;
  "전적대 백분위 (GPA)": number | null;
  "전적대 환산점수": number | null;
  "실질 경쟁률": number | null;
  originalName: string;
};
type ChartDataKey = Exclude<keyof ChartDataPoint, "year" | "originalName">;
type ChartAxisDomain = readonly [number, number] | readonly ["auto", "auto"];

const GPA_SCALE_MAX: Record<Exclude<GpaType, "100">, 4.5 | 4.3> = {
  "4.5": 4.5,
  "4.3": 4.3,
};

const DEFAULT_TARGETS: Target[] = [
  { univ: "부산대학교", dept: "기계공학부" },
  { univ: "경북대학교", dept: "기계공학과" },
];

const CHART_METRIC_CONFIG = {
  toeic_orig: {
    label: "공인영어 원점수 (TOEIC)",
    dataKey: "영어 원점수 (TOEIC)",
    color: "var(--primary-color)",
  },
  toeic_conv: {
    label: "공인영어 환산점수",
    dataKey: "영어 환산점수",
    color: "var(--primary-color)",
  },
  gpa_orig: {
    label: "전적대학 백분위 평균",
    dataKey: "전적대 백분위 (GPA)",
    color: "var(--secondary-color)",
  },
  gpa_conv: {
    label: "전적대학 환산점수",
    dataKey: "전적대 환산점수",
    color: "var(--secondary-color)",
  },
  competition: {
    label: "실질 경쟁률",
    dataKey: "실질 경쟁률",
    color: "#ef4444",
  },
} as const satisfies Record<string, { label: string; dataKey: ChartDataKey; color: string }>;

type ChartMetric = keyof typeof CHART_METRIC_CONFIG;

// Korean consonant-initial helper maps
const KOREAN_CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

function getChosung(text: string | null | undefined): string {
  if (!text) return "";
  const str = String(text);
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code >= 0 && code <= 11172) {
      const chosungIndex = Math.floor(code / 588);
      result += KOREAN_CHOSUNG[chosungIndex];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

function getRecordKey(univ: string, dept: string): string {
  return `${univ}:::${dept}`;
}

function isGpaType(value: string | null): value is GpaType {
  return value === "100" || value === "4.5" || value === "4.3";
}

function isChartMetric(value: string): value is ChartMetric {
  return value in CHART_METRIC_CONFIG;
}

function isTarget(value: unknown): value is Target {
  return (
    typeof value === "object" &&
    value !== null &&
    "univ" in value &&
    "dept" in value &&
    typeof value.univ === "string" &&
    typeof value.dept === "string"
  );
}

function parseSavedTargets(saved: string | null): Target[] {
  if (!saved) {
    return DEFAULT_TARGETS;
  }

  const parsed: unknown = JSON.parse(saved);
  return Array.isArray(parsed) && parsed.every(isTarget) ? parsed : DEFAULT_TARGETS;
}

function getRecordYear(record: DepartmentRecord): number {
  const year = Number.parseInt(record.연도, 10);
  return Number.isFinite(year) ? year : Number.NEGATIVE_INFINITY;
}

function getLatestRecord(records: DepartmentRecord[]): DepartmentRecord | undefined {
  return records.reduce<DepartmentRecord | undefined>((latest, record) => {
    if (!latest) return record;
    return getRecordYear(record) > getRecordYear(latest) ? record : latest;
  }, undefined);
}

function getSortedRecordYears(records: DepartmentRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.연도))).sort(
    (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
  );
}

function getGpaMax(gpaType: GpaType): number {
  return gpaType === "100" ? 100 : GPA_SCALE_MAX[gpaType];
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getGpa100ForInput(gpaType: GpaType, gpaRaw: number): number {
  if (gpaType === "100") {
    return clamp(gpaRaw, 0, 100);
  }

  return convertGpaTo100Scale(gpaRaw, GPA_SCALE_MAX[gpaType]);
}

function convertGpa100ToInput(gpa100: number, targetType: GpaType): number {
  const normalizedGpa100 = clamp(gpa100, 0, 100);

  if (targetType === "100") {
    return roundToTwoDecimals(normalizedGpa100);
  }

  const max = GPA_SCALE_MAX[targetType];
  const raw = normalizedGpa100 <= 60
    ? 1
    : 1 + ((normalizedGpa100 - 60) * (max - 1)) / 40;

  return roundToTwoDecimals(clamp(roundToStep(raw, 0.05), 0, max));
}

function calculateChartDomain(data: ChartDataPoint[], dataKey: ChartDataKey): ChartAxisDomain {
  const values = data
    .map((point) => point[dataKey])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) {
    return ["auto", "auto"];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const padding = Math.max(span * 0.12, Math.abs(max) * 0.03, 1);

  if (span === 0) {
    return [roundToTwoDecimals(Math.max(0, min - padding)), roundToTwoDecimals(max + padding)];
  }

  return [roundToTwoDecimals(Math.max(0, min - padding)), roundToTwoDecimals(max + padding)];
}

export default function App() {
  // =========================================================================
  // 1. Core State Management (LocalStorage synced with fallback protection)
  // =========================================================================
  const [toeic, setToeic] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("t27_toeic");
      const val = saved ? parseInt(saved, 10) : 850;
      return isNaN(val) ? 850 : val;
    } catch {
      return 850;
    }
  });

  const [gpaType, setGpaType] = useState<GpaType>(() => {
    try {
      const saved = localStorage.getItem("t27_gpa_type");
      return isGpaType(saved) ? saved : "100";
    } catch {
      return "100";
    }
  });

  const [gpaRaw, setGpaRaw] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("t27_gpa_raw");
      const val = saved ? parseFloat(saved) : 90;
      return isNaN(val) ? 90 : val;
    } catch {
      return 90;
    }
  });

  const [targets, setTargets] = useState<Target[]>(() => {
    try {
      const saved = localStorage.getItem("t27_targets");
      return parseSavedTargets(saved);
    } catch {
      return DEFAULT_TARGETS;
    }
  });

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("t27_toeic", toeic.toString());
    } catch {
      // storage unavailable (private browsing, quota exceeded, etc.) - ignore
    }
  }, [toeic]);

  useEffect(() => {
    try {
      localStorage.setItem("t27_gpa_type", gpaType);
    } catch {
      // storage unavailable (private browsing, quota exceeded, etc.) - ignore
    }
  }, [gpaType]);

  useEffect(() => {
    try {
      localStorage.setItem("t27_gpa_raw", gpaRaw.toString());
    } catch {
      // storage unavailable (private browsing, quota exceeded, etc.) - ignore
    }
  }, [gpaRaw]);

  useEffect(() => {
    try {
      localStorage.setItem("t27_targets", JSON.stringify(targets));
    } catch {
      // storage unavailable (private browsing, quota exceeded, etc.) - ignore
    }
  }, [targets]);

  // Derived 100-scale GPA computation
  const gpa100 = useMemo(() => {
    if (gpaType === "100") return gpaRaw;
    return convertGpaTo100Scale(gpaRaw, GPA_SCALE_MAX[gpaType]);
  }, [gpaRaw, gpaType]);

  // =========================================================================
  // 2. Filter & Navigation States
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnivs, setSelectedUnivs] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected major for chart visualization
  const [chartTarget, setChartTarget] = useState<{ univ: string; dept: string } | null>({
    univ: "부산대학교",
    dept: "기계공학부"
  });
  const [chartMetric, setChartMetric] = useState<ChartMetric>("toeic_orig");

  // Compile list of unique standard universities
  const universities = useMemo(() => {
    const s = new Set<string>();
    standardRecords.forEach(r => s.add(r.대학명));
    return Array.from(s).sort();
  }, []);

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
  }, []);

  const recentRecordYears = useMemo(() => getSortedRecordYears(standardRecords).slice(0, 3), []);

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
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUnivs]);

  // Filtered department list for exploration section (Deduplicated to latest year name)
  const filteredDepartments = useMemo(() => {
    // Detect if search query is Korean consonant-only (chosung)
    const isChosungOnly = /^[ㄱ-ㅎ\s]+$/.test(searchQuery);
    const queryNormalized = searchQuery.toLowerCase().replace(/\s/g, "");

    return latestExplorerRecords.filter(r => {
      // University matching
      if (selectedUnivs.length > 0 && !selectedUnivs.includes(r.대학명)) {
        return false;
      }
      // Text query matching (support normal keywords AND chosung-initial matching)
      if (searchQuery.trim() !== "") {
        if (isChosungOnly) {
          const deptChosung = getChosung(r.학과);
          const origChosung = getChosung(r.학과_원본명);
          if (!deptChosung.includes(queryNormalized) && !origChosung.includes(queryNormalized)) {
            return false;
          }
        } else {
          const dStandard = r.학과.toLowerCase().replace(/\s/g, "");
          const dOriginal = r.학과_원본명.toLowerCase().replace(/\s/g, "");
          if (!dStandard.includes(queryNormalized) && !dOriginal.includes(queryNormalized)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [latestExplorerRecords, searchQuery, selectedUnivs]);

  // Paginated explorer list
  const paginatedExplorerList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDepartments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDepartments, currentPage]);

  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);

  // =========================================================================
  // 3. Basket Management Helpers
  // =========================================================================
  const toggleTarget = (univ: string, dept: string) => {
    const isAdded = targets.some(t => t.univ === univ && t.dept === dept);
    if (isAdded) {
      setTargets(targets.filter(t => !(t.univ === univ && t.dept === dept)));
    } else {
      setTargets([...targets, { univ, dept }]);
    }
  };

  const isTargetAdded = (univ: string, dept: string) => {
    return targets.some(t => t.univ === univ && t.dept === dept);
  };

  const handleGpaTypeChange = (nextType: GpaType) => {
    if (nextType === gpaType) return;

    const currentGpa100 = getGpa100ForInput(gpaType, gpaRaw);
    setGpaType(nextType);
    setGpaRaw(convertGpa100ToInput(currentGpa100, nextType));
  };

  // =========================================================================
  // 4. Computation of Historical Trend Chart Data (With Converted Score Support)
  // =========================================================================
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!chartTarget) return [];
    
    // Extract 24, 25, 26 records for this specific major in this university
    const history = recordsByDepartment.get(getRecordKey(chartTarget.univ, chartTarget.dept)) ?? [];
    
    // Sort ascending by year for line chart continuity
    const sortedHistory = [...history].sort((a, b) => parseInt(a.연도) - parseInt(b.연도));
    
    return sortedHistory.map(r => {
      const ratio = r.모집인원 && r.지원인원 && r.모집인원 > 0 
        ? Math.round((r.지원인원 / r.모집인원) * 100) / 100 
        : null;
        
      // Dynamic computation of standard conversion values of that historical year
      const acceptedScore = calculateAcceptedScoreBreakdown(r);

      return {
        year: `${r.연도}년도`,
        "영어 원점수 (TOEIC)": r.최종합격_토익원점수, // Keep null if non-disclosed
        "영어 환산점수": acceptedScore.englishConv,
        "전적대 백분위 (GPA)": r.최종합격_학점원점수_100점만점,
        "전적대 환산점수": acceptedScore.gpaConv,
        "실질 경쟁률": ratio,
        originalName: r.학과_원본명
      };
    });
  }, [chartTarget, recordsByDepartment]);

  const selectedChartMetric = CHART_METRIC_CONFIG[chartMetric];
  const chartYAxisDomain = useMemo(
    () => calculateChartDomain(chartData, selectedChartMetric.dataKey),
    [chartData, selectedChartMetric.dataKey]
  );

  return (
    <div className="app-container">
      {/* ===================================================================
          AESTHETIC HEADER BANNER
          =================================================================== */}
      <header className="app-header">
        <div className="header-title-block">
          <h1>
            Team27 거점국립대 편입 성적 시뮬레이터
            <span className="badge-2026">3개년 통합</span>
          </h1>
          <p>전국 9대 거점국립대학의 2024~2026학년도 일반편입 1,923개 학과의 최종합격 평균 점수 동적 비교 플랫폼</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <School size={20} color="#10b981" />
          <span style={{ fontSize: "14px", fontWeight: "700" }}>9개 대학교 연동 중</span>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* ===================================================================
            LEFT COLUMN: MY SPEC PROFILE (입력창 및 경고 디스클레이머)
            =================================================================== */}
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card">
            <h2 className="card-title">
              <UserCheck size={20} color="#1e3a8a" />
              내 편입 스펙 입력
            </h2>

            {/* TOEIC INPUT */}
            <div className="spec-input-group">
              <label>공인영어성적 (TOEIC)</label>
              <div className="input-with-suffix" style={{ marginBottom: "10px" }}>
                <input 
                  type="number" 
                  min={100} 
                  max={990} 
                  step={5}
                  value={toeic} 
                  onChange={(e) => setToeic(parseInt(e.target.value) || 0)} 
                />
                <span>점 / 990점</span>
              </div>
              <input 
                type="range" 
                min={100} 
                max={990} 
                step={5} 
                value={toeic} 
                onChange={(e) => setToeic(parseInt(e.target.value))} 
                style={{ width: "100%", accentColor: "var(--primary-color)" }}
              />
            </div>

            {/* GPA INPUT WITH SCALES */}
            <div className="spec-input-group">
              <label>전적대학 평점 성적 (GPA)</label>
              <div className="spec-tabs">
                <button 
                  className={`spec-tab ${gpaType === "100" ? "active" : ""}`}
                  onClick={() => handleGpaTypeChange("100")}
                >
                  백분위 (100)
                </button>
                <button 
                  className={`spec-tab ${gpaType === "4.5" ? "active" : ""}`}
                  onClick={() => handleGpaTypeChange("4.5")}
                >
                  4.5 만점
                </button>
                <button 
                  className={`spec-tab ${gpaType === "4.3" ? "active" : ""}`}
                  onClick={() => handleGpaTypeChange("4.3")}
                >
                  4.3 만점
                </button>
              </div>

              <div className="input-with-suffix">
                <input 
                  type="number" 
                  step={gpaType === "100" ? 1 : 0.05}
                  min={gpaType === "100" ? 0 : 0.0}
                  max={getGpaMax(gpaType)}
                  value={gpaRaw} 
                  onChange={(e) => setGpaRaw(parseFloat(e.target.value) || 0)} 
                />
                <span>점 / {gpaType === "100" ? "100" : gpaType}점</span>
              </div>

              {/* Dynamic computed 백분위 display */}
              {gpaType !== "100" && (
                <div style={{ marginTop: "10px", fontSize: "13px", fontWeight: "600", color: "var(--secondary-color)" }}>
                  💡 100점 백분위 환산 추정치: <strong style={{fontSize: "14px"}}>{gpa100}점</strong>
                </div>
              )}
            </div>

            {/* ⚠️ REQUIRED WARNING DISCLAIMER FOR GPA */}
            <div className="disclaimer-box">
              <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p className="disclaimer-text">
                4.5 및 4.3 평점 환산은 일반적인 선형 근사치이며, 대학별 산정 기준과 다를 수 있습니다. 정확한 비교를 위해 성적 증명서 상의 <strong>'백분위 성적(100만점)'</strong>을 직접 입력하는 것을 강력히 권장합니다.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            RIGHT COLUMN: SELECTED TARGET BASKET (지망 대학 동시 비교 대시보드)
            =================================================================== */}
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 3-YEAR HISTORICAL TREND VISUALIZATION CARD */}
          {chartTarget && chartData.length > 0 && (
            <div className="chart-card">
              <div className="chart-header-row">
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)" }}>
                    📈 {chartTarget.univ} {chartTarget.dept} 입결 대시보드
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500", marginTop: "2px" }}>
                    현재 선택 지표: {selectedChartMetric.label}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select 
                    style={{ 
                      padding: "6px 12px", 
                      fontSize: "12px", 
                      fontWeight: "700", 
                      borderRadius: "8px", 
                      border: "1px solid var(--border-color)",
                      outline: "none"
                    }}
                    value={chartMetric}
                    onChange={(e) => {
                      if (isChartMetric(e.target.value)) {
                        setChartMetric(e.target.value);
                      }
                    }}
                  >
                    <option value="toeic_orig">영어 원점수 (TOEIC)</option>
                    <option value="toeic_conv">영어 환산점수</option>
                    <option value="gpa_orig">학점 원점수 (백분위)</option>
                    <option value="gpa_conv">학점 환산점수</option>
                    <option value="competition">실질 경쟁률</option>
                  </select>
                  <button className="btn-close-chart" onClick={() => setChartTarget(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fontWeight: "600" }} />
                    <YAxis 
                      domain={chartYAxisDomain}
                      tick={{ fontSize: 11, fontWeight: "600" }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", color: "white", borderRadius: "10px", fontSize: "12px" }}
                      itemStyle={{ color: "white" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "600" }} />
                    <Line 
                      type="monotone" 
                      connectNulls={true}
                      dataKey={selectedChartMetric.dataKey} 
                      stroke={selectedChartMetric.color}
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="trend-disclaimer">
                * 성적 비공개(1인 등록 등) 또는 미모집인 연도는 지표가 공백으로 우회되어 표시됩니다 (라인 연속 연결 지원).
              </p>
            </div>
          )}

          {/* TARGET BASKET CONTENT */}
          <div className="card" style={{ flex: 1 }}>
            <h2 className="card-title">
              <Star size={20} color="var(--status-borderline)" fill="var(--status-borderline)" />
              내 지망 대학 장바구니 (동시 환산 비교)
            </h2>

            {targets.length === 0 ? (
              <div className="basket-empty">
                <BookOpen size={40} color="var(--text-muted)" />
                <p>현재 담겨 있는 지망 대학이 없습니다.</p>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  하단의 <strong>전체 모집단위 리스트</strong>에서 관심 있는 학과 우측의 '⭐️ 지망 추가' 버튼을 눌러보세요!
                </span>
              </div>
            ) : (
              <div className="basket-grid">
                {targets.map((t, index) => {
                  const history = recordsByDepartment.get(getRecordKey(t.univ, t.dept)) ?? [];
                  const referenceRecord = getLatestRecord(history);

                  if (!referenceRecord) return null;

                  // Perform calculation
                  const res = calculateScore(t.univ, referenceRecord.연도, toeic, gpa100, referenceRecord);

                  // Extract 3-year history for mini table display
                  const historyByYear = new Map(history.map((record) => [record.연도, record]));

                  const deficit = res.diff !== null ? -res.diff : 0;
                  const analysis = analyzeScoreDeficit(t.univ, referenceRecord.연도, gpaType, deficit);

                  return (
                    <div className="target-card" key={`${t.univ}-${t.dept}-${index}`}>
                      <div className="target-card-header">
                        <div className="univ-emblem-badge">{t.univ.charAt(0)}</div>
                        <div className="target-card-meta">
                          <h3>{t.dept}</h3>
                          <p>{t.univ}</p>
                          {(referenceRecord.합격자기준 === "최초" || referenceRecord.합격자기준 === "최종") && (
                            <span
                              style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)" }}
                              title="이 대학이 공개하는 합격자 평균 성적이 최초합격자 기준인지 최종등록자 기준인지를 나타냅니다"
                            >
                              [{referenceRecord.합격자기준}합격자 기준]
                            </span>
                          )}
                        </div>
                        <button className="btn-remove-target" onClick={() => toggleTarget(t.univ, t.dept)}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="target-card-body">
                        {/* Comparison Progress indicator */}
                        <div className="compare-container">
                          <div className="compare-row">
                            <span className="compare-label">
                              {referenceRecord.연도}년도 합격 평균 대비
                            </span>
                            {res.status === "safe" && <span className="status-badge status-safe">🟢 전년도 평균 상회</span>}
                            {res.status === "borderline" && <span className="status-badge status-borderline">🟡 전년도 평균 근접</span>}
                            {res.status === "risk" && <span className="status-badge status-risk">🔴 전년도 평균 미달</span>}
                            {res.status === "unknown" && <span className="status-badge status-borderline" style={{backgroundColor: "#f1f5f9", color: "#64748b"}}>⚪ 데이터 부족</span>}
                          </div>

                          <div className="compare-row" style={{ marginTop: "10px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                              내 스펙 지표합
                              <span 
                                style={{ cursor: "help", display: "inline-flex", alignItems: "center", color: "var(--text-muted)" }}
                                title="지표합 = 공인영어 환산점수 + 전적대 환산점수. 대학마다 배점이 달라 절대값 비교는 의미 없으며, 같은 대학 내 합격선과의 격차만 참고하세요"
                              >
                                <HelpCircle size={12} />
                              </span>
                            </span>
                            <span className="compare-score" style={{ color: "var(--primary-color)" }}>
                              {res.myIndexSum !== null ? `${res.myIndexSum}점` : "계산 불가"}
                            </span>
                          </div>

                          <div className="compare-row">
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>
                              합격선 지표합 ({referenceRecord.연도} 평균)
                            </span>
                            <span className="compare-score" style={{ color: "var(--text-secondary)" }}>
                              {res.acceptedIndexSum !== null ? `${res.acceptedIndexSum}점` : "비공개"}
                            </span>
                          </div>

                          {res.diff !== null && (
                            <div style={{ 
                              textAlign: "right", 
                              fontSize: "13px", 
                              fontWeight: "700", 
                              color: res.diff >= 0 ? "var(--status-safe)" : "var(--status-risk)",
                              marginTop: "4px"
                            }}>
                              {res.diff >= 0 ? `+${res.diff}` : res.diff}점 차이
                            </div>
                          )}

                          {/* Mini visual indicator sum track */}
                          {res.myIndexSum !== null && res.acceptedIndexSum !== null && (
                            <div className="compare-progress-track" style={{ marginTop: "12px" }}>
                              <div 
                                className="compare-progress-fill"
                                style={{ 
                                  width: `${Math.min(100, Math.max(10, (res.myIndexSum / (res.acceptedIndexSum * 1.15)) * 100))}%`,
                                  backgroundColor: res.status === "safe" ? "var(--status-safe)" : res.status === "borderline" ? "var(--status-borderline)" : "var(--status-risk)"
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* 🎯 HISTORICAL MAJOR NAME TIMELINE */}
                        {history.some(h => h.학과 !== h.학과_원본명) && (
                          <div style={{ 
                            background: "#f8fafc", 
                            padding: "8px 12px", 
                            borderRadius: "8px", 
                            fontSize: "11px", 
                            color: "var(--text-secondary)",
                            border: "1px solid #f1f5f9",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "4px",
                            marginBottom: "12px"
                          }}>
                            <span style={{ fontWeight: "700", color: "var(--primary-color)", whiteSpace: "nowrap" }}>📍 구 명칭 변천사:</span>
                            <span style={{ color: "var(--text-secondary)" }}>
                              {history.map(h => h.학과 !== h.학과_원본명 ? `[${h.연도}년] ${h.학과_원본명}` : null).filter(Boolean).join(" ➔ ")}
                            </span>
                          </div>
                        )}

                        {/* 🎯 합격 예측 및 보완 가이드 (역산 계산기 + 효율 비교) */}
                        <div style={{
                          marginTop: "14px",
                          padding: "12px 14px",
                          backgroundColor: deficit > 0 ? "var(--status-risk-bg)" : "var(--status-safe-bg)",
                          border: `1px solid ${deficit > 0 ? "#fecaca" : "#a7f3d0"}`,
                          borderRadius: "12px",
                          fontSize: "12px",
                          marginBottom: "14px"
                        }}>
                          <h4 style={{ fontSize: "12.5px", fontWeight: "800", color: deficit > 0 ? "var(--status-risk)" : "var(--status-safe)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                            📊 전년도 평균 대조 및 역산 분석
                          </h4>
                          
                          {deficit > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <p style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                전년도 평균선 도달(격차: <strong>{deficit.toFixed(2)}점</strong>)을 위한 가상 보완 시나리오:
                              </p>
                              {analysis.isLookupBased ? (
                                <p style={{ color: "#b45309", fontWeight: "600", fontStyle: "italic", fontSize: "11px" }}>
                                  ⚠️ 이 대학은 구간 등급제 환산표를 사용하므로 산식으로 정확한 역산이 불가능합니다. 홈페이지의 모집요강 환산표를 참고해 주세요.
                                </p>
                              ) : (
                                <ul style={{ listStyleType: "none", paddingLeft: "4px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "11.5px" }}>
                                  {analysis.toeicNeeded !== null && (
                                    <li style={{ color: "var(--text-secondary)" }}>
                                      • <strong>TOEIC만</strong> 올릴 시: <strong style={{ color: "var(--text-primary)" }}>+{analysis.toeicNeeded}점</strong> {toeic + analysis.toeicNeeded > 990 ? "(만점 초과로 불가)" : `(목표: ${toeic + analysis.toeicNeeded}점)`}
                                    </li>
                                  )}
                                  {analysis.gpaNeeded !== null && (
                                    <li style={{ color: "var(--text-secondary)" }}>
                                      • <strong>GPA만</strong> 올릴 시: <strong style={{ color: "var(--text-primary)" }}>+{analysis.gpaNeeded}점</strong> {gpaRaw + analysis.gpaNeeded > getGpaMax(gpaType) ? "(만점 초과로 불가)" : `(목표: ${(gpaRaw + analysis.gpaNeeded).toFixed(2)}점)`}
                                    </li>
                                  )}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <p style={{ color: "var(--secondary-color)", fontWeight: "700" }}>
                              🎉 전년도 합격자 평균 성적을 상회하고 있습니다. (단, 실제 합격 여부는 면접 및 대학별 고사가 주요 변수로 작용합니다.)
                            </p>
                          )}

                          {/* 📊 효율 비교 (Efficiency Section) */}
                          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "var(--text-secondary)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span>• TOEIC 10점 상승 시:</span>
                              <strong style={{ color: "var(--text-primary)" }}>+{analysis.toeicEfficiency}점</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span>• GPA 0.1점 상승 시:</span>
                              <strong style={{ color: "var(--text-primary)" }}>+{analysis.gpaEfficiency}점</strong>
                            </div>
                            {analysis.recommendedMetric !== "none" && (
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-primary)", backgroundColor: "#f8fafc", padding: "4px 8px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                                💡 수식상 획득 효율: 이 대학은 <strong>[{analysis.recommendedMetric === "toeic" ? "공인영어" : "전적대학 성적"}]</strong>을 올릴 때 환산점수가 상대적으로 더 많이 상승합니다. <span style={{ fontWeight: "400", color: "var(--text-muted)" }}>(실제 공부 난이도 무관)</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 3-Year mini history table */}
                        <table className="mini-table">
                          <thead>
                            <tr>
                              <th>연도</th>
                              <th>모집</th>
                              <th>지원</th>
                              <th>경쟁률</th>
                              <th>TOEIC 평균</th>
                              <th>GPA 평균</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentRecordYears.map((year) => {
                              const h = historyByYear.get(year);
                              if (!h) {
                                return (
                                  <tr key={year}>
                                    <td>{year}년</td>
                                    <td colSpan={5} style={{color: "var(--text-muted)", fontStyle: "italic"}}>미선발</td>
                                  </tr>
                                );
                              }
                              const comp = h.모집인원 && h.지원인원 && h.모집인원 > 0 
                                ? `${Math.round((h.지원인원 / h.모집인원) * 10) / 10}:1` 
                                : "-";
                              return (
                                <tr key={h.연도}>
                                  <td>{h.연도}년</td>
                                  <td>{h.모집인원 ?? "-"}</td>
                                  <td>{h.지원인원 ?? "-"}</td>
                                  <td>{comp}</td>
                                  <td>{h.최종합격_토익원점수 ?? "비공개"}</td>
                                  <td>{h.최종합격_학점원점수_100점만점 ?? "비공개"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="target-card-footer">
                        <button className="btn-card-action" onClick={() => setChartTarget({ univ: t.univ, dept: t.dept })}>
                          <TrendingUp size={14} />
                          입결 추이 차트
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ===================================================================
          BOTTOM SECTION: GLOBAL EXPLORER & SEARCH (전체 모집단위 검색 및 지망 담기)
          =================================================================== */}
      <section className="card" style={{ marginTop: "30px" }}>
        <h2 className="card-title">
          <BookOpen size={20} color="var(--secondary-color)" />
          거점국립대 모집단위 탐색 및 지망 담기
        </h2>

        <div className="explorer-filters">
          {/* SEARCH KEYWORD INPUT (WITH AUTO KOREAN CHOSUNG MATCHING) */}
          <div className="search-input-box">
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="가고 싶은 학과명이나 초성을 검색해 보세요 (예: 기계, 컴공, ㅅㅁ, ㄱㄱㄱㅎㄱ)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setSearchQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* UNIVERSITY CHIPS GRID */}
          <div className="univ-chips-grid">
            <button 
              className={`univ-chip ${selectedUnivs.length === 0 ? "active" : ""}`}
              onClick={() => setSelectedUnivs([])}
            >
              전체 대학
            </button>
            {universities.map(u => (
              <button 
                key={u}
                className={`univ-chip ${selectedUnivs.includes(u) ? "active" : ""}`}
                onClick={() => {
                  if (selectedUnivs.includes(u)) {
                    setSelectedUnivs(selectedUnivs.filter(x => x !== u));
                  } else {
                    setSelectedUnivs([...selectedUnivs, u]);
                  }
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* EXPLORER RESULTS TABLE */}
        <div className="table-wrapper">
          <table className="master-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                <th style={{ width: "15%", padding: "14px 16px" }}>대학명</th>
                <th style={{ width: "35%", padding: "14px 16px" }}>학과명 (통합 표준과명)</th>
                <th style={{ width: "12%", padding: "14px 16px", textAlign: "center" }}>최신 모집인원</th>
                <th style={{ width: "13%", padding: "14px 16px", textAlign: "center" }}>토익합격 평균</th>
                <th style={{ width: "13%", padding: "14px 16px", textAlign: "center" }}>GPA합격 백분위</th>
                <th style={{ width: "12%", padding: "14px 16px", textAlign: "center" }}>장바구니</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExplorerList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontWeight: "500" }}>
                    검색 결과와 일치하는 모집단위가 존재하지 않습니다. 다른 검색어를 입력해 보세요.
                  </td>
                </tr>
              ) : (
                paginatedExplorerList.map((r, i) => {
                  const isAdded = isTargetAdded(r.대학명, r.학과);
                  
                  return (
                    <tr key={`${r.대학명}-${r.학과}-${i}`} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "14px 16px", fontWeight: "700", color: "var(--text-primary)" }}>
                        {r.대학명}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div className="dept-name-wrapper">
                          <h4>{r.학과}</h4>
                          {r.학과 !== r.학과_원본명 && (
                            <span>이전 명칭: {r.학과_원본명}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: "600" }}>
                        {r.모집인원 !== null ? `${r.모집인원}명` : "-"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: "700" }}>
                        {r.최종합격_토익원점수 !== null ? `${r.최종합격_토익원점수}점` : "비공개"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: "700" }}>
                        {r.최종합격_학점원점수_100점만점 !== null ? `${r.최종합격_학점원점수_100점만점}점` : "비공개"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button 
                          className={`btn-add-cart ${isAdded ? "added" : ""}`}
                          onClick={() => toggleTarget(r.대학명, r.학과)}
                        >
                          <Star size={14} fill={isAdded ? "white" : "none"} />
                          {isAdded ? "지망 중" : "지망 추가"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* PAGINATION PANEL */}
          {totalPages > 1 && (
            <div className="pagination-row">
              <button 
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft size={16} style={{ verticalAlign: "middle" }} />
                이전
              </button>
              <span className="pagination-info">
                {currentPage} / {totalPages} 페이지 (총 {filteredDepartments.length}개 학과)
              </span>
              <button 
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                다음
                <ChevronRight size={16} style={{ verticalAlign: "middle" }} />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
