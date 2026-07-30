import { memo, useMemo } from "react";
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
import { getConversionFormula } from "../utils/formulaRegistry";
import { getRecordYear } from "../utils/records";
import { getRecordKey } from "../utils/targets";

type ChartTarget = {
  univ: string;
  dept: string;
};

type ChartDataPoint = {
  year: string;
  "영어 원점수 (TOEIC)": number | null;
  "영어 환산점수": number | null;
  "전적대 백분위 (GPA)": number | null;
  "전적대 환산점수": number | null;
  "실질 경쟁률": number | null;
};

type ChartDataKey = Exclude<keyof ChartDataPoint, "year">;
type ChartAxisDomain = readonly [number, number] | readonly ["auto", "auto"];

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
} as const satisfies Record<string, {
  label: string;
  dataKey: ChartDataKey;
  color: string;
}>;

export type ChartMetric = keyof typeof CHART_METRIC_CONFIG;

type TrendChartProps = {
  target: ChartTarget;
  recordsByDepartment: ReadonlyMap<string, DepartmentRecord[]>;
  metric: ChartMetric;
  onMetricChange: (metric: ChartMetric) => void;
  onClose: () => void;
};

function isChartMetric(value: string): value is ChartMetric {
  return value in CHART_METRIC_CONFIG;
}

function getCompetitionRatio(record: DepartmentRecord): number | null {
  if (!record.모집인원 || !record.지원인원 || record.모집인원 <= 0) {
    return null;
  }

  return Math.round((record.지원인원 / record.모집인원) * 100) / 100;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateChartDomain(
  data: ChartDataPoint[],
  dataKey: ChartDataKey,
): ChartAxisDomain {
  const values = data
    .map((point) => point[dataKey])
    .filter((value): value is number => (
      typeof value === "number" && Number.isFinite(value)
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
  target,
  recordsByDepartment,
  metric,
  onMetricChange,
  onClose,
}: TrendChartProps) {
  const selectedMetric = CHART_METRIC_CONFIG[metric];
  const history = useMemo(() => {
    const records = recordsByDepartment.get(
      getRecordKey(target.univ, target.dept),
    ) ?? [];

    return [...records].sort((a, b) => getRecordYear(a) - getRecordYear(b));
  }, [recordsByDepartment, target.dept, target.univ]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    return history.map((record) => {
        const acceptedScore = calculateAcceptedScoreBreakdown(record);

        return {
          year: `${record.연도}년도`,
          "영어 원점수 (TOEIC)": record.최종합격_토익원점수,
          "영어 환산점수": acceptedScore.englishConv,
          "전적대 백분위 (GPA)": record.최종합격_학점원점수_100점만점,
          "전적대 환산점수": acceptedScore.gpaConv,
          "실질 경쟁률": getCompetitionRatio(record),
        };
      });
  }, [history]);

  const yAxisDomain = useMemo(
    () => calculateChartDomain(chartData, selectedMetric.dataKey),
    [chartData, selectedMetric.dataKey],
  );
  const formulaNotices = useMemo(() => {
    if (metric !== "toeic_conv" && metric !== "gpa_conv") {
      return [];
    }

    const estimatedYears: string[] = [];
    const lookupYears: string[] = [];
    const assumedYears: string[] = [];

    history.forEach((record, index) => {
      const plottedValue = chartData[index]?.[selectedMetric.dataKey];

      if (plottedValue === null || plottedValue === undefined) {
        return;
      }

      const formula = getConversionFormula(
        record.대학명,
        record.연도,
      );

      if (formula?.provenance === "assumed-from-other-year") {
        assumedYears.push(record.연도);
      }

      if (formula?.confidence === "estimated") {
        estimatedYears.push(record.연도);
      } else if (formula?.confidence === "lookup-approximation") {
        lookupYears.push(record.연도);
      }
    });

    const notices: string[] = [];

    if (assumedYears.length > 0) {
      notices.push(
        `${assumedYears.join(", ")}년 값은 해당 연도 모집요강 미확보로 인접 연도 공식을 적용했습니다.`,
      );
    }
    if (estimatedYears.length > 0) {
      notices.push(`${estimatedYears.join(", ")}년 값에는 추정 환산식이 적용되었습니다.`);
    }
    if (lookupYears.length > 0) {
      notices.push(
        `${lookupYears.join(", ")}년 값은 구간 환산표를 연속식으로 근사한 참고값입니다.`,
      );
    }

    return notices;
  }, [chartData, history, metric, selectedMetric.dataKey]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="chart-card">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-title">
            📈 {target.univ} {target.dept} 입결 대시보드
          </h3>
          <p className="chart-subtitle">
            현재 선택 지표: {selectedMetric.label}
          </p>
        </div>
        <div className="chart-controls">
          <select
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
            <Line
              type="linear"
              connectNulls
              dataKey={selectedMetric.dataKey}
              stroke={selectedMetric.color}
              strokeWidth={3}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="trend-disclaimer">
        * 성적 비공개(1인 등록 등) 또는 미모집인 연도는 지표가 공백으로 우회되어 표시됩니다 (라인 연속 연결 지원).
      </p>
      {formulaNotices.map((notice) => (
        <p className="formula-notice" key={notice}>⚠️ {notice}</p>
      ))}
    </div>
  );
}

export default memo(TrendChart);
