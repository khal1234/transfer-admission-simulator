import { memo, useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateAcceptedScoreBreakdown,
  type DepartmentRecord,
} from "../utils/converter";
import { getCompetitionRatio } from "../utils/competition";
import { getConversionFormula } from "../utils/formulaRegistry";
import { getRecordYear } from "../utils/records";
import {
  getGpaDisclosure,
  getToeicDisclosure,
  isDerived,
} from "../utils/scoreProvenance";
import { getRecordKey } from "../utils/targets";
import { focusElement } from "../utils/focusManagement";

type ChartTarget = {
  univ: string;
  dept: string;
};

type MetricValues = {
  "영어 원점수 (TOEIC)": number | null;
  "영어 환산점수": number | null;
  "전적대 백분위 (GPA)": number | null;
  "전적대 환산점수": number | null;
  "실질 경쟁률": number | null;
};

type ChartDataKey = keyof MetricValues;
type ChartAxisDomain = readonly [number, number] | readonly ["auto", "auto"];

/** 한 해 한 줄. 지망마다 열이 하나씩 붙는다(계열명 → 값). */
type ChartDataPoint = { year: string } & Record<string, number | null | string>;

const CHART_METRIC_CONFIG = {
  toeic_orig: {
    label: "공인영어 원점수 (TOEIC)",
    dataKey: "영어 원점수 (TOEIC)",
    /** 대학이 달라도 같은 자에 놓고 견줄 수 있는 지표인가. */
    comparableAcrossUniversities: true,
  },
  toeic_conv: {
    label: "공인영어 환산점수",
    dataKey: "영어 환산점수",
    comparableAcrossUniversities: false,
  },
  gpa_orig: {
    label: "전적대학 백분위 평균",
    dataKey: "전적대 백분위 (GPA)",
    comparableAcrossUniversities: true,
  },
  gpa_conv: {
    label: "전적대학 환산점수",
    dataKey: "전적대 환산점수",
    comparableAcrossUniversities: false,
  },
  competition: {
    label: "실질 경쟁률",
    dataKey: "실질 경쟁률",
    comparableAcrossUniversities: true,
  },
} as const satisfies Record<string, {
  label: string;
  dataKey: ChartDataKey;
  comparableAcrossUniversities: boolean;
}>;

export type ChartMetric = keyof typeof CHART_METRIC_CONFIG;

/**
 * 계열 색. 거점국립대가 9곳이라 9색이면 넉넉하다.
 * 붙어 있는 색끼리 헷갈리지 않도록 색상환을 건너뛰며 골랐다.
 */
const SERIES_COLORS = [
  "#6366f1",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#0ea5e9",
];

type TrendChartProps = {
  /** 클릭해서 연 지망. 선을 굵게 그려 어느 것을 보러 왔는지 표시한다. */
  focusedTarget: ChartTarget;
  /** 장바구니 전체. 한 축에 겹쳐 그린다. */
  targets: readonly ChartTarget[];
  recordsByDepartment: ReadonlyMap<string, DepartmentRecord[]>;
  metric: ChartMetric;
  onMetricChange: (metric: ChartMetric) => void;
  onClose: () => void;
};

function isChartMetric(value: string): value is ChartMetric {
  return value in CHART_METRIC_CONFIG;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 범례에 들어갈 짧은 이름. '부산대학교 기계공학부' → '부산대 기계공학부'. */
function getSeriesName(target: ChartTarget): string {
  return `${target.univ.replace(/대학교$/, "대")} ${target.dept}`;
}

function getMetricValues(record: DepartmentRecord): MetricValues {
  const acceptedScore = calculateAcceptedScoreBreakdown(record);

  return {
    "영어 원점수 (TOEIC)": record.최종합격_토익원점수,
    "영어 환산점수": acceptedScore.englishConv,
    "전적대 백분위 (GPA)": record.최종합격_학점원점수_100점만점,
    "전적대 환산점수": acceptedScore.gpaConv,
    "실질 경쟁률": getCompetitionRatio(record),
  };
}

function calculateChartDomain(
  data: ChartDataPoint[],
  seriesNames: string[],
): ChartAxisDomain {
  const values = data.flatMap((point) => (
    seriesNames
      .map((name) => point[name])
      .filter((value): value is number => (
        typeof value === "number" && Number.isFinite(value)
      ))
  ));

  if (values.length === 0) {
    return ["auto", "auto"];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const padding = Math.max(span * 0.12, Math.abs(max) * 0.03, 1);

  return [
    roundToTwoDecimals(Math.max(0, min - padding)),
    roundToTwoDecimals(max + padding),
  ];
}

function TrendChart({
  focusedTarget,
  targets,
  recordsByDepartment,
  metric,
  onMetricChange,
  onClose,
}: TrendChartProps) {
  const initialControlRef = useRef<HTMLSelectElement | null>(null);
  const selectedMetric = CHART_METRIC_CONFIG[metric];

  useEffect(() => {
    focusElement(initialControlRef.current);
  }, []);

  /**
   * 지망마다 연도별 기록을 뽑는다. 클릭해서 연 지망을 맨 앞에 둬서 색과
   * 범례 순서가 그 지망 위주로 잡히게 한다.
   */
  const series = useMemo(() => {
    const ordered = [
      focusedTarget,
      ...targets.filter((target) => (
        getRecordKey(target.univ, target.dept)
          !== getRecordKey(focusedTarget.univ, focusedTarget.dept)
      )),
    ];

    return ordered.flatMap((target, index) => {
      const records = recordsByDepartment.get(
        getRecordKey(target.univ, target.dept),
      ) ?? [];

      if (records.length === 0) {
        return [];
      }

      return [{
        target,
        name: getSeriesName(target),
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        isFocused: index === 0,
        records: [...records].sort((a, b) => getRecordYear(a) - getRecordYear(b)),
      }];
    });
  }, [focusedTarget, recordsByDepartment, targets]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const years = [...new Set(
      series.flatMap((entry) => entry.records.map((record) => record.연도)),
    )].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

    return years.map((year) => {
      const point: ChartDataPoint = { year: `${year}년도` };

      series.forEach((entry) => {
        const record = entry.records.find((candidate) => candidate.연도 === year);
        point[entry.name] = record === undefined
          ? null
          : getMetricValues(record)[selectedMetric.dataKey];
      });

      return point;
    });
  }, [selectedMetric.dataKey, series]);

  const seriesNames = useMemo(
    () => series.map((entry) => entry.name),
    [series],
  );
  const yAxisDomain = useMemo(
    () => calculateChartDomain(chartData, seriesNames),
    [chartData, seriesNames],
  );

  /**
   * 환산점수는 대학마다 배점이 달라(부산대 30점 만점, 전남대 400점 만점) 한 축에
   * 놓으면 배점 큰 대학이 늘 위에 그려진다. 추세는 읽히지만 높낮이 비교는
   * 뜻이 없으므로 그 사실을 밝힌다. 원점수·경쟁률은 그런 문제가 없다.
   */
  const scaleNotice = useMemo(() => {
    if (selectedMetric.comparableAcrossUniversities) {
      return null;
    }

    const universities = new Set(series.map((entry) => entry.target.univ));
    if (universities.size <= 1) {
      return null;
    }

    return "대학마다 이 지표의 배점이 달라 선의 높낮이로 대학끼리 비교할 수는 "
      + "없습니다. 같은 선 안에서의 연도별 추세만 참고하세요.";
  }, [selectedMetric.comparableAcrossUniversities, series]);

  // 원점수 지표를 볼 때, 그 원점수가 대학 발표값이 아니라 환산점수를 되짚은
  // 값이면 알린다. 차트의 선은 발표값과 똑같이 생겨서 구별할 수가 없다.
  const rawScoreNotice = useMemo(() => {
    if (metric !== "toeic_orig" && metric !== "gpa_orig") {
      return null;
    }

    const derivedUniversities = [...new Set(
      series
        .map((entry) => entry.target.univ)
        .filter((univ) => isDerived(
          metric === "toeic_orig"
            ? getToeicDisclosure(univ)
            : getGpaDisclosure(univ),
        )),
    )];

    if (derivedUniversities.length === 0) {
      return null;
    }

    return `${derivedUniversities.join(", ")}의 원점수는 대학 발표값이 아니라 `
      + "공개된 환산점수를 되짚어 구한 값입니다.";
  }, [metric, series]);

  const formulaNotices = useMemo(() => {
    if (metric !== "toeic_conv" && metric !== "gpa_conv") {
      return [];
    }

    const estimated = new Set<string>();
    const lookup = new Set<string>();
    const assumed = new Set<string>();

    series.forEach((entry) => {
      entry.records.forEach((record) => {
        if (getMetricValues(record)[selectedMetric.dataKey] === null) {
          return;
        }

        const formula = getConversionFormula(record.대학명, record.연도);
        const label = `${record.대학명.replace(/대학교$/, "대")} ${record.연도}`;

        if (formula?.provenance === "assumed-from-other-year") {
          assumed.add(label);
        }

        if (formula?.confidence === "estimated") {
          estimated.add(label);
        } else if (formula?.confidence === "lookup-approximation") {
          lookup.add(label);
        }
      });
    });

    const notices: string[] = [];

    if (assumed.size > 0) {
      notices.push(
        `${[...assumed].join(", ")}은 해당 연도 모집요강 미확보로 인접 연도 공식을 적용했습니다.`,
      );
    }
    if (estimated.size > 0) {
      notices.push(`${[...estimated].join(", ")}에는 추정 환산식이 적용되었습니다.`);
    }
    if (lookup.size > 0) {
      notices.push(
        `${[...lookup].join(", ")}은 구간 환산표를 연속식으로 근사한 참고값입니다.`,
      );
    }

    return notices;
  }, [metric, selectedMetric.dataKey, series]);

  if (chartData.length === 0 || series.length === 0) {
    return null;
  }

  return (
    <div className="chart-card">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-title">
            <span aria-hidden="true">📈</span>
            <span>입결 추이 비교 · 지망 {series.length}곳</span>
          </h3>
          <p className="chart-subtitle">
            현재 선택 지표: {selectedMetric.label} · 굵은 선은{" "}
            {getSeriesName(focusedTarget)}
          </p>
        </div>
        <div className="chart-controls">
          <select
            ref={initialControlRef}
            data-chart-initial-focus="true"
            aria-label="차트 지표 선택"
            className="chart-metric-select"
            value={metric}
            onChange={(event) => {
              if (isChartMetric(event.target.value)) {
                onMetricChange(event.target.value);
              }
            }}
          >
            <option value="toeic_orig">영어 원점수 (TOEIC)</option>
            <option value="toeic_conv">영어 환산점수</option>
            <option value="gpa_orig">학점 원점수 (백분위)</option>
            <option value="gpa_conv">학점 환산점수</option>
            <option value="competition">실질 경쟁률</option>
          </select>
          <button
            type="button"
            className="btn-close-chart"
            aria-label="입결 차트 닫기"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: "600" }}
              stroke="var(--border-color)"
            />
            <YAxis
              width={54}
              domain={yAxisDomain}
              tick={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: "600" }}
              stroke="var(--border-color)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--tooltip-bg)",
                border: "1px solid var(--tooltip-border)",
                color: "var(--tooltip-text)",
                borderRadius: "10px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "var(--tooltip-text)" }}
              labelStyle={{ color: "var(--tooltip-text)" }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "600" }} />
            {series.map((entry) => (
              <Line
                key={entry.name}
                type="linear"
                connectNulls
                dataKey={entry.name}
                stroke={entry.color}
                strokeWidth={entry.isFocused ? 3.5 : 1.8}
                strokeOpacity={entry.isFocused ? 1 : 0.75}
                dot={{ r: entry.isFocused ? 4 : 2.5 }}
                activeDot={{ r: 7 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="trend-disclaimer">
        * 성적 비공개(1인 등록 등) 또는 미모집인 연도는 지표가 공백으로 우회되어 표시됩니다 (라인 연속 연결 지원).
      </p>
      {scaleNotice !== null && (
        <p className="formula-notice">⚠️ {scaleNotice}</p>
      )}
      {rawScoreNotice !== null && (
        <p className="formula-notice">⚠️ {rawScoreNotice}</p>
      )}
      {formulaNotices.map((notice) => (
        <p className="formula-notice" key={notice}>⚠️ {notice}</p>
      ))}
    </div>
  );
}

export default memo(TrendChart);
